'use client'

import { Alert, Space, Tag, Typography } from 'antd'
import { FileTextOutlined, LinkOutlined, RobotOutlined, WarningOutlined } from '@ant-design/icons'
import { useMemo } from 'react'

const { Text } = Typography

/**
 * AI 源文档信息卡（决策 13 阶段 1 / 2026-06-25）
 *
 * 解析 protocol.remark 字段里的 `<!-- AI-GENERATED ... -->` marker
 * （由后端 `commitSource` 写入），展示：
 * - AI 生成时间 + provider
 * - 源文档链接（点击新窗口打开）
 * - promote 失败时显示「源文档不可用」warning
 *
 * 解析失败 / 无 marker → 返 null（不渲染，保留 MyInput 编辑行为）
 *
 * marker 格式（后端写入）：
 *   <!-- AI-GENERATED source=<filename> sourceUrl=<oss-url-or-empty> provider=<minimax/openai/...> generatedAt=<iso> -->
 *
 * 兼容性：sourceUrl 为空时表示 promote 失败（admin 看到「源文档不可用」）。
 */

export interface AiSourceInfo {
  source: string
  sourceUrl: string | null
  provider: string | null
  generatedAt: string | null
}

const MARKER_RE = /<!--\s*AI-GENERATED\s+([^>]+?)\s*-->/

function parseMarker(remark: string | undefined | null): AiSourceInfo | null {
  if (!remark) return null
  const m = remark.match(MARKER_RE)
  if (!m) return null
  const attrs = m[1] ?? ''
  const get = (key: string): string | null => {
    const re = new RegExp(`${key}=(?:"([^"]*)"|\\S+)`)
    const mm = attrs.match(re)
    if (!mm) return null
    return mm[1] ?? mm[0].split('=')[1] ?? null
  }
  const source = get('source')
  if (!source) return null
  const rawSourceUrl = get('sourceUrl')
  const sourceUrl = rawSourceUrl && rawSourceUrl !== '' ? rawSourceUrl : null
  return {
    source,
    sourceUrl,
    provider: get('provider'),
    generatedAt: get('generatedAt'),
  }
}

export interface AiSourceInfoCardProps {
  /** protocol.remark 字段 */
  remark: string | undefined | null
}

export function AiSourceInfoCard({ remark }: AiSourceInfoCardProps) {
  const info = useMemo(() => parseMarker(remark), [remark])

  // 解析失败 / 无 marker → 不渲染（保留 MyInput 编辑行为，admin 看不到这个卡）
  if (!info) return null

  return (
    <Alert
      type={info.sourceUrl ? 'info' : 'warning'}
      showIcon
      icon={<RobotOutlined />}
      style={{ marginBottom: 8, fontSize: 12 }}
      title={
        <Space size={6} wrap>
          <Text strong style={{ fontSize: 12 }}>
            AI 生成
          </Text>
          {info.generatedAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatTime(info.generatedAt)}
            </Text>
          )}
          {info.provider && (
            <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
              {info.provider}
            </Tag>
          )}
        </Space>
      }
      description={
        info.sourceUrl ? (
          <Space size={4} align="center">
            <FileTextOutlined />
            <Text style={{ fontSize: 12 }}>源文档：</Text>
            <a
              href={info.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12 }}
            >
              {info.source}
              <LinkOutlined style={{ marginLeft: 4, fontSize: 10 }} />
            </a>
          </Space>
        ) : (
          <Space size={4} align="center">
            <WarningOutlined style={{ color: '#faad14' }} />
            <Text type="warning" style={{ fontSize: 12 }}>
              源文档不可用（promote 失败，运维可补）
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · 原文件：{info.source}
            </Text>
          </Space>
        )
      }
    />
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  // 2026-06-25 14:32 (本地时区)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
