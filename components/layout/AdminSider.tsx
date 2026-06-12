'use client'
import { Layout, Menu } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { ADMIN_MENU, ADMIN_DEFAULT_OPEN_KEYS, matchMenuKey } from '@/lib/constants/adminMenu'

const { Sider } = Layout

interface AdminSiderProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

/**
 * 管理员端侧边栏
 * 折叠态受控（响应式断点由父 layout 管理）
 */
export function AdminSider({ collapsed, onCollapse }: AdminSiderProps) {
  const pathname = usePathname()

  const menuItems = useMemo(
    () =>
      ADMIN_MENU.map((group) => ({
        key: group.title,
        label: group.title,
        children: group.child.map((item) => ({
          key: item.key,
          label: <Link href={item.to}>{item.text}</Link>,
        })),
      })),
    [],
  )

  const selectedKey = matchMenuKey(pathname)

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
      width={200}
      collapsedWidth={64}
      className="site-layout-background"
      style={{ backgroundColor: '#011529', marginRight: 24, overflow: 'auto' }}
    >
      {!collapsed && (
        <div style={{ padding: 12 }}>
          <Link href="/admin">
            <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>百事服管理后台</h2>
          </Link>
        </div>
      )}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={ADMIN_DEFAULT_OPEN_KEYS}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}