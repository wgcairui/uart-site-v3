'use client'

import { Button as AntButton } from 'antd'
import type { ButtonProps } from 'antd'
import type { FC, ReactNode } from 'react'

export type AppButtonVariant = 'primary' | 'default' | 'link' | 'danger' | 'text'

interface AppButtonProps extends Omit<ButtonProps, 'type' | 'variant'> {
  /** 按钮变体 */
  variant?: AppButtonVariant
  /** 图标（仅 icon 按钮时） */
  icon?: ReactNode
}

/**
 * 统一按钮组件
 *
 * - `primary` → 品牌渐变 + 阴影
 * - `default` → 白底 + 灰边
 * - `link` → 纯文字 + 品牌色
 * - `danger` → 红底（删除确认）
 * - `text` → 无背景透明按钮
 *
 * 规范见 docs/style-guide.md §3.4
 */
export const Button: FC<AppButtonProps> = ({
  variant = 'default',
  children,
  className,
  style,
  ...rest
}) => {
  const isPrimary = variant === 'primary'
  const isDanger  = variant === 'danger'
  const isLink    = variant === 'link'
  const isText    = variant === 'text'

  const mergedClass = [
    isPrimary ? 'btn-brand' : '',
    className,
  ].filter(Boolean).join(' ')

  const mergedStyle: React.CSSProperties = isPrimary
    ? {
        background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
        border: 0,
        color: '#fff',
        fontWeight: 500,
        ...style,
      }
    : isDanger
    ? {
        background: '#dc2626',
        borderColor: '#dc2626',
        color: '#fff',
        ...style,
      }
    : isLink
    ? {
        background: 'transparent',
        border: 0,
        color: '#6366f1',
        padding: '4px 8px',
        ...style,
      }
    : isText
    ? { background: 'transparent', border: 0, ...style }
    : {
        background: '#fff',
        borderColor: '#f1f5f9',
        color: '#334155',
        ...style,
      }

  return (
    <AntButton
      {...rest}
      type={isPrimary || isDanger ? 'primary' : isLink || isText ? 'text' : 'default'}
      className={mergedClass}
      style={mergedStyle}
    >
      {children}
    </AntButton>
  )
}

export default Button