'use client';

import { Popover } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { StatCardShell } from './StatCard.base';
import type { StatCardDrilldownProps } from './StatCard.types';

/**
 * Drilldown variant — hover/click 弹 Popover 显示明细
 *
 * 适用: 明细数据比单一数字更值得看 (例如 "告警 12" hover 显示 "critical 3 / warning 9"
 * 或 "Top 5 mac 列表" 或 "24h trend 迷你图").
 *
 * 触发方式:
 * - `trigger="click"` (默认): accessibility 友好, 移动端 tap 也能用
 * - `trigger="hover"`: 桌面端更顺手, 但移动端无 hover 不友好
 *
 * 配 page: `data` 字段由 page 层 useDashboardStat 预加载, popover 打开时不重新 fetch.
 */
export function StatCardDrilldown(props: StatCardDrilldownProps) {
  const {
    kind: _kind,
    popoverContent,
    data,
    trigger = 'click',
    value,
    ...rest
  } = props;

  return (
    <StatCardShell
      {...rest}
      clickable
      value={value}
      wrapper={(card) => (
        <Popover
          trigger={trigger}
          placement="top"
          content={popoverContent({ value, data })}
        >
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            {card}
            <DownOutlined
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            />
          </div>
        </Popover>
      )}
    />
  );
}
