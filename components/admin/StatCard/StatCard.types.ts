'use client';

import type { ReactNode } from 'react';
import type { SummaryVariant } from '@/lib/utils/designTokens';

/**
 * StatCard 3-variant discriminated union
 *
 * 3 个 actionable types, 互斥 (用 `kind` 区分, 编译期阻止混用):
 * - filter:    点击 = 切换 query filter (跟 PageSummary 的 onClick + active 等价, 但语义显式)
 * - navigate:  点击 = 跳转到详情/列表页 (用 next/router 走 SSR prefetch)
 * - drilldown: hover/click 弹 Popover 显示明细 (mini chart / top list / 时间桶)
 *
 * ~~action~~ variant (passive number + 卡片底部 1-3 个 action button, 2026-07-24 计划
 * 列入) 在 W3 review 阶段被 A+C 一致判定为 dead: 跨 6 PR 10 page 统计 kind 分布
 * filter:25 / drilldown:11 / navigate:10 / action:0. 实际场景里"卡内 destructive 批量操作"
 * 全部走 PageHeader.extra / Drawer footer, 没人用 card 底部 button. 删.
 *
 * 配对: types/admin-summary.ts (7 个 BFF 响应类型)
 * 配对: docs/components.md §3.3 (StatCard family review checklist)
 *
 * 设计原则:
 * - PageSummary 100% 不变 (向后兼容, 30+ 现存调用方零影响)
 * - 3 variant 共享 .stat-card CSS 视觉 (跟 PageSummary 一致)
 * - 3 variant 必须用 `kind` 显式声明, TS 编译期保证 prop 互斥
 * - 每个 variant 的 prop 集合最小化, 不引入通用 field
 *
 * 不在本期:
 * - realtime push (SSE / socket.io broadcast of stat updates). 60s Redis cache + 手动 refresh 足够 admin overview
 * - 可拖拽排序. StatCard 在 PageSummary row 里渲染, 由 PageSummary 决定布局
 */

interface StatCardBase {
  label: string;
  value: ReactNode;
  extra?: ReactNode;
  icon?: ReactNode;
  variant?: SummaryVariant;
  color?: string;
  /** 加载中: 卡片显示 skeleton */
  loading?: boolean;
  /** 错误信息: 卡片显示 "—" + warning border */
  error?: string;
}

// ---------------------------------------------------------------------------
// 1. Filter variant
// ---------------------------------------------------------------------------

/**
 * 点击 = 切换 query filter
 *
 * 多选叠加: `active` 由调用方根据当前 filter state 计算
 * (跟现有 PageSummary `onClick` + `active` 模式等价, 但 type 显式)
 *
 * 用法:
 * ```tsx
 * <StatCard
 *   kind="filter"
 *   label="未处理告警"
 *   value={12}
 *   variant="danger"
 *   active={statFilter.includes('unconfirmed')}
 *   onToggle={() => setStatFilter(toggle('unconfirmed'))}
 * />
 * ```
 */
export interface StatCardFilterProps extends StatCardBase {
  kind: 'filter';
  active: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// 2. Navigate variant
// ---------------------------------------------------------------------------

/**
 * 点击 = 跳转到详情/列表页 (next/router.push)
 *
 * 跟 filter 区别: filter 改当前页 query, navigate 离开当前页
 * 用 Link wrapper 走 SSR prefetch (next/link 比 router.push 快)
 *
 * 用法:
 * ```tsx
 * <StatCard
 *   kind="navigate"
 *   label="离线设备"
 *   value={12}
 *   variant="warning"
 *   href="/admin/node/terminal?status=offline"
 * />
 * ```
 */
export interface StatCardNavigateProps extends StatCardBase {
  kind: 'navigate';
  href: string;
  /** 可选: 跳转前 hook (用于埋点 / 二次确认) */
  beforeNavigate?: () => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// 3. Drilldown variant
// ---------------------------------------------------------------------------

/**
 * hover/click 弹 Popover 显示明细
 *
 * 明细可以是 mini chart / top list / 时间桶分布
 * `data` 是预加载数据 (避免 popover 打开时再 fetch), 由 page 层 useDashboardStat 注入
 *
 * 用法:
 * ```tsx
 * <StatCard
 *   kind="drilldown"
 *   label="告警中"
 *   value={unconfirmed}
 *   variant="danger"
 *   trigger="hover"
 *   data={severityDistribution}
 *   popoverContent={(ctx) => (
 *     <MiniBar data={ctx.data as AlarmSeverityItem[]} />
 *   )}
 * />
 * ```
 */
export interface StatCardDrilldownProps extends StatCardBase {
  kind: 'drilldown';
  /** Render-prop: popover 内容收到当前 value + data 上下文 */
  popoverContent: (ctx: { value: ReactNode; data?: unknown }) => ReactNode;
  /** 预加载数据, page 层 useDashboardStat 注入 */
  data?: unknown;
  /** 触发方式 (默认 click — accessibility 友好) */
  trigger?: 'hover' | 'click';
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type StatCardProps =
  | StatCardFilterProps
  | StatCardNavigateProps
  | StatCardDrilldownProps;
