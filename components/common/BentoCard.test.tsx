import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BentoCard } from './BentoCard'

/**
 * BentoCard · tier 3 渲染测试
 *
 * 参考 Button.test.tsx 风格: 纯 DOM props/class 验证, 不 mock antd.
 * 视觉: 半透明白 + 紫光晕 + 18px 圆角 (见 docs/style-guide.md v2 §2.3).
 *
 * Props 矩阵:
 *   variant:  'default' | 'hero' | 'subtle'  (default → '', hero → 'bento-card-hero', subtle → '')
 *   padding:  'sm' (16px) | 'md' (24px) | 'lg' (32px)
 *   hoverable: true (default) | false
 *   className: 透传
 */

describe('BentoCard', () => {
  it('renders children', () => {
    render(<BentoCard>卡片内容</BentoCard>)
    expect(screen.getByText('卡片内容')).toBeInTheDocument()
  })

  it('default variant uses bento-card class (no extra hero class)', () => {
    const { container } = render(<BentoCard>默认</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bento-card')
    expect(card).not.toHaveClass('bento-card-hero')
  })

  it('variant="hero" adds bento-card-hero class', () => {
    const { container } = render(<BentoCard variant="hero">Hero</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bento-card')
    expect(card).toHaveClass('bento-card-hero')
  })

  it('variant="subtle" renders no extra variant class', () => {
    const { container } = render(<BentoCard variant="subtle">Subtle</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bento-card')
    expect(card).not.toHaveClass('bento-card-hero')
  })

  it('padding="sm" applies 16px', () => {
    const { container } = render(<BentoCard padding="sm">sm</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('16px')
  })

  it('padding="md" applies 24px (default)', () => {
    const { container } = render(<BentoCard>md</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('24px')
  })

  it('padding="lg" applies 32px', () => {
    const { container } = render(<BentoCard padding="lg">lg</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('32px')
  })

  it('hoverable=true (default) adds bento-card-hoverable class', () => {
    const { container } = render(<BentoCard>hover</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bento-card-hoverable')
  })

  it('hoverable=false omits bento-card-hoverable class', () => {
    const { container } = render(<BentoCard hoverable={false}>no-hover</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).not.toHaveClass('bento-card-hoverable')
  })

  it('className is forwarded to root element', () => {
    const { container } = render(<BentoCard className="custom-class">x</BentoCard>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('custom-class')
    expect(card).toHaveClass('bento-card')
  })

  it('className merges with bento-card + variant + hoverable', () => {
    const { container } = render(
      <BentoCard variant="hero" className="extra-1 extra-2">x</BentoCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bento-card')
    expect(card).toHaveClass('bento-card-hero')
    expect(card).toHaveClass('bento-card-hoverable')
    expect(card).toHaveClass('extra-1')
    expect(card).toHaveClass('extra-2')
  })

  it('style prop is merged with padding (user style wins on conflict)', () => {
    const { container } = render(
      <BentoCard padding="md" style={{ color: 'red' }}>merged</BentoCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.padding).toBe('24px')
    expect(card.style.color).toBe('red')
  })
})
