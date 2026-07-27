'use client'

import type { ReactNode } from 'react'

interface SectionTitleProps {
  icon?: ReactNode
  title: ReactNode
  extra?: ReactNode
  /**
   * 视觉主题 (2026-07-25)
   */
  theme?: 'default' | 'control-room'
}

/**
 * 区块标题
 *
 * 视觉规则见 docs/style-guide.md §2.3：
 * - icon + 文字 + 右侧 extra 操作
 * - 字号 16px font-semibold
 * - 不再使用 antd Divider
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */
export function SectionTitle({ icon, title, extra, theme = 'default' }: SectionTitleProps) {
  const isCR = theme === 'control-room'
  return (
    <div
      className={isCR ? 'app-section-title-cr' : 'app-section-title'}
      style={isCR ? { color: 'var(--cr-text-1)' } : undefined}
    >
      {icon && <span className="app-section-title-icon">{icon}</span>}
      <span>{title}</span>
      {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
    </div>
  )
}

export default SectionTitle
