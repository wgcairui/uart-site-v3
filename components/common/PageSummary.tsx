'use client'

import type { ReactNode } from 'react'
import { VARIANT_TO_TAILWIND_BG, type SummaryVariant } from '@/lib/utils/designTokens'

export type { SummaryVariant }

export interface PageSummaryItem {
  /** 标签 */
  label: string
  /** 主数值 */
  value: ReactNode
  /** 副标签 */
  extra?: ReactNode
  /** 右上角图标 */
  icon?: ReactNode
  /** 语义色变体 */
  variant?: SummaryVariant
  /** 自定义 hex（优先于 variant） */
  color?: string
  /** 多选叠加筛选高亮 */
  active?: boolean
  /** 点击回调（启用 hover 效果） */
  onClick?: () => void
}

interface PageSummaryProps {
  items: PageSummaryItem[]
  /** 列数（默认 4） */
  column?: number
}

function resolveColor(variant?: SummaryVariant, color?: string): string {
  return color ?? (variant ? `var(--color-${variant})` : 'var(--color-primary)')
}

/**
 * 页面顶部汇总卡
 *
 * 视觉规则见 docs/style-guide.md §3.2：
 * - rounded-2xl + shadow-sm + hover lift
 * - 右上角图标 (40×40 rounded-xl + bg-{variant}-50)
 * - 主数值 text-3xl font-bold + tabular-nums
 * - 副标签 text-xs，方向用 semantic 色
 *
 * 替代旧版 `<Divider plain>标题 / {total}</Divider>` + 顶部 3px 彩条风格。
 */
export function PageSummary({ items, column = 4 }: PageSummaryProps) {
  if (items.length === 0) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${column}, minmax(0, 1fr))`,
        gap: 20,
        marginBottom: 32,
      }}
      className="page-summary-grid"
    >
      {items.map((it, i) => {
        const variant = it.variant ?? 'primary'
        const color = resolveColor(variant, it.color)
        const bgColor = VARIANT_TO_TAILWIND_BG[variant]
        const clickable = !!it.onClick

        return (
          <div
            key={i}
            className={`stat-card ${clickable ? 'stat-card-clickable' : ''}`}
            onClick={it.onClick}
            style={{
              outline: it.active ? `1px solid ${color}` : undefined,
              background: it.active ? `${bgColor}` : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="stat-card-label">{it.label}</div>
                <div className="stat-card-value" style={{ color }}>{it.value}</div>
                {it.extra && <div className="stat-card-extra">{it.extra}</div>}
              </div>
              {it.icon && (
                <div
                  className="stat-card-icon"
                  style={{ background: bgColor, color }}
                >
                  {it.icon}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PageSummary