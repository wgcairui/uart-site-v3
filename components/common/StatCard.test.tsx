import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="设备总数" value={42} />)
    expect(screen.getByText('设备总数')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders prefix and suffix', () => {
    render(<StatCard title="覆盖率" value={75} prefix="↑" suffix="%" />)
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(<StatCard title="标题" value={1} icon={<span data-testid="icon">📡</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders extra', () => {
    render(<StatCard title="标题" value={1} extra="+12 较昨日" />)
    expect(screen.getByText('+12 较昨日')).toBeInTheDocument()
  })

  it('default variant is primary', () => {
    const { container } = render(<StatCard title="标题" value={1} />)
    const valueEl = container.querySelector('.stat-card-value') as HTMLElement
    expect(valueEl.style.color).toBe('var(--color-primary)')
  })

  it('respects variant', () => {
    const { container } = render(<StatCard title="标题" value={1} variant="success" />)
    const valueEl = container.querySelector('.stat-card-value') as HTMLElement
    expect(valueEl.style.color).toBe('var(--color-success)')
  })

  it('custom color overrides variant', () => {
    const { container } = render(<StatCard title="标题" value={1} variant="success" color="#ff0000" />)
    const valueEl = container.querySelector('.stat-card-value') as HTMLElement
    expect(valueEl.style.color).toBe('rgb(255, 0, 0)')
  })

  it('fires onClick when clickable', () => {
    const onClick = vi.fn()
    const { container } = render(<StatCard title="标题" value={1} onClick={onClick} />)
    const card = container.querySelector('.stat-card') as HTMLElement
    expect(card).toHaveClass('stat-card-clickable')
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('not clickable when no onClick', () => {
    const { container } = render(<StatCard title="标题" value={1} />)
    const card = container.querySelector('.stat-card') as HTMLElement
    expect(card).not.toHaveClass('stat-card-clickable')
  })
})
