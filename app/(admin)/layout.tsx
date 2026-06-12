'use client'
import { Layout } from 'antd'
import { useState } from 'react'
import './admin-layout.css'
import { AdminSider } from '@/components/layout/AdminSider'
import { AdminHeader } from '@/components/layout/AdminHeader'

/**
 * admin 端共用布局
 * - Sider 可折叠（lg 断点自动折叠）
 * - Header 含面包屑 + 用户菜单
 * - Content 区域统一 padding/背景
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AdminSider collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AdminHeader />
        <div className="content" style={{ overflow: 'auto', flex: 1, marginBottom: 24 }}>
          {children}
        </div>
      </Layout>
    </Layout>
  )
}