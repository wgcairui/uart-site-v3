'use client'

import type { FC, ReactNode } from 'react'

/**
 * v2 状态徽章 · 6 variant
 *
 * - `online`  → 绿 + pulse 圆点动画
 * - `offline` → 红
 * - `warning` → 黄
 * - `error`   → 深红
 * - `info`    → 紫
 * - `idle`    → 灰（新增）
 *
 * 视觉: 胶囊 + 圆点 + 极淡背景
 * 全部走 globals.css .status-tag-* class (v2 token)
 *
 * 规范: docs/style-guide.md v2 §4.5
 */

export type StatusTagVariant = 'online' | 'warning' | 'offline' | 'error' | 'info' | 'idle'
export type StatusTagSize = 'sm' | 'md'

interface StatusTagProps {
  variant?: StatusTagVariant
  /** 显示文字（默认取 variant 中文映射） */
  text?: ReactNode
  /** 自定义 icon 节点（不传则显示状态圆点） */
  icon?: ReactNode
  /** 强制显示圆点（v2: 默认 true, 之前 v1 走 ::before） */
  showDot?: boolean
  /** online 圆点 2s 循环动画 */
  pulse?: boolean
  /** 尺寸: sm=10px (表格内), md=12px (默认) */
  size?: StatusTagSize
}

const DEFAULT_TEXT: Record<StatusTagVariant, string> = {
  online:  '在线',
  warning: '告警',
  offline: '离线',
  error:   '故障',
  info:    '信息',
  idle:    '闲置',
}

export const StatusTag: FC<StatusTagProps> = ({
  variant = 'online',
  text,
  icon,
  showDot = true,
  pulse = false,
  size = 'md',
}) => {
  const sizeClass = size === 'sm' ? 'status-tag-sm' : ''
  return (
    <span
      className={`status-tag status-tag-${variant} ${sizeClass}`.trim()}
      style={pulse && variant === 'online' ? undefined : undefined}
    >
      {showDot && <span className="status-dot" />}
      {icon}
      {text ?? DEFAULT_TEXT[variant]}
    </span>
  )
}

export default StatusTag
