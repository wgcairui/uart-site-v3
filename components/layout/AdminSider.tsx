'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ADMIN_MENU, matchMenuKey } from '@/lib/constants/adminMenu'
import BrandLogo from '@/components/common/BrandLogo'

/**
 * 管理员端侧边栏
 *
 * 视觉规则（方案 C）：
 * - 白底 + ink-100 右边框（替代旧 antd Layout.Sider 黑底）
 * - 240px 宽，64px 折叠态
 * - 选中态：品牌渐变背景 + indigo 文字 + 左边框高亮
 * - 折叠态只显示 icon
 *
 * 替代 antd Menu / Layout.Sider，避免深色风格与新视觉冲突。
 */
export function AdminSider() {
  const pathname = usePathname()
  const selectedKey = matchMenuKey(pathname)
  const [collapsed, setCollapsed] = useState(false)

  const width = collapsed ? 64 : 200

  return (
    <aside
      className="app-sider"
      style={{
        width,
        transition: 'width .25s cubic-bezier(.4, 0, .2, 1)',
        position: 'relative',
      }}
    >
      {/* 顶部：Logo + 折叠按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '16px 0' : 0,
          borderBottom: '1px solid var(--ink-100)',
        }}
      >
        {!collapsed && <BrandLogo href="/admin" />}
        {collapsed && (
          <div
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#fff', fontWeight: 700, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(99,102,241,.25)',
            }}
          >
            U
          </div>
        )}
      </div>

      {/* 折叠按钮（浮动在右上角） */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? '展开' : '折叠'}
        style={{
          position: 'absolute',
          top: 18,
          right: -10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid var(--ink-100)',
          color: 'var(--ink-500)',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(15,23,42,.06)',
          zIndex: 10,
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* 菜单分组 */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {ADMIN_MENU.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="sider-menu-group-label">{group.title}</div>
            )}
            {group.child.map((item) => {
              const active = selectedKey === item.key
              return (
                <Link
                  key={item.key}
                  href={item.to}
                  className={`sider-menu-item ${active ? 'sider-menu-item-active' : ''}`}
                  title={collapsed ? item.text : undefined}
                  style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : undefined}
                >
                  <span className="sider-menu-icon">{item.icon ?? '·'}</span>
                  {!collapsed && <span>{item.text}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 底部版权 / 版本 */}
      {!collapsed && (
        <div style={{ padding: 16, fontSize: 11, color: 'var(--ink-300)', borderTop: '1px solid var(--ink-100)' }}>
          UART v3 · 2026
        </div>
      )}
    </aside>
  )
}

export default AdminSider