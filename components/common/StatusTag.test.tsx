import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusTag } from './StatusTag'

describe('StatusTag', () => {
  it('renders default text for online variant', () => {
    render(<StatusTag variant="online" />)
    expect(screen.getByText('在线')).toBeInTheDocument()
  })

  it('renders default text for all variants', () => {
    const { rerender } = render(<StatusTag variant="online" />)
    expect(screen.getByText('在线')).toBeInTheDocument()

    rerender(<StatusTag variant="warning" />)
    expect(screen.getByText('告警')).toBeInTheDocument()

    rerender(<StatusTag variant="offline" />)
    expect(screen.getByText('离线')).toBeInTheDocument()

    rerender(<StatusTag variant="error" />)
    expect(screen.getByText('故障')).toBeInTheDocument()

    rerender(<StatusTag variant="info" />)
    expect(screen.getByText('信息')).toBeInTheDocument()
  })

  it('renders custom text override', () => {
    render(<StatusTag variant="online" text="已连接" />)
    expect(screen.getByText('已连接')).toBeInTheDocument()
    expect(screen.queryByText('在线')).not.toBeInTheDocument()
  })

  it('applies variant class', () => {
    const { container } = render(<StatusTag variant="warning" />)
    const tag = container.querySelector('.status-tag-warning')
    expect(tag).toBeInTheDocument()
    expect(tag).toHaveClass('status-tag')
  })

  it('renders custom icon', () => {
    render(<StatusTag variant="online" icon={<span data-testid="custom-icon">●</span>} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('defaults to online variant when none specified', () => {
    render(<StatusTag />)
    expect(screen.getByText('在线')).toBeInTheDocument()
  })
})
