'use client'

import type { CSSProperties, FC, ReactNode } from 'react'

export type BentoCardVariant = 'default' | 'hero' | 'subtle'
export type BentoCardPadding = 'sm' | 'md' | 'lg'

interface BentoCardProps {
  children: ReactNode
  className?: string
  variant?: BentoCardVariant
  hoverable?: boolean
  padding?: BentoCardPadding
  style?: CSSProperties
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
 * 视觉：半透明白 + 紫光晕 + 18px 圆角
 *
 * 用法:
 * ```tsx
 * <BentoCard>普通 Bento 卡</BentoCard>
 * <BentoCard variant="hero">深紫 aurora hero 卡</BentoCard>
 * <BentoCard hoverable padding="lg">大 padding 交互卡</BentoCard>
 * ```
 *
 * 完整规范: docs/style-guide.md v2 §2.3
 */
export const BentoCard: FC<BentoCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverable = true,
  padding = 'md',
  style,
}) => {
  const variantClass = variant === 'hero' ? 'bento-card-hero' : ''
  const hoverClass = hoverable ? 'bento-card-hoverable' : ''
  return (
    <div
      className={`bento-card ${variantClass} ${hoverClass} ${className}`.trim()}
      style={{ padding: PADDING[padding], ...style }}
    >
      {children}
    </div>
  )
}

export default BentoCard
