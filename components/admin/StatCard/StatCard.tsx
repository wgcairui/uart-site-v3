'use client';

import type { StatCardProps } from './StatCard.types';
import { StatCardFilter } from './StatCardFilter';
import { StatCardNavigate } from './StatCardNavigate';
import { StatCardDrilldown } from './StatCardDrilldown';

/**
 * StatCard — 3-variant discriminated union dispatcher
 *
 * 3 variant 共享 .stat-card 视觉 (跟 PageSummary 一致),
 * 行为差异通过 `kind` 字段在编译期保证.
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
 *
 * 编译期: 错用 `kind` 跟 prop 组合会 TS 报错, 阻止运行时 silent fail.
 * 例如 `kind="filter"` + `href` (navigate 字段) 会提示 "Object literal may only
 * specify known properties, and 'href' does not exist in type 'StatCardFilterProps'".
 *
 * 文件拆 .tsx 的原因: 这个文件用了 JSX, .ts 不支持.
 * 跟 ./index.ts (纯 re-export) 拆开, 避免 import 路径问题.
 */
export function StatCard(props: StatCardProps) {
  switch (props.kind) {
    case 'filter':
      return <StatCardFilter {...props} />;
    case 'navigate':
      return <StatCardNavigate {...props} />;
    case 'drilldown':
      return <StatCardDrilldown {...props} />;
  }
}
