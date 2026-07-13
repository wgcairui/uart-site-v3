'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ADMIN_MENU, matchMenuKey } from '@/lib/constants/adminMenu'
import BrandLogo from '@/components/common/BrandLogo'

/**
 * 管理员端侧边栏 (v3 hybrid)
 *
 * 视觉: 深色玻璃风 (深紫渐变 + glass blur)
 * - 240px 宽，64px 折叠态
 * - 选中态: 紫粉渐变 + 白色文字 + pulse 圆点
 * - 折叠态只显示 icon + 渐变背景
 * - 跟 hybrid Page A 状态 bento 视觉统一
 */
export function AdminSider() {
  const pathname = usePathname()
  const selectedKey = matchMenuKey(pathname)
  const [collapsed, setCollapsed] = useState(false)

  const width = collapsed ? 72 : 220

  return (
    <aside
      className="app-sider-v3"
      style={{
        width,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        color: 'rgba(255, 255, 255, 0.9)',
        position: 'relative',
        transition: 'width .25s cubic-bezier(.4, 0, .2, 1)',
        boxShadow: '4px 0 24px -8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* Aurora glow */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: -50,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
          opacity: 0.15,
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          right: -50,
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, var(--brand-400) 0%, transparent 70%)',
          opacity: 0.18,
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      {/* 顶部: Logo + 折叠按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '20px 0' : '20px 20px',
          position: 'relative',
          zIndex: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-400) 100%)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.4)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              U
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>UART Server</div>
          </div>
        )}
        {collapsed && (
          <div
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-400) 100%)',
              color: '#fff', fontWeight: 700, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(139, 92, 246, .35)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            U
          </div>
        )}
      </div>

      {/* 折叠按钮 (浮动右上角) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? '展开' : '折叠'}
        style={{
          position: 'absolute',
          top: 22,
          right: -10,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          color: 'var(--brand-500)',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 20,
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* 菜单分组 */}
      <nav
        style={{
          flex: 1,
          padding: '12px 0',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {ADMIN_MENU.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div
                style={{
                  padding: '12px 20px 6px',
                  fontSize: 10,
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {group.title}
              </div>
            )}
            {group.child.map((item) => {
              const active = selectedKey === item.key
              return (
                <Link
                  key={item.key}
                  href={item.to}
                  className={`sider-menu-item-v3 ${active ? 'sider-menu-item-v3-active' : ''}`}
                  title={collapsed ? item.text : undefined}
                  style={
                    collapsed
                      ? { justifyContent: 'center', padding: '8px 0' }
                      : { padding: '8px 14px' }
                  }
                >
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 20,
                        borderRadius: '0 3px 3px 0',
                        background: 'linear-gradient(180deg, var(--brand-400) 0%, var(--accent-400) 100%)',
                        boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 16,
                      width: 20,
                      textAlign: 'center',
                      color: active ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {item.icon ?? '·'}
                  </span>
                  {!collapsed && (
                    <span
                      style={{
                        flex: 1,
                        color: active ? '#fff' : 'rgba(255, 255, 255, 0.85)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {item.text}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 底部版权 / 版本 */}
      {!collapsed && (
        <div
          style={{
            padding: '14px 20px',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontFamily: 'var(--font-mono)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          UART v3 · 2026
        </div>
      )}
    </aside>
  )
}

export default AdminSider
