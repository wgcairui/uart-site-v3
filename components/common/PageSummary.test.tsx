import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageSummary } from './PageSummary'

describe('PageSummary', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<PageSummary items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all item labels and values', () => {
    render(
      <PageSummary
        items={[
          { label: '设备总数', value: 100, variant: 'primary' },
          { label: '在线', value: 80, variant: 'success' },
        ]}
      />
    )
    expect(screen.getByText('设备总数')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('在线')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <PageSummary
        items={[{ label: '设备', value: 1, icon: <span data-testid="icon">📡</span> }]}
      />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders extra', () => {
    render(
      <PageSummary items={[{ label: '设备', value: 1, extra: '副标签' }]} />
    )
    expect(screen.getByText('副标签')).toBeInTheDocument()
  })

  it('uses default 4-column grid', () => {
    const { container } = render(
      <PageSummary items={[{ label: 'a', value: 1 }]} />
    )
    const grid = container.querySelector('.page-summary-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
  })

  it('respects column prop', () => {
    const { container } = render(
      <PageSummary column={2} items={[{ label: 'a', value: 1 }]} />
    )
    const grid = container.querySelector('.page-summary-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
  })

  it('applies active highlight outline', () => {
    const { container } = render(
      <PageSummary items={[{ label: 'a', value: 1, variant: 'primary', active: true }]} />
    )
    const card = container.querySelector('.stat-card') as HTMLElement
    expect(card.style.outline).toContain('solid')
  })

  it('fires onClick when card clicked', () => {
    const onClick = vi.fn()
    const { container } = render(
      <PageSummary items={[{ label: 'a', value: 1, onClick }]} />
    )
    const card = container.querySelector('.stat-card') as HTMLElement
    expect(card).toHaveClass('stat-card-clickable')
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('custom color overrides variant', () => {
    const { container } = render(
      <PageSummary items={[{ label: 'a', value: 1, variant: 'success', color: '#ff0000' }]} />
    )
    const valueEl = container.querySelector('.stat-card-value') as HTMLElement
    expect(valueEl.style.color).toBe('rgb(255, 0, 0)')
  })
})
