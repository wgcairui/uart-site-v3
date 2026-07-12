'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AdminSider } from '@/components/layout/AdminSider'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageTransition } from '@/components/common/PageTransition'
import { IconFont } from '@/components/common/IconFont'
import { ADMIN_MENU, matchMenuKey } from '@/lib/constants/adminMenu'

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
 *
 * 移动端 (≤768px)：
 * - Sider 已被 globals.css 移出屏幕 (left: -240px)
 * - 右上角加 hamburger 按钮 (admin-topbar-hamburger) 触发抽屉
 * - 抽屉 (admin-mobile-drawer) 列出全部 16 个 admin 菜单项
 * - 跟 user 端 (user-topbar-hamburger / user-mobile-drawer) 1:1 对称
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const selectedKey = matchMenuKey(pathname)

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

      {/* 移动端 hamburger 按钮 (mobile 可见, desktop 隐藏) */}
      <button
        className="admin-topbar-hamburger"
        onClick={() => setMobileNavOpen(true)}
        aria-label="menu"
      >
        <IconFont type="icon-changjingguanli" />
      </button>

      {/* 移动端菜单抽屉 */}
      {mobileNavOpen && (
        <>
          <div
            className="admin-mobile-drawer-mask"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="admin-mobile-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>管理菜单</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="close"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-700)', lineHeight: 1, padding: 4 }}
              >×</button>
            </div>
            {ADMIN_MENU.map((group) => (
              <div key={group.title} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    padding: '8px 14px 4px',
                    fontSize: 10,
                    color: 'var(--ink-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {group.title}
                </div>
                {group.child.map((item) => {
                  const active = selectedKey === item.key
                  return (
                    <a
                      key={item.key}
                      onClick={() => {
                        setMobileNavOpen(false)
                        router.push(item.to)
                      }}
                      className={`admin-mobile-drawer-item ${active ? 'active' : ''}`}
                    >
                      <span style={{ fontSize: 16, width: 20, textAlign: 'center', display: 'inline-flex' }}>
                        {item.icon ?? '·'}
                      </span>
                      <span style={{ flex: 1 }}>{item.text}</span>
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </ErrorBoundary>
  )
}
