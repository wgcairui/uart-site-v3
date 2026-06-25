'use client'

import { useCallback, useState } from 'react'
import { message } from 'antd'
import { aiUploadToken } from '@/lib/api/endpoints/admin/ai'
import type { UploadTokenResult } from '@/types/ai'

/**
 * Source 文件上传 4 态 hook（决策 13 阶段 1 / 2026-06-25）
 *
 * 设计目的：
 * - v1 用 antd Upload 默认行为，admin 选完文件就完事，没有"上传中"状态。
 * - v2 后端要走 `/upload-token` → `fetch(uploadUrl, {method:'PUT'})` 两步。
 *   中间需要"uploading"和"done"两个状态让 admin 看到"文件还没到 OSS 别点 generate"。
 * - v3（未来）想加真进度条只需把 `uploading` 状态扩成 `{progress: number}`，
 *   不用动 wrapper 调用方代码。
 *
 * 4 态机：
 *   idle      → 初始 / 已重置
 *   uploading → 已调 /upload-token 拿到 uploadUrl，正在 PUT 到 OSS
 *   done      → PUT 成功，拿到 ossKey + ossUrl，可触发 /generate-stream (sourceType='file')
 *   error     → 任意一步失败（/upload-token 400/401/500、OSS PUT 失败、网络断）
 *
 * 注意：v1 决策——不做真进度条（OSS PUT 走单请求，进度跳变太短；
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
  /** 上传一个文件：调 /upload-token → fetch(uploadUrl, { method: 'PUT', body: file }) */
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

    // Step 1: 拿 OSS 预签名 PUT URL
    let token: UploadTokenResult
    try {
      const res = await aiUploadToken({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      })
      if (res.code !== 200 || !res.data) {
        const msg = res.msg || `HTTP ${res.code}`
        const errState: SourceUploadState = {
          status: 'error',
          fileName: file.name,
          error: msg,
        }
        setState(errState)
        return errState
      }
      token = res.data
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : '请求 upload-token 失败'
      const errState: SourceUploadState = {
        status: 'error',
        fileName: file.name,
        error: msg,
      }
      setState(errState)
      message.error(`上传准备失败：${msg}`)
      return errState
    }

    // Step 2: PUT 到 OSS（不走后端中转）
    try {
      const putRes = await fetch(token.uploadUrl, {
        method: 'PUT',
        body: file,
        // OSS 预签名 PUT 不需要带 token / content-type 在 header（签名里已有 content-type）
        // 显式 set 一下防止浏览器自动加额外 header 破坏签名
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '')
        const msg = `OSS PUT 失败：HTTP ${putRes.status}${text ? `: ${text.slice(0, 200)}` : ''}`
        const errState: SourceUploadState = {
          status: 'error',
          fileName: file.name,
          error: msg,
        }
        setState(errState)
        message.error(msg)
        return errState
      }
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : 'OSS PUT 网络错误'
      const errState: SourceUploadState = {
        status: 'error',
        fileName: file.name,
        error: msg,
      }
      setState(errState)
      message.error(`上传失败：${msg}`)
      return errState
    }

    // 成功
    const doneState: SourceUploadState = {
      status: 'done',
      fileName: file.name,
      fileSize: file.size,
      ossKey: token.ossKey,
      originalFileName: file.name,
      contentType: file.type || 'application/octet-stream',
      ossUrl: token.ossUrl,
    }
    setState(doneState)
    return doneState
  }, [])

  return { state, upload, reset }
}
