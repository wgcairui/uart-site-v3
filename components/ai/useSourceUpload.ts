'use client'

import { useCallback, useState } from 'react'
import { aiUpload } from '@/lib/api/endpoints/admin/ai'

/**
 * Source 文件上传 4 态 hook
 *
 * 设计目的：
 * - v1 用 antd Upload 默认行为，admin 选完文件就完事，没有"上传中"状态。
 * - v2 走「/upload-token → 浏览器直传 OSS」两步，需要 "uploading" 和 "done" 两个状态
 *   让 admin 看到"文件还没到 OSS 别点 generate"。
 * - v3（2026-06-26 改造）走「浏览器 → 后端中转 → OSS」，规避 mixed-content + CORS 配置坑。
 *   `upload(file)` 内部一次 fetch 完成，4 态机不变（保留 uploading 体验）。
 *
 * 4 态机：
 *   idle      → 初始 / 已重置
 *   uploading → 已 POST 文件到后端，等响应
 *   done      → 后端 200 + ossKey + ossUrl，可触发 /generate-stream (sourceType='file')
 *   error     → 任意一步失败（前端校验 / 后端 400/413/500 / 网络断 / JSON parse 失败）
 *
 * v1 决策——不做真进度条（单次请求 + 后端中转不带 progress 事件；
 * 用 loading + "✓ 上传完成" badge 就够；父 session 拍板）。
 */
export type SourceUploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; fileSize: number }
  | {
      status: 'done'
      fileName: string
      fileSize: number
      ossKey: string
      originalFileName: string
      contentType: string
      ossUrl: string
    }
  | { status: 'error'; fileName: string; error: string }

export interface UseSourceUploadResult {
  state: SourceUploadState
  /** 上传一个文件：POST /api/v2/admin/ai/upload（后端中转 → OSS） */
  upload: (file: File) => Promise<SourceUploadState>
  /** 重置为 idle（用户换文件、生成完后清理） */
  reset: () => void
}

export function useSourceUpload(): UseSourceUploadResult {
  const [state, setState] = useState<SourceUploadState>({ status: 'idle' })

  const reset = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  const upload = useCallback(async (file: File) => {
    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
    })

    // 单步：浏览器 → 后端中转 → OSS（同源 HTTPS，没有 mixed-content / CORS 问题）
    try {
      const data = await aiUpload({
        file,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      })

      const doneState: SourceUploadState = {
        status: 'done',
        fileName: file.name,
        fileSize: file.size,
        ossKey: data.ossKey,
        originalFileName: data.originalFileName || file.name,
        contentType: data.contentType || file.type || 'application/octet-stream',
        ossUrl: data.ossUrl,
      }
      setState(doneState)
      return doneState
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : '上传失败'
      const errState: SourceUploadState = {
        status: 'error',
        fileName: file.name,
        error: msg,
      }
      setState(errState)
      return errState
    }
  }, [])

  return { state, upload, reset }
}