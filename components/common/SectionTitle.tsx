'use client'

import type { ReactNode } from 'react'

interface SectionTitleProps {
  icon?: ReactNode
  title: ReactNode
  extra?: ReactNode
}

/**
 * 区块标题
 *
 * 视觉规则见 docs/style-guide.md §2.3：
 * - icon + 文字 + 右侧 extra 操作
 * - 字号 16px font-semibold
 * - 不再使用 antd Divider
 */
export function SectionTitle({ icon, title, extra }: SectionTitleProps) {
  return (
    <div className="app-section-title">
      {icon && <span className="app-section-title-icon">{icon}</span>}
      <span>{title}</span>
      {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
    </div>
  )
}

export default SectionTitle