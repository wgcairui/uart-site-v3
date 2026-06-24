import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom')
  return <div>正常内容</div>
}

describe('ErrorBoundary', () => {
  // suppress React 错误日志（避免测试输出噪音）
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('shows error.message in fallback', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('reset button attempts to clear error state', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    // antd Button 把 "重试" 文字包在多层 span 里，用 closest('button') 找
    const retryBtn = screen.getByText('重试').closest('button') as HTMLElement
    fireEvent.click(retryBtn)
    // 验证：error 仍显示 + console.error 被调用
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={(err) => <div>自定义: {err.message}</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('自定义: boom')).toBeInTheDocument()
  })
})
