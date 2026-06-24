'use client'

import { Children, type ReactNode, isValidElement, cloneElement } from 'react'

interface StaggerListProps {
  children: ReactNode
  /** 间隔 (ms)，每项延迟 = index × interval (默认 50) */
  interval?: number
  /** 单项过渡时长 (ms，默认 250) */
  duration?: number
  /** 最大 stagger 项数（超出后不再延迟，默认 12） */
  maxStagger?: number
}

/**
 * 列表 stagger 进入动画 — 包装 children
 *
 * 用法：
 *   <StaggerList>
 *     {items.map(it => <Card key={it.id}>...</Card>)}
 *   </StaggerList>
 *
 * 行为：
 * - 第一个子元素立即进入
 * - 之后每个延迟 = index × interval
 * - 每项 fade + translateY(8px → 0)
 * - 超出 maxStagger 不再延迟（避免长列表卡顿）
 *
 * 视觉规范见 docs/style-guide.md §2.6：
 * - 禁用自动播放/旋转
 * - 单项 ≤ 300ms
 * - cubic-bezier(.4, 0, .2, 1)
 *
 * 注意：依赖子组件有 `key` prop 让 React 正确识别身份
 */
export function StaggerList({
  children,
  interval = 50,
  duration = 250,
  maxStagger = 12,
}: StaggerListProps) {
  const arr = Children.toArray(children)

  return (
    <>
      {arr.map((child, i) => {
        const delay = Math.min(i, maxStagger) * interval
        if (!isValidElement(child)) return child
        // 注入 style.animationDelay（不破坏已有 style）
        const existing = (child.props as { style?: React.CSSProperties }).style ?? {}
        const merged: React.CSSProperties = {
          ...existing,
          animation: `stagger-in ${duration}ms cubic-bezier(.4, 0, .2, 1) both`,
          animationDelay: `${delay}ms`,
        }
        return cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
          style: merged,
        })
      })}
      <style jsx global>{`
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

export default StaggerList
