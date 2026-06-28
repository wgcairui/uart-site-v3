'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export interface BreadcrumbItem {
  title: string
  href?: string
}

interface PageHeaderProps {
  /** 主标题 */
  title: ReactNode
  /** 副标题 */
  subtitle?: ReactNode
  /** 面包屑（不含当前页） */
  breadcrumb?: BreadcrumbItem[]
  /** 右上角操作区 */
  extra?: ReactNode
  /** 显示返回按钮（默认 router.back()） */
  back?: boolean
  /** 覆盖 back 行为 */
  onBack?: () => void
  /**
   * 元信息区（KV grid 形式，渲染在 title 下面，border-top 分隔）
   *
   * 用法示例：
   *   meta={<div className="app-kv-grid">
   *     <div className="app-kv-cell"><span className="app-kv-label">类型</span><span>空调</span></div>
   *     <div className="app-kv-cell"><span className="app-kv-label">版本</span><span>v3</span></div>
   *   </div>}
   */
  meta?: ReactNode
}

/**
 * 统一页面头部
 *
 * 视觉规则见 docs/style-guide.md §3.1：
 * - 主标题 text-2xl font-bold + 渐变分隔线
 * - 副标题 text-sm text-ink-500
 * - extra 按钮区右对齐
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  extra,
  back = false,
  onBack,
  meta,
}: PageHeaderProps) {
  const router = useRouter()
  const handleBack = () => (onBack ? onBack() : router.back())

  return (
    <header className="app-page-header">
      <div>
        {(breadcrumb?.length || back) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {back && (
              <a
                onClick={handleBack}
                style={{ cursor: 'pointer', color: '#64748b', fontSize: 13 }}
              >
                ← 返回
              </a>
            )}
            {breadcrumb?.length && (
              <nav style={{ fontSize: 12, color: '#94a3b8' }}>
                {breadcrumb.map((b, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ margin: '0 8px' }}>/</span>}
                    {b.href ? (
                      <a
                        onClick={() => router.push(b.href!)}
                        style={{ color: '#64748b', cursor: 'pointer' }}
                      >
                        {b.title}
                      </a>
                    ) : (
                      <span>{b.title}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
        )}
        <h1 className="app-page-header-title">{title}</h1>
        {subtitle && <p className="app-page-header-subtitle">{subtitle}</p>}
        {meta && <div className="app-page-header-meta">{meta}</div>}
      </div>
      {extra && <div className="app-page-header-extra">{extra}</div>}
    </header>
  )
}

export default PageHeader