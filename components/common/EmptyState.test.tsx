import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders default description', () => {
    render(<EmptyState />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('renders custom description', () => {
    render(<EmptyState description="该用户还没有绑定设备" />)
    expect(screen.getByText('该用户还没有绑定设备')).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    render(<EmptyState icon={<span data-testid="icon">📭</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render action button when actionLabel/onAction not both provided', () => {
    render(<EmptyState actionLabel="去添加" />)
    expect(screen.queryByRole('button', { name: '去添加' })).not.toBeInTheDocument()
  })

  it('renders primary action button', () => {
    const onAction = vi.fn()
    render(<EmptyState actionLabel="去添加" onAction={onAction} />)
    const btn = screen.getByRole('button', { name: '去添加' })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('renders secondary action button', () => {
    const onSecondary = vi.fn()
    render(
      <EmptyState
        actionLabel="主操作"
        onAction={() => {}}
        secondaryLabel="副操作"
        onSecondary={onSecondary}
      />
    )
    const btn = screen.getByRole('button', { name: '副操作' })
    fireEvent.click(btn)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('respects custom minHeight', () => {
    const { container } = render(<EmptyState minHeight={500} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.minHeight).toBe('500px')
  })

  it('default minHeight is 360', () => {
    const { container } = render(<EmptyState />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.minHeight).toBe('360px')
  })
})
