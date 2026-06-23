'use client'

import type { ReactNode } from 'react'
import { VARIANT_TO_TAILWIND_BG, type SummaryVariant } from '@/lib/utils/designTokens'

interface StatCardProps {
  title: string
  value: ReactNode
  suffix?: ReactNode
  prefix?: ReactNode
  icon?: ReactNode
  variant?: SummaryVariant
  color?: string
  extra?: ReactNode
  onClick?: () => void
}

/**
 * 数字统计卡片（独立组件）
 *
 * 视觉跟 PageSummary 完全一致（共用 .stat-card 系列样式）。
 * 适用于：单卡使用场景（如仪表盘外的某些弹窗/侧栏）。
 *
 * 规范见 docs/style-guide.md §3.2
 */
export function StatCard({
  title,
  value,
  suffix,
  prefix,
  icon,
  variant = 'primary',
  color,
  extra,
  onClick,
}: StatCardProps) {
  const finalColor = color ?? `var(--color-${variant})`
  const bgColor = VARIANT_TO_TAILWIND_BG[variant]
  const clickable = !!onClick

  return (
    <div
      className={`stat-card ${clickable ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="stat-card-label">{title}</div>
          <div className="stat-card-value" style={{ color: finalColor, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            {prefix && <span style={{ fontSize: 16 }}>{prefix}</span>}
            <span>{value}</span>
            {suffix && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-500)' }}>{suffix}</span>}
          </div>
          {extra && <div className="stat-card-extra">{extra}</div>}
        </div>
        {icon && (
          <div className="stat-card-icon" style={{ background: bgColor, color: finalColor }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard