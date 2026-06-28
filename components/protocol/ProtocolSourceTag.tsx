'use client'

import { Tag, Tooltip } from 'antd'
import { RobotOutlined, UserOutlined } from '@ant-design/icons'

/**
 * 协议来源标识 Tag（决策 23 / 2026-06-28）
 *
 * 显示规则（基于 protocol.source 字段 + remark marker 双信号）：
 * - source === 'ai-generate' → 🟣 紫色「AI 生成」+ Tooltip「由 AI 一次性生成」
 * - source === 'ai-chat'     → 🔵 蓝色「AI 修改」+ Tooltip「由 AI 生成后通过 chat 持续修改」
 * - source === 'admin' / undefined → 🟢 灰色「手动」/ 不显示
 *   - 但 remark 含 `<!-- AI-GENERATED -->` marker 时优先显示「AI 生成」（兼容旧数据）
 *
 * 三种 source 的写入路径（待后端确认）：
 * - 'ai-generate' → POST /api/v2/admin/ai/commit (PR #59)
 * - 'ai-chat'     → POST /api/v2/admin/ai/chat / PATCH 同协议
 * - 'admin'       → setProtocol / updateProtocol admin 路径
 *
 * 配套 UI：
 * - admin/node/protocols list 表格新增「来源」列
 * - admin/node/protocols/info 顶部 PageHeader title 旁放一个 Tag
 */

export interface ProtocolSourceTagProps {
  source: Uart.protocol['source'] | undefined
  /** remark 字段（fallback marker 解析） */
  remark?: string | null | undefined
  /** size，默认 small（list 紧凑） */
  size?: 'small' | 'default'
}

const SOURCE_STYLE: Record<
  NonNullable<Uart.protocol['source']>,
  { color: string; text: string; tip: string }
> = {
  'ai-generate': {
    color: 'purple',
    text: 'AI 生成',
    tip: '由 AI 一次性生成',
  },
  'ai-chat': {
    color: 'blue',
    text: 'AI 修改',
    tip: '由 AI 生成后通过 chat 持续修改',
  },
  admin: {
    color: 'default',
    text: '手动',
    tip: 'admin 手动维护',
  },
}

const MARKER_RE = /<!--\s*AI-GENERATED\s+/

function hasAiMarker(remark: string | null | undefined): boolean {
  if (!remark) return false
  return MARKER_RE.test(remark)
}

export function ProtocolSourceTag({
  source,
  remark,
  size = 'small',
}: ProtocolSourceTagProps) {
  // 优先看 source 字段（结构化）
  if (source && source in SOURCE_STYLE) {
    const s = SOURCE_STYLE[source]
    return (
      <Tooltip title={s.tip}>
        <Tag color={s.color} icon={<RobotOutlined />} style={{ margin: 0, fontSize: size === 'small' ? 10 : 12 }}>
          {s.text}
        </Tag>
      </Tooltip>
    )
  }
  // fallback: remark marker（兼容老数据，没 source 字段时）
  if (hasAiMarker(remark)) {
    return (
      <Tooltip title="由 AI 生成（老数据，缺 source 字段）">
        <Tag color="purple" icon={<RobotOutlined />} style={{ margin: 0, fontSize: size === 'small' ? 10 : 12 }}>
          AI 生成
        </Tag>
      </Tooltip>
    )
  }
  // 真正手动维护
  if (source === 'admin') {
    return (
      <Tooltip title={SOURCE_STYLE.admin.tip}>
        <Tag color="default" icon={<UserOutlined />} style={{ margin: 0, fontSize: size === 'small' ? 10 : 12 }}>
          手动
        </Tag>
      </Tooltip>
    )
  }
  return null
}
