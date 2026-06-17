'use client'
import { Breadcrumb } from 'antd'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { UserDropDown } from '@/components/common/UserDropdown'

/**
 * 管理员端顶栏
 * 面包屑（来自 pathname）+ 用户菜单
 */
export function AdminHeader() {
  const pathname = usePathname()

  const crumbs = useMemo(() => {
    return pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
      title: seg,
      // 最后一段不渲染链接（当前页）
      href: i === arr.length - 1 ? undefined : `/${arr.slice(0, i + 1).join('/')}`,
    }))
  }, [pathname])

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        flexShrink: 0,
        minHeight: 64,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Breadcrumb items={crumbs.map((c) => ({ title: c.href ? <a href={c.href}>{c.title}</a> : c.title }))} />
      <span style={{ marginLeft: 'auto' }}>
        <UserDropDown />
      </span>
    </header>
  )
}