import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StaggerList } from './StaggerList'

describe('StaggerList', () => {
  it('renders children', () => {
    render(
      <StaggerList>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
        <div data-testid="c">C</div>
      </StaggerList>
    )
    expect(screen.getByTestId('a')).toBeInTheDocument()
    expect(screen.getByTestId('b')).toBeInTheDocument()
    expect(screen.getByTestId('c')).toBeInTheDocument()
  })

  it('injects animation into each child', () => {
    render(
      <StaggerList>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
      </StaggerList>
    )
    const a = screen.getByTestId('a')
    const b = screen.getByTestId('b')
    // 都应包含 stagger-in 动画
    expect((a as HTMLElement).style.animation).toContain('stagger-in')
    expect((b as HTMLElement).style.animation).toContain('stagger-in')
  })

  it('first child has 0ms delay, second has interval ms delay', () => {
    render(
      <StaggerList interval={50}>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
        <div data-testid="c">C</div>
      </StaggerList>
    )
    expect((screen.getByTestId('a') as HTMLElement).style.animationDelay).toBe('0ms')
    expect((screen.getByTestId('b') as HTMLElement).style.animationDelay).toBe('50ms')
    expect((screen.getByTestId('c') as HTMLElement).style.animationDelay).toBe('100ms')
  })

  it('caps stagger at maxStagger', () => {
    render(
      <StaggerList interval={50} maxStagger={2}>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
        <div data-testid="c">C</div>
        <div data-testid="d">D</div>
      </StaggerList>
    )
    // 超过 maxStagger=2 后不再延迟
    expect((screen.getByTestId('c') as HTMLElement).style.animationDelay).toBe('100ms')
    expect((screen.getByTestId('d') as HTMLElement).style.animationDelay).toBe('100ms')
  })

  it('respects custom duration', () => {
    render(
      <StaggerList duration={500}>
        <div data-testid="a">A</div>
      </StaggerList>
    )
    expect((screen.getByTestId('a') as HTMLElement).style.animation).toContain('500ms')
  })

  it('preserves existing child style', () => {
    render(
      <StaggerList>
        <div data-testid="a" style={{ marginTop: 8 }}>A</div>
      </StaggerList>
    )
    const a = screen.getByTestId('a') as HTMLElement
    expect(a.style.marginTop).toBe('8px')
    expect(a.style.animation).toContain('stagger-in')
  })
})
