'use client'

import { Empty, Button } from 'antd'
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
 */
export function EmptyState({
  description = '暂无数据',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  icon,
  minHeight = 360,
}: EmptyStateProps) {
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
      {icon ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" />}
      <div style={{ fontSize: 14, color: 'var(--ink-500)' }}>{description}</div>
      {(actionLabel || secondaryLabel) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {actionLabel && onAction && (
            <Button type="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button onClick={onSecondary}>{secondaryLabel}</Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
