'use client'

import type { ReactNode } from 'react'
import SectionTitle from './SectionTitle'

interface KVListItem {
  label: ReactNode
  value: ReactNode
  span?: number  // 跨列数
}

interface KVListProps {
  title?: ReactNode
  /** 标题图标 */
  icon?: ReactNode
  items: KVListItem[]
  column?: number
}

/**
 * Key-Value 列表
 *
 * 视觉规则：
 * - 容器 .app-card + 24px padding
 * - 标题用 .app-section-title
 * - 列表项网格布局（默认 2 列）
 * - 标签灰、值深色，等高
 *
 * 替代 antd Descriptions（避免过度嵌套 + 圆角不匹配）
 */
export function KVList({ title, icon, items, column = 2 }: KVListProps) {
  return (
    <div className="app-card" style={{ padding: 24, height: '100%' }}>
      {title && <SectionTitle icon={icon} title={title} />}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${column}, minmax(0, 1fr))`,
          gap: '12px 24px',
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              gridColumn: it.span ? `span ${it.span}` : undefined,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--ink-100)',
            }}
          >
            <div style={{ color: 'var(--ink-500)', fontSize: 13, minWidth: 100, flexShrink: 0 }}>
              {it.label}
            </div>
            <div style={{ color: 'var(--ink-900)', fontSize: 14, fontWeight: 500, wordBreak: 'break-word', flex: 1 }}>
              {it.value ?? <span style={{ color: 'var(--ink-300)' }}>-</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KVList