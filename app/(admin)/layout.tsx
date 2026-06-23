'use client'

import { AdminSider } from '@/components/layout/AdminSider'
import { AdminHeader } from '@/components/layout/AdminHeader'

/**
 * admin 端共用布局
 *
 * 视觉规则（方案 C）：
 * - flex 容器：左 Sider (240px) + 右主区 (Topbar + scroll 内容)
 * - 内容区 32px padding + bg-page 背景
 * - 不再用 antd Layout / Sider / Menu（避免深色风格冲突）
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AdminSider />
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AdminHeader />
        <main className="scroll-area">{children}</main>
      </div>
    </div>
  )
}