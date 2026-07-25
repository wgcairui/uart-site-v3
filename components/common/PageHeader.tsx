'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export interface BreadcrumbItem {
  title: string
  href?: string
}

/**
 * 主题变体
 * - `default`     → 现有浅色 Bento 视觉 (admin 端 + 兼容)
 * - `control-room`→ user 端专用暗色主题, 走 --cr-* token (2026-07-25)
 */
export type PageHeaderTheme = 'default' | 'control-room'

interface PageHeaderProps {
  /** 主标题 (可选, 跟 hero 冲突时可省略) */
  title?: ReactNode
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
  /**
   * 视觉主题 (2026-07-25):
   * - `default`      → 现有浅色视觉
   * - `control-room` → user 端暗色 (走 --cr-* token)
   */
  theme?: PageHeaderTheme
}

/**
 * 统一页面头部
 *
 * 视觉规则见 docs/style-guide.md §3.1：
 * - 主标题 text-2xl font-bold + 渐变分隔线
 * - 副标题 text-sm text-ink-500
 * - extra 按钮区右对齐
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  extra,
  back = false,
  onBack,
  meta,
  theme = 'default',
}: PageHeaderProps) {
  const router = useRouter()
  const handleBack = () => (onBack ? onBack() : router.back())

  const isCR = theme === 'control-room'
  const rootClass = isCR ? 'app-page-header-cr' : 'app-page-header'
  const titleClass = isCR ? 'app-page-header-cr-title' : 'app-page-header-title'
  const subtitleClass = isCR ? 'app-page-header-cr-subtitle' : 'app-page-header-subtitle'
  const extraClass = isCR ? 'app-page-header-cr-extra' : 'app-page-header-extra'
  const metaClass = isCR ? 'app-page-header-cr-meta' : 'app-page-header-meta'
  const backColor = isCR ? 'var(--cr-text-3)' : '#64748b'
  const navColor = isCR ? 'var(--cr-text-3)' : '#94a3b8'
  const breadcrumbLinkColor = isCR ? 'var(--cr-text-2)' : '#64748b'

  return (
    <header className={rootClass}>
      <div>
        {(breadcrumb?.length || back) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {back && (
              <a
                onClick={handleBack}
                style={{ cursor: 'pointer', color: backColor, fontSize: 13 }}
              >
                ← 返回
              </a>
            )}
            {breadcrumb?.length && (
              <nav style={{ fontSize: 12, color: navColor }}>
                {breadcrumb.map((b, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ margin: '0 8px' }}>/</span>}
                    {b.href ? (
                      <a
                        onClick={() => router.push(b.href!)}
                        style={{ color: breadcrumbLinkColor, cursor: 'pointer' }}
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
        {title && <h1 className={titleClass}>{title}</h1>}
        {subtitle && <p className={subtitleClass}>{subtitle}</p>}
        {meta && <div className={metaClass}>{meta}</div>}
      </div>
      {extra && <div className={extraClass}>{extra}</div>}
    </header>
  )
}

export default PageHeader