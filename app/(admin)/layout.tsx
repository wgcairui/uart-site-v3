'use client'

import { AdminSider } from '@/components/layout/AdminSider'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageTransition } from '@/components/common/PageTransition'

/**
 * admin 端共用布局
 *
 * 视觉规则（方案 C）：
 * - flex 容器：左 Sider (240px) + 右主区 (Topbar + scroll 内容)
 * - 内容区 32px padding + bg-page 背景
 * - 不再用 antd Layout / Sider / Menu（避免深色风格冲突）
 *
 * 错误兜底：顶层 ErrorBoundary，子组件 JS 错误时显示 fallback
 * 动画：PageTransition 在 pathname 变化时做 200ms fade
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <AdminSider />
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AdminHeader />
          <main className="scroll-area">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}