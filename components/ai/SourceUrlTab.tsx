'use client'

import { Alert, Button, Input, Space, Tag, Typography } from 'antd'
import { GlobalOutlined, ReloadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { aiFetchUrl } from '@/lib/api/endpoints/admin/ai'

const { Text } = Typography

/**
 * SourceUrlTab（File 模式的 URL 子 tab）
 *
 * 流程：
 * 1. admin 输 https URL
 * 2. 点「抓取」→ /fetch-url（后端 server fetch + cheerio 抽 main → 落 OSS tmp/）
 * 3. 显示 title / bytes / truncated 摘要
 * 4. onFetched 回调把 {ossKey, originalFileName: title, contentType, sourceUrl} 抛给父表单
 *
 * 后端 SSRF 防护：localhost / 127.0.0.1 / 内网段会被后端 400 拒绝；
 * 前端不绕（spec 明确），UX 上给"URL 不合法"提示。
 */
export interface SourceUrlTabProps {
  /** URL 抓取完成时抛给父组件 */
  onFetched: (info: {
    ossKey: string
    originalFileName: string
    contentType: string
    ossUrl: string
    sourceUrl: string
    title: string
    bytes: number
    truncated: boolean
  }) => void
  /** 禁用（如生成中） */
  disabled?: boolean
}

export function SourceUrlTab({ onFetched, disabled }: SourceUrlTabProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    title: string
    bytes: number
    truncated: boolean
    sourceUrl: string
  } | null>(null)

  const handleFetch = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('请输入 URL')
      return
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('URL 必须以 http:// 或 https:// 开头')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await aiFetchUrl({ url: trimmed })
      if (res.code !== 200 || !res.data) {
        const msg = res.msg || `HTTP ${res.code}`
        setError(msg)
        return
      }
      setResult({
        title: res.data.title,
        bytes: res.data.bytes,
        truncated: res.data.truncated,
        sourceUrl: res.data.sourceUrl,
      })
      onFetched({
        ossKey: res.data.ossKey,
        originalFileName: res.data.title || res.data.sourceUrl,
        contentType: 'text/html',
        ossUrl: res.data.ossUrl,
        sourceUrl: res.data.sourceUrl,
        title: res.data.title,
        bytes: res.data.bytes,
        truncated: res.data.truncated,
      })
    } catch (err: any) {
      setError(err?.message ? String(err.message) : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setResult(null)
  }

  return (
    <div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          prefix={<GlobalOutlined />}
          placeholder="https://example.com/protocol-modbus-spec"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={handleFetch}
          disabled={disabled || loading}
          allowClear
        />
        <Button type="primary" loading={loading} onClick={handleFetch} {...(disabled !== undefined ? { disabled } : {})}>
          抓取
        </Button>
      </Space.Compact>

      <div style={{ marginTop: 8 }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ padding: '4px 12px', fontSize: 12 }}
            message={
              <Space size={4}>
                <Text type="danger" style={{ fontSize: 12 }}>
                  {error}
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  重试
                </Button>
              </Space>
            }
          />
        )}
        {result && !error && (
          <Space size={6} wrap style={{ fontSize: 12 }}>
            <Tag color="success">✓ 已抓取</Tag>
            <Text style={{ fontSize: 12 }} strong>
              {result.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {result.bytes} bytes{result.truncated ? '（已截断到 200KB）' : ''}
            </Text>
          </Space>
        )}
        {!error && !result && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            后端 server fetch + cheerio 抽 main → 落 OSS tmp/ 当 .txt 文件
          </Text>
        )}
      </div>
    </div>
  )
}
