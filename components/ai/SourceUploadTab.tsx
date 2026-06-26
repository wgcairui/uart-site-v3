'use client'

import { Alert, Button, Space, Spin, Tag, Typography, Upload } from 'antd'
import { CloudUploadOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useSourceUpload, type SourceUploadState } from './useSourceUpload'

const { Text } = Typography

/**
 * SourceUploadTab（File 模式的 Upload 子 tab）
 *
 * 流程：
 * 1. admin 选文件（PDF/Excel/Word/TXT/MD，≤ 20MB）
 * 2. beforeUpload 拦截：MIME/大小白名单
 * 3. customRequest 调 useSourceUpload.upload(file) → POST /api/v2/admin/ai/upload → 后端中转 → OSS
 *    （2026-06-26 改造：原 /upload-token 浏览器直传踩了 mixed-content，改回后端中转）
 * 4. 4 态 UI：idle（提示）→ uploading（Spin + 文件名）→ done（✓ 标签）→ error（Alert + 重试）
 * 5. onUploaded 回调把 {ossKey, originalFileName, contentType} 抛给父表单
 *
 * 与 useSourceUpload 4 态 hook 解耦：v2 想加真进度条改 hook 即可，组件不动。
 */
export interface SourceUploadTabProps {
  /** 文件上传完成时抛给父组件（已含 ossKey / originalFileName / contentType） */
  onUploaded: (info: {
    ossKey: string
    originalFileName: string
    contentType: string
    ossUrl: string
  }) => void
  /** 禁用（如生成中） */
  disabled?: boolean
}

// MIME 白名单（与后端 `oss-token.util.ts` 严格同步）
const ACCEPT_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
].join(',')

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function SourceUploadTab({ onUploaded, disabled }: SourceUploadTabProps) {
  const { state, upload, reset } = useSourceUpload()

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!ACCEPT_MIME.split(',').includes(file.type)) {
      // antd Upload 默认会拦，但显式提示更清晰
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_SIZE) {
      return Upload.LIST_IGNORE
    }
    return true // 允许 customRequest 接
  }

  const handleCustomRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    const f = file as File
    const result = await upload(f)
    if (result.status === 'done') {
      onUploaded({
        ossKey: result.ossKey,
        originalFileName: result.originalFileName,
        contentType: result.contentType,
        ossUrl: result.ossUrl,
      })
      onSuccess?.(result)
    } else if (result.status === 'error') {
      onError?.(new Error(result.error))
    } else {
      onError?.(new Error(`unexpected status: ${result.status}`))
    }
  }

  return (
    <div>
      <Upload.Dragger
        accept={ACCEPT_MIME}
        maxCount={1}
        beforeUpload={handleBeforeUpload}
        customRequest={handleCustomRequest}
        showUploadList={false}
        disabled={disabled || state.status === 'uploading'}
        style={{ padding: '12px 0' }}
      >
        <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
          <CloudUploadOutlined style={{ fontSize: 36, color: '#1677ff' }} />
        </p>
        <p className="ant-upload-text" style={{ fontSize: 13, marginBottom: 2 }}>
          点击或拖拽 PDF / Excel / Word / TXT / MD
        </p>
        <p className="ant-upload-hint" style={{ fontSize: 11, color: '#999' }}>
          ≤ 20MB · 直传 OSS 不经过后端中转
        </p>
      </Upload.Dragger>

      <div style={{ marginTop: 8 }}>
        <UploadStateView state={state} onRetry={reset} />
      </div>
    </div>
  )
}

interface UploadStateViewProps {
  state: SourceUploadState
  onRetry: () => void
}

function UploadStateView({ state, onRetry }: UploadStateViewProps) {
  if (state.status === 'idle') {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        选完文件后会自动直传 OSS，状态会显示在下方
      </Text>
    )
  }
  if (state.status === 'uploading') {
    return (
      <Space size={6} align="center">
        <Spin size="small" />
        <FileTextOutlined />
        <Text style={{ fontSize: 12 }}>{state.fileName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ({formatSize(state.fileSize)})
        </Text>
        <Tag color="processing" style={{ marginLeft: 4 }}>
          上传中…
        </Tag>
      </Space>
    )
  }
  if (state.status === 'done') {
    return (
      <Space size={6} align="center" wrap>
        <FileTextOutlined style={{ color: '#52c41a' }} />
        <Text style={{ fontSize: 12 }}>{state.fileName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ({formatSize(state.fileSize)})
        </Text>
        <Tag color="success" style={{ marginLeft: 4 }}>
          ✓ 上传完成
        </Tag>
      </Space>
    )
  }
  // error
  return (
    <Alert
      type="error"
      showIcon
      style={{ padding: '4px 12px', fontSize: 12 }}
      title={
        <Space size={4}>
          <Text style={{ fontSize: 12 }}>{state.fileName}</Text>
          <Text type="danger" style={{ fontSize: 12 }}>
            {state.error}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            style={{ padding: 0, fontSize: 12 }}
          >
            重试
          </Button>
        </Space>
      }
    />
  )
}
