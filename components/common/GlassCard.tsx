'use client'

import type { CSSProperties, FC, ReactNode } from 'react'

export type GlassCardVariant = 'light' | 'tinted' | 'dark'
export type GlassCardPadding = 'md' | 'lg' | 'xl'

interface GlassCardProps {
  children: ReactNode
  className?: string
  variant?: GlassCardVariant
  padding?: GlassCardPadding
  style?: CSSProperties
}

const PADDING: Record<GlassCardPadding, string> = {
  md: '24px',
  lg: '32px',
  xl: '40px',
}

const VARIANT_CLASS: Record<GlassCardVariant, string> = {
  light: 'glass-card-light',
  tinted: 'glass-card-tinted',
  dark: 'glass-card-dark',
}

/**
 * GlassCard · v2 玻璃风格容器
 *
 * 3 个 variant 适用不同场景：
 * - `light`: Bento 主体上的玻璃装饰（设备详情实时数据区）
 * - `tinted`: 粉紫渐变（设备操作区 / 告警历史）
 * - `dark`: Mesh 背景上的玻璃卡（登录 / Landing）
 *
 * 用法:
 * ```tsx
 * <GlassCard variant="light">实时数据区</GlassCard>
 * <GlassCard variant="dark" padding="xl">登录卡</GlassCard>
 * ```
 *
 * 完整规范: docs/style-guide.md v2 §2.4
 */
export const GlassCard: FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'light',
  padding = 'lg',
  style,
}) => {
  return (
    <div
      className={`glass-card ${VARIANT_CLASS[variant]} ${className}`.trim()}
      style={{ padding: PADDING[padding], ...style }}
    >
      {children}
    </div>
  )
}

export default GlassCard
