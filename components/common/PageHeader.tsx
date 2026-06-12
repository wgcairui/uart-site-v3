'use client'
import { Breadcrumb } from 'antd'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export interface BreadcrumbItem {
  title: string
  href?: string
}

interface PageHeaderProps {
  title: ReactNode
  /** 面包屑（不含当前页）；不传则只有标题 */
  breadcrumb?: BreadcrumbItem[]
  /** 右上角操作按钮区 */
  extra?: ReactNode
  /** 显示返回按钮 + 默认回 history.back() */
  back?: boolean
  /** 覆盖 back 按钮行为 */
  onBack?: () => void
}

/**
 * 统一页面头部
 * - 标题（大字号 + 粗体）
 * - 可选面包屑
 * - 可选返回按钮
 * - 右上 extra 操作区
 */
export function PageHeader({ title, breadcrumb, extra, back = false, onBack }: PageHeaderProps) {
  const router = useRouter()
  const handleBack = () => (onBack ? onBack() : router.back())

  return (
    <div style={{ marginBottom: 16 }}>
      {(breadcrumb?.length || back) && (
        <div style={{ marginBottom: 8 }}>
          {back && (
            <a onClick={handleBack} style={{ marginRight: 12, cursor: 'pointer' }}>
              ← 返回
            </a>
          )}
          {breadcrumb?.length ? (
            <Breadcrumb
              items={breadcrumb.map((b) => ({
                title: b.href ? <a onClick={() => router.push(b.href!)}>{b.title}</a> : b.title,
              }))}
            />
          ) : null}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h2>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  )
}