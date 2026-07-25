'use client'

import { Button as AntButton } from 'antd'
import type { ButtonProps } from 'antd'
import type { FC, ReactNode } from 'react'

/**
 * v2 统一按钮 · 5 variant
 *
 * - `primary` → 品牌渐变 + glow shadow
 * - `default` → 白底 + 紫边
 * - `ghost`   → 透明 + hover 浅紫底
 * - `danger`  → 红色（仅确认删除时）
 * - `link`    → 纯文字 + 品牌色
 *
 * 全部走 globals.css .btn-* class + token, 不再 inline style
 *
 * 规范: docs/style-guide.md v2 §4.6
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */

export type AppButtonVariant = 'primary' | 'default' | 'ghost' | 'danger' | 'link'
/**
 * 主题变体 (2026-07-25)
 * - `default`     → 现有浅色视觉 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色, 走 --cr-* token
 */
export type AppButtonTheme = 'default' | 'control-room'

interface AppButtonProps extends Omit<ButtonProps, 'type' | 'variant'> {
  variant?: AppButtonVariant
  icon?: ReactNode
  /**
   * 视觉主题 (2026-07-25)
   */
  theme?: AppButtonTheme
}

const VARIANT_CLASS_DEFAULT: Record<AppButtonVariant, string> = {
  primary: 'btn-brand',
  default: 'btn-default',
  ghost:   'btn-ghost',
  danger:  'btn-danger',
  link:    'btn-link',
}

const VARIANT_CLASS_CR: Record<AppButtonVariant, string> = {
  primary: 'btn-cr-primary',
  default: 'btn-cr-default',
  ghost:   'btn-cr-ghost',
  danger:  'btn-cr-danger',
  link:    'btn-cr-link',
}

export const Button: FC<AppButtonProps> = ({
  variant = 'default',
  theme = 'default',
  children,
  className,
  ...rest
}) => {
  const isCR = theme === 'control-room'
  const variantClass = isCR ? VARIANT_CLASS_CR[variant] : VARIANT_CLASS_DEFAULT[variant]
  return (
    <AntButton
      {...rest}
      type={variant === 'link' ? 'link' : 'default'}
      className={`${variantClass} ${className ?? ''}`.trim()}
    >
      {children}
    </AntButton>
  )
}

export default Button
