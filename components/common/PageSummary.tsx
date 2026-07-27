'use client'

import type { ReactNode } from 'react'
import { VARIANT_TO_TAILWIND_BG, type SummaryVariant } from '@/lib/utils/designTokens'

export type { SummaryVariant }

/**
 * 主题变体 (2026-07-25)
 * - `default`     → 现有浅色 Bento 视觉 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色, 走 --cr-* token
 */
export type PageSummaryTheme = 'default' | 'control-room'

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
  /**
   * 视觉主题 (2026-07-25):
   * - `default`      → 现有浅色视觉
   * - `control-room` → user 端暗色 (走 --cr-* token)
   */
  theme?: PageSummaryTheme
}

// Control Room 暗色版 variant 颜色映射 (替代 resolveColor 默认的 --color-*)
const CR_VARIANT_COLOR: Record<SummaryVariant, string> = {
  primary: 'var(--cr-accent)',
  success: 'var(--cr-status-online)',
  warning: 'var(--cr-status-warning)',
  danger:  'var(--cr-status-danger)',
  info:    '#34D399',  // 深色版 info 复用绿
  purple:  '#A78BFA',  // 深色版 purple 浅紫
}

const CR_VARIANT_BG: Record<SummaryVariant, string> = {
  primary: 'var(--cr-accent-soft)',
  success: 'rgba(52, 211, 153, 0.12)',
  warning: 'rgba(251, 191, 36, 0.12)',
  danger:  'rgba(248, 113, 113, 0.12)',
  info:    'rgba(52, 211, 153, 0.12)',
  purple:  'rgba(167, 139, 250, 0.12)',
}

function resolveColor(variant?: SummaryVariant, color?: string, isCR = false): string {
  if (color) return color
  if (variant) {
    return isCR ? CR_VARIANT_COLOR[variant] : `var(--color-${variant})`
  }
  return isCR ? 'var(--cr-accent)' : 'var(--color-primary)'
}

function resolveBg(variant?: SummaryVariant, isCR = false): string {
  const v = variant ?? 'primary'
  return isCR ? CR_VARIANT_BG[v] : VARIANT_TO_TAILWIND_BG[v]
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
 *
 * 列数规则（2026-07-24 简化）：
 * - 固定 N 列 (`repeat(N, 1fr)`)，不再用 auto-fit
 * - 调用方根据容器宽度显式传 column：user 移动端 375px 容器 → column=2
 *   admin 桌面端 → 默认 4
 * - gap 跟列数走：4 列 20px / 2 列 12px（紧凑）
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */
export function PageSummary({ items, column = 4, theme = 'default' }: PageSummaryProps) {
  if (items.length === 0) return null

  const isCR = theme === 'control-room'
  const gap = column >= 4 ? 20 : 12

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${column}, 1fr)`,
        gap,
        marginBottom: 24,
      }}
      className="page-summary-grid"
    >
      {items.map((it, i) => {
        const variant = it.variant ?? 'primary'
        const color = resolveColor(variant, it.color, isCR)
        const bgColor = resolveBg(variant, isCR)
        const clickable = !!it.onClick

        const cardClass = isCR
          ? `stat-card-cr ${clickable ? 'stat-card-cr-clickable' : ''}${it.active ? ' active' : ''}`
          : `stat-card ${clickable ? 'stat-card-clickable' : ''}`

        const labelClass = isCR ? 'stat-card-cr-label' : 'stat-card-label'
        const valueClass = isCR ? 'stat-card-cr-value' : 'stat-card-value'
        const extraClass = isCR ? 'stat-card-cr-extra' : 'stat-card-extra'
        const iconClass = isCR ? 'stat-card-cr-icon' : 'stat-card-icon'

        return (
          <div
            key={i}
            className={cardClass}
            onClick={it.onClick}
            style={!isCR && it.active ? {
              outline: `1px solid ${color}`,
              background: bgColor,
            } : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={labelClass}>
                  {isCR && <span className="stat-card-cr-dot" style={{ background: color }} />}
                  {it.label}
                </div>
                <div className={valueClass} style={isCR ? undefined : { color }}>
                  {it.value}
                </div>
                {it.extra && <div className={extraClass}>{it.extra}</div>}
              </div>
              {it.icon && (
                <div
                  className={iconClass}
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
