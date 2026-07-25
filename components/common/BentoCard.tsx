'use client'

import type { CSSProperties, FC, ReactNode } from 'react'

export type BentoCardVariant = 'default' | 'hero' | 'subtle'
export type BentoCardPadding = 'sm' | 'md' | 'lg'
/**
 * 主题变体 (2026-07-25)
 * - `default`     → 现有浅色 Bento 视觉 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色, 走 --cr-* token
 */
export type BentoCardTheme = 'default' | 'control-room'

interface BentoCardProps {
  children: ReactNode
  className?: string
  variant?: BentoCardVariant
  hoverable?: boolean
  padding?: BentoCardPadding
  style?: CSSProperties
  /**
   * 视觉主题 (2026-07-25)
   */
  theme?: BentoCardTheme
}

const PADDING: Record<BentoCardPadding, string> = {
  sm: '16px',
  md: '24px',
  lg: '32px',
}

/**
 * BentoCard · v2 通用容器
 *
 * 取代 antd `<Card>` 默认样式 + 自定义 className
 * 视觉：半透明白 + 紫光晕 + 18px 圆角 (default)
 *       深色 --cr-bg-elev-1 + 16px 圆角 (control-room)
 *
 * 用法:
 * ```tsx
 * <BentoCard>普通 Bento 卡</BentoCard>
 * <BentoCard variant="hero">深紫 aurora hero 卡</BentoCard>
 * <BentoCard hoverable padding="lg">大 padding 交互卡</BentoCard>
 * <BentoCard theme="control-room">user 端暗色卡</BentoCard>
 * ```
 *
 * 完整规范: docs/style-guide.md v2 §2.3
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */
export const BentoCard: FC<BentoCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverable = true,
  padding = 'md',
  style,
  theme = 'default',
}) => {
  const isCR = theme === 'control-room'
  const variantClass = variant === 'hero' ? 'bento-card-hero' : ''
  const hoverClass = hoverable ? 'bento-card-hoverable' : ''
  const baseClass = isCR ? 'bento-card-cr' : 'bento-card'
  return (
    <div
      className={`${baseClass} ${variantClass} ${hoverClass} ${className}`.trim()}
      style={{ padding: PADDING[padding], ...style }}
    >
      {children}
    </div>
  )
}

export default BentoCard
