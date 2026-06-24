'use client'

import { Skeleton } from 'antd'

type Variant = 'table' | 'card' | 'list' | 'paragraph'

interface AppSkeletonProps {
  /** 占位类型 */
  variant?: Variant
  /** 表格列数（variant=table 时有效） */
  columns?: number
  /** 表格行数（variant=table 时有效） */
  rows?: number
  /** 卡片网格数（variant=card 时有效） */
  cardCount?: number
  /** 列表项数（variant=list 时有效） */
  listCount?: number
  /** 段落行数（variant=paragraph 时有效） */
  paragraphRows?: number
}

/**
 * 统一骨架屏 — 业务组件
 *
 * 4 种 variant：
 * - table: 表格占位（默认 4 列 × 6 行）
 * - card: 卡片网格占位（默认 4 张）
 * - list: 列表项占位（默认 5 行）
 * - paragraph: 段落占位（默认 3 行）
 *
 * 比 `<Spin>` 体验更好 — 用户能看到内容结构，提升感知性能。
 *
 * 何时用：
 * - 首屏数据加载（比 Spin 更友好）
 * - 表格分页/筛选时（避免全屏 spinner）
 * - 详情页内容加载
 *
 * 何时用 Spin：
 * - 按钮内联加载
 * - 局部区域刷新（< 300ms 的快速操作）
 */
export function AppSkeleton({
  variant = 'table',
  columns = 4,
  rows = 6,
  cardCount = 4,
  listCount = 5,
  paragraphRows = 3,
}: AppSkeletonProps) {
  switch (variant) {
    case 'table':
      return <Skeleton active paragraph={{ rows, width: Array.from({ length: columns }, () => '60%') }} />
    case 'card':
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
            gap: 20,
          }}
        >
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      )
    case 'list':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: listCount }).map((_, i) => (
            <Skeleton key={i} active paragraph={{ rows: 1 }} />
          ))}
        </div>
      )
    case 'paragraph':
      return <Skeleton active paragraph={{ rows: paragraphRows }} />
    default:
      return <Skeleton active />
  }
}

export default AppSkeleton
