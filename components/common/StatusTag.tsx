'use client'

import type { FC, ReactNode } from 'react'

export type StatusTagVariant = 'online' | 'warning' | 'offline' | 'error' | 'info'

interface StatusTagProps {
  /** 变体（决定颜色） */
  variant?: StatusTagVariant
  /** 显示文字（默认取 variant 中文映射） */
  text?: ReactNode
  /** 自定义 icon 节点（不传则显示状态圆点） */
  icon?: ReactNode
}

const DEFAULT_TEXT: Record<StatusTagVariant, string> = {
  online:  '在线',
  warning: '告警',
  offline: '离线',
  error:   '故障',
  info:    '信息',
}

/**
 * 统一状态徽章
 *
 * 前缀圆点用 CSS ::before（不是 emoji），符合 docs/style-guide.md §3.5。
 * 默认样式见 globals.css `.status-tag` / `.status-tag-*`。
 */
export const StatusTag: FC<StatusTagProps> = ({
  variant = 'online',
  text,
  icon,
}) => {
  return (
    <span className={`status-tag status-tag-${variant}`}>
      {icon ?? null}
      {text ?? DEFAULT_TEXT[variant]}
    </span>
  )
}

export default StatusTag