'use client';

import { StatCardShell } from './StatCard.base';
import type { StatCardFilterProps } from './StatCard.types';

/**
 * Filter variant — 点击 = 切换 query filter
 *
 * 跟 PageSummary 的 `onClick` + `active` 模式 1:1 等价,
 * 但 type 显式声明, 编译期保证语义.
 *
 * 适用: statFilter 多选叠加筛选 (例如 alerts/queue 的 status 切卡).
 * 不适用: 跳页 (用 navigate variant) / 弹明细 (用 drilldown variant).
 */
export function StatCardFilter(props: StatCardFilterProps) {
  const { kind: _kind, ...rest } = props;
  return (
    <StatCardShell
      {...rest}
      clickable
      active={props.active}
      onClick={props.onToggle}
    />
  );
}
