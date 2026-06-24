import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders logo block', () => {
    const { container } = render(<BrandLogo />)
    const block = container.querySelector('.brand-gradient') as HTMLElement
    expect(block).toBeInTheDocument()
  })

  it('renders "U" letter in logo block by default', () => {
    const { container } = render(<BrandLogo />)
    const block = container.querySelector('.brand-gradient') as HTMLElement
    expect(block).toHaveTextContent('U')
  })

  it('renders with href as link', () => {
    render(<BrandLogo href="/main" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/main')
  })

  it('renders text and subtitle', () => {
    render(<BrandLogo text="UART" subtitle="IoT Management" />)
    expect(screen.getByText('UART')).toBeInTheDocument()
    expect(screen.getByText('IoT Management')).toBeInTheDocument()
  })

  it('respects custom size', () => {
    const { container } = render(<BrandLogo size={48} />)
    const block = container.querySelector('.brand-gradient') as HTMLElement
    expect(block.style.width).toBe('48px')
    expect(block.style.height).toBe('48px')
  })

  it('hides subtitle when showSubtitle=false', () => {
    render(<BrandLogo showSubtitle={false} />)
    expect(screen.queryByText('IoT Management')).not.toBeInTheDocument()
  })
})
