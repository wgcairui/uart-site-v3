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
  /**
   * 视觉主题 (2026-07-25)
   * - `default`     → 现有浅色视觉
   * - `control-room`→ user 端暗色, 走 --cr-* token
   */
  theme?: 'default' | 'control-room'
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
export function KVList({ title, icon, items, column = 2, theme = 'default' }: KVListProps) {
  const isCR = theme === 'control-room'
  const labelColor = isCR ? 'var(--cr-text-3)' : 'var(--ink-500)'
  const valueColor = isCR ? 'var(--cr-text-1)' : 'var(--ink-900)'
  const dashColor = isCR ? 'var(--cr-text-muted)' : 'var(--ink-300)'
  const borderColor = isCR ? 'var(--cr-border)' : 'var(--ink-100)'

  return (
    <div
      className={isCR ? 'kv-list-cr' : 'app-card'}
      style={{ padding: 24, height: '100%' }}
    >
      {title && <SectionTitle icon={icon} title={title} theme={theme} />}
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
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <div style={{ color: labelColor, fontSize: 13, minWidth: 100, flexShrink: 0 }}>
              {it.label}
            </div>
            <div style={{ color: valueColor, fontSize: 14, fontWeight: 500, wordBreak: 'break-word', flex: 1 }}>
              {it.value ?? <span style={{ color: dashColor }}>-</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KVList
