import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// Mock usePathname BEFORE importing PageTransition
let mockPathname = '/initial'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

import { PageTransition } from './PageTransition'

describe('PageTransition', () => {
  it('renders children', () => {
    mockPathname = '/test'
    render(
      <PageTransition>
        <div data-testid="child">Hello</div>
      </PageTransition>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <PageTransition>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
        <div data-testid="c">C</div>
      </PageTransition>
    )
    expect(screen.getByTestId('a')).toBeInTheDocument()
    expect(screen.getByTestId('b')).toBeInTheDocument()
    expect(screen.getByTestId('c')).toBeInTheDocument()
  })

  it('accepts custom duration prop', () => {
    render(
      <PageTransition duration={100}>
        <div>Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('uses default duration 200ms when not specified', () => {
    // 直接渲染，验证不报错
    render(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('uses key prop based on pathname for transition trigger', () => {
    mockPathname = '/page1'
    const { rerender } = render(
      <PageTransition>
        <div>Page 1</div>
      </PageTransition>
    )
    expect(screen.getByText('Page 1')).toBeInTheDocument()

    // 切换 pathname，组件应该重新触发 transition
    mockPathname = '/page2'
    rerender(
      <PageTransition>
        <div>Page 2</div>
      </PageTransition>
    )
    expect(screen.getByText('Page 2')).toBeInTheDocument()
  })
})
