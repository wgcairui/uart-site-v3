'use client'

import { Empty } from 'antd'
import { Button } from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** 主描述（一句话说明） */
  description?: ReactNode
  /** 操作按钮文案 */
  actionLabel?: string
  /** 操作按钮点击 */
  onAction?: () => void
  /** 副操作按钮文案 */
  secondaryLabel?: string
  /** 副操作按钮点击 */
  onSecondary?: () => void
  /** 自定义图标 (默认 antd Empty 默认图) */
  icon?: ReactNode
  /** 高度（默认 360，居中显示） */
  minHeight?: number
  /** 兼容 antd Empty 的 className 透传 (2026-07-25) */
  className?: string
  /**
   * 视觉主题 (2026-07-25)
   * - `default`     → 现有浅色视觉
   * - `control-room`→ user 端暗色, 走 --cr-* token
   */
  theme?: 'default' | 'control-room'
}

/**
 * 统一空状态 — 业务组件
 *
 * 比 antd `<Empty>` 多：
 * - 主操作按钮（"该去哪儿/该点哪个"）
 * - 副操作按钮（次要路径）
 * - 统一最小高度
 *
 * 何时用：
 * - 列表查询无数据
 * - 表单未填写 / 未选中
 * - 路由参数不完整
 *
 * 视觉规范见 docs/style-guide.md §4。
 *
 * theme="control-room" 走 --cr-* token (user 端 2026-07-25)
 */
export function EmptyState({
  description = '暂无数据',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  icon,
  minHeight = 360,
  className,
  theme = 'default',
}: EmptyStateProps) {
  const isCR = theme === 'control-room'
  const descColor = isCR ? 'var(--cr-text-3)' : 'var(--ink-500)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        padding: 48,
        gap: 16,
      }}
    >
      {icon ?? (
        <Empty
          {...(isCR ? { className: `v3-empty-cr ${className ?? ''}`.trim() } : className ? { className } : {})}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description=""
        />
      )}
      <div style={{ fontSize: 14, color: descColor }}>{description}</div>
      {(actionLabel || secondaryLabel) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {actionLabel && onAction && (
            <Button theme={theme} variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button theme={theme} onClick={onSecondary}>{secondaryLabel}</Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
