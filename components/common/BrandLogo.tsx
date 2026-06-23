'use client'

import Link from 'next/link'
import type { FC } from 'react'

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
}

/**
 * 品牌 Logo — 品牌渐变方块 + 文字
 *
 * 规范见 docs/style-guide.md §3.6
 */
export const BrandLogo: FC<BrandLogoProps> = ({
  text = 'UART',
  subtitle = 'IoT Management',
  size = 36,
  href,
  showSubtitle = true,
}) => {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px' }}>
      <div
        className="brand-gradient brand-shadow"
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: size * 0.45,
          flexShrink: 0,
        }}
      >
        U
      </div>
      {showSubtitle ? (
        <div>
          <div className="brand-text" style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>
            {text}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.04em', marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
      ) : (
        <div className="brand-text" style={{ fontWeight: 600, fontSize: 18 }}>
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