import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MyCopy } from './MyCopy'

describe('MyCopy', () => {
  beforeEach(() => {
    document.execCommand = vi.fn().mockReturnValue(true)
  })

  it('renders the value as text', () => {
    render(<MyCopy value="hello" />)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('does not show copy icon when value length <= 5', () => {
    const { container } = render(<MyCopy value="abc" />)
    // 长度 3 不渲染 CopyOutlined
    expect(container.querySelector('.anticon-copy')).not.toBeInTheDocument()
  })

  it('shows copy icon when value length > 5', () => {
    const { container } = render(<MyCopy value="hello world" />)
    expect(container.querySelector('.anticon-copy')).toBeInTheDocument()
  })

  it('clicking copy icon calls execCommand("copy")', () => {
    const { container } = render(<MyCopy value="hello world" />)
    const copyIcon = container.querySelector('.anticon-copy') as HTMLElement
    fireEvent.click(copyIcon)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('shows ie icon for http urls', () => {
    const { container } = render(<MyCopy value="http://example.com" />)
    expect(container.querySelector('.anticon-ie')).toBeInTheDocument()
  })

  it('shows ie icon for HTML strings', () => {
    const { container } = render(<MyCopy value="<div>html</div>" />)
    expect(container.querySelector('.anticon-ie')).toBeInTheDocument()
  })
})
