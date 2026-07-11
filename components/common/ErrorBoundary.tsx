'use client'

import { Component, type ReactNode } from 'react'
import { Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { BRAND, GRADIENT } from '@/lib/utils/designTokens'

interface Props {
  children: ReactNode
  /** fallback 渲染（默认用内置 FallbackUI） */
  fallback?: (err: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界 — 捕获子组件树渲染时的 JS 错误
 *
 * 接入位置：(user)/layout.tsx、(admin)/layout.tsx 顶层
 * 上报：console.error（生产可接 Sentry / 自家 logger）
 *
 * ⚠️ 只能捕获 **render 阶段** 的错误，不能捕获：
 * - 事件回调中的 throw（用 try/catch）
 * - 异步代码（setTimeout / Promise rejection）
 * - SSR 阶段（layout 顶层在 Client Component 即可）
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }
    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset)
    }
    return <DefaultFallback error={this.state.error} reset={this.reset} />
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 360,
        padding: 48,
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        ⚠
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>
        页面出错了
      </div>
      <div
        style={{
          maxWidth: 480,
          fontSize: 13,
          color: 'var(--ink-500)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          background: 'var(--ink-50)',
          padding: '8px 12px',
          borderRadius: 8,
          wordBreak: 'break-word',
        }}
      >
        {error.message || String(error)}
      </div>
      <Button
        type="primary"
        icon={<ReloadOutlined />}
        onClick={reset}
        style={{
          marginTop: 8,
          background: GRADIENT.brand,
          border: 'none',
        }}
      >
        重试
      </Button>
    </div>
  )
}

export default ErrorBoundary
