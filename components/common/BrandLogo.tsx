'use client'

import Link from 'next/link'
import type { FC } from 'react'

/**
 * 主题变体 (2026-07-25)
 * - `default`     → 现有紫粉渐变方块 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色, 方块改黄色, 文字改纯白
 */
export type BrandLogoTheme = 'default' | 'control-room'

interface BrandLogoProps {
  /** 显示文字（默认 "UART"） */
  text?: string
  /** 显示副标题（默认 "IoT Management"） */
  subtitle?: string
  /** Logo 块尺寸 px */
  size?: number
  /** 点击跳转的目标 */
  href?: string
  /** 是否显示副标题 */
  showSubtitle?: boolean
  /**
   * 视觉主题 (2026-07-25)
   */
  theme?: BrandLogoTheme
}

/**
 * 品牌 Logo — 品牌渐变方块 + 文字
 *
 * 规范见 docs/style-guide.md §3.6
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 * - 方块背景: 紫粉渐变 → --cr-accent 黄色
 * - 文字: 紫粉渐变 → --cr-text-1 纯白
 */
export const BrandLogo: FC<BrandLogoProps> = ({
  text = 'UART',
  subtitle = 'IoT Management',
  size = 36,
  href,
  showSubtitle = true,
  theme = 'default',
}) => {
  const isCR = theme === 'control-room'

  const blockClass = isCR
    ? 'brand-logo-cr-block'
    : 'brand-gradient brand-shadow'

  const textClass = isCR
    ? 'brand-logo-cr-text'
    : 'brand-text'

  const textColor = isCR ? 'var(--cr-text-1)' : undefined
  const subtitleColor = isCR ? 'var(--cr-text-3)' : '#64748b'

  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px' }}>
      <div
        className={blockClass}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isCR ? 'var(--cr-bg)' : '#fff',
          fontWeight: 700,
          fontSize: size * 0.45,
          flexShrink: 0,
        }}
      >
        U
      </div>
      {showSubtitle ? (
        <div>
          <div
            className={textClass}
            style={{
              fontWeight: 600,
              fontSize: 16,
              lineHeight: 1.2,
              ...(textColor ? { color: textColor } : {}),
            }}
          >
            {text}
          </div>
          <div
            style={{
              fontSize: 10,
              color: subtitleColor,
              letterSpacing: '0.04em',
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
      ) : (
        <div
          className={textClass}
          style={{
            fontWeight: 600,
            fontSize: 18,
            ...(textColor ? { color: textColor } : {}),
          }}
        >
          {text}
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{inner}</Link>
  }
  return inner
}

export default BrandLogo
