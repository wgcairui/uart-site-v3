import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionTitle } from './SectionTitle'

describe('SectionTitle', () => {
  it('renders title text', () => {
    render(<SectionTitle title="设备列表" />)
    expect(screen.getByText('设备列表')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<SectionTitle title="标题" icon={<span data-testid="icon">📊</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render icon span when not provided', () => {
    const { container } = render(<SectionTitle title="标题" />)
    expect(container.querySelector('.app-section-title-icon')).not.toBeInTheDocument()
  })

  it('renders extra on the right', () => {
    render(
      <SectionTitle
        title="标题"
        extra={<button>更多</button>}
      />
    )
    expect(screen.getByRole('button', { name: '更多' })).toBeInTheDocument()
  })

  it('applies app-section-title class', () => {
    const { container } = render(<SectionTitle title="标题" />)
    expect(container.querySelector('.app-section-title')).toBeInTheDocument()
  })
})
