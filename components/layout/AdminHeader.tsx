'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { UserDropDown } from '@/components/common/UserDropdown'

const SEGMENT_LABELS: Record<string, string> = {
  admin: '后台',
  main: '前台',
  node: '节点管理',
  protocols: '协议管理',
  devmodel: '设备类型',
  nodes: '节点管理',
  terminal: '终端管理',
  user: '用户管理',
  log: '日志',
  alarm: '告警',
  mail: '邮件',
  sms: '短信',
  data: '数据',
  wx: '微信',
  users: '公众号用户',
  oss: 'OSS',
  redis: 'Redis',
  info: '详情',
  addterminal: '添加终端',
  userinfo: '用户信息',
  // PR-2 (2026-07-17): AI 生成页从 /admin/ai/generate 搬到 /admin/node/protocols/generate
  // 自动面包屑最后一段映射为「AI 生成」(跟 menu 文本对齐)
  generate: 'AI 生成',
}

/**
 * 管理员端顶栏
 *
 * 视觉规则（方案 C）：
 * - 半透明白底 + backdrop-filter blur（滚动时有层次）
 * - 左侧面包屑（中文映射）
 * - 右侧 UserDropDown
 */
export function AdminHeader() {
  const pathname = usePathname()

  const crumbs = useMemo(() => {
    const segs = pathname.split('/').filter(Boolean)
    return segs.map((seg, i, arr) => ({
      label: SEGMENT_LABELS[seg] ?? seg,
      href: i === arr.length - 1 ? undefined : `/${arr.slice(0, i + 1).join('/')}`,
    }))
  }, [pathname])

  // 当前页 (面包屑最后一段) — mobile 端用, desktop 隐藏
  const currentTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1].label : ''

  return (
    <header className="app-topbar">
      {/* Desktop: 完整面包屑 (多段) */}
      <nav className="admin-topbar-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 0, overflow: 'hidden' }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: 'var(--ink-300)' }}>/</span>}
            <span
              style={{
                color: c.href ? 'var(--ink-500)' : 'var(--ink-900)',
                fontWeight: c.href ? 400 : 500,
                cursor: c.href ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Mobile: 单段当前页 (避免完整面包屑被挤变形) */}
      <span className="admin-topbar-current-title" style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--ink-900)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
        minWidth: 0,
      }}>
        {currentTitle}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <UserDropDown />
      </div>
    </header>
  )
}

export default AdminHeader