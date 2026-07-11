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
 */

export type AppButtonVariant = 'primary' | 'default' | 'ghost' | 'danger' | 'link'

interface AppButtonProps extends Omit<ButtonProps, 'type' | 'variant'> {
  variant?: AppButtonVariant
  icon?: ReactNode
}

const VARIANT_CLASS: Record<AppButtonVariant, string> = {
  primary: 'btn-brand',
  default: 'btn-default',
  ghost:   'btn-ghost',
  danger:  'btn-danger',
  link:    'btn-link',
}

export const Button: FC<AppButtonProps> = ({
  variant = 'default',
  children,
  className,
  ...rest
}) => {
  return (
    <AntButton
      {...rest}
      type={variant === 'link' ? 'link' : 'default'}
      className={`${VARIANT_CLASS[variant]} ${className ?? ''}`.trim()}
    >
      {children}
    </AntButton>
  )
}

export default Button
