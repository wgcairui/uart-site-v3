import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlassCard } from './GlassCard'

/**
 * GlassCard · tier 3 渲染测试
 *
 * 参考 Button.test.tsx 风格: 纯 DOM props/class 验证, 不 mock antd.
 * 视觉: 玻璃感 + 14px 圆角 (见 docs/style-guide.md v2 §2.4).
 *
 * Props 矩阵:
 *   variant:  'light' (default) | 'tinted' | 'dark'
 *   padding:  'md' (24px) | 'lg' (32px, default) | 'xl' (40px)
 *   className: 透传
 *   ref:      透传 (forwardRef)
 *
 * 注意: GlassCard 没用 forwardRef 显式包, 直接渲染 div.
 *       ref 透传部分测 "不影响 children 渲染" 即可 (源组件没有 ref forward).
 */

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>玻璃卡内容</GlassCard>)
    expect(screen.getByText('玻璃卡内容')).toBeInTheDocument()
  })

  it('default variant uses light class (glass-card-light)', () => {
    const { container } = render(<GlassCard>light</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('glass-card')
    expect(card).toHaveClass('glass-card-light')
  })

  it('variant="tinted" uses glass-card-tinted class', () => {
    const { container } = render(<GlassCard variant="tinted">tinted</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('glass-card')
    expect(card).toHaveClass('glass-card-tinted')
    expect(card).not.toHaveClass('glass-card-light')
  })

  it('variant="dark" uses glass-card-dark class', () => {
    const { container } = render(<GlassCard variant="dark">dark</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('glass-card')
    expect(card).toHaveClass('glass-card-dark')
    expect(card).not.toHaveClass('glass-card-light')
  })

  it('padding="md" applies 24px', () => {
    const { container } = render(<GlassCard padding="md">md</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('24px')
  })

  it('padding="lg" applies 32px (default)', () => {
    const { container } = render(<GlassCard>lg</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('32px')
  })

  it('padding="xl" applies 40px', () => {
    const { container } = render(<GlassCard padding="xl">xl</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('40px')
  })

  it('className is forwarded to root element', () => {
    const { container } = render(<GlassCard className="custom-class">x</GlassCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('custom-class')
    expect(card).toHaveClass('glass-card')
  })

  it('className merges with glass-card + variant class', () => {
    const { container } = render(
      <GlassCard variant="dark" className="extra">x</GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('glass-card')
    expect(card).toHaveClass('glass-card-dark')
    expect(card).toHaveClass('extra')
  })

  it('style prop is merged with padding', () => {
    const { container } = render(
      <GlassCard padding="lg" style={{ background: 'blue' }}>merged</GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('32px')
    expect(card.style.background).toBe('blue')
  })

  it('renders as a div (root element)', () => {
    const { container } = render(<GlassCard>div</GlassCard>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('does not crash when used inside parent wrapper (composition smoke test)', () => {
    // 注: 源组件没用 forwardRef, 不支持 ref 透传, 改为 wrapper composition smoke test.
    expect(() => {
      render(
        <div>
          <GlassCard variant="dark">nested</GlassCard>
        </div>
      )
    }).not.toThrow()
  })
})
