'use client';

import { Button, Space } from 'antd';
import { StatCardShell } from './StatCard.base';
import type { StatCardActionProps } from './StatCard.types';

/**
 * Action variant — passive number + 卡片底部 1-3 个 action button
 *
 * 适用: destructive bulk 操作 (例如 alerts/queue 的 "全部批准" / "全部拒绝",
 * 已用 PageHeader.extra 实现了; 这种 variant 适用于把 action 直接钉在 card 底部).
 *
 * 注意: action button 在 card 内部, 点击会冒泡到 card onClick — 所以 StatCardShell
 * 渲染 footer 时停止冒泡.
 */
export function StatCardAction(props: StatCardActionProps) {
  const { kind: _kind, actions, ...rest } = props;
  return (
    <StatCardShell
      {...rest}
      footer={
        <Space
          size={4}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', flexWrap: 'wrap' }}
        >
          {actions.map((a) => (
            <Button
              key={a.key}
              size="small"
              type={a.danger ? 'primary' : 'default'}
              {...(a.danger !== undefined ? { danger: a.danger } : {})}
              {...(a.icon !== undefined ? { icon: a.icon } : {})}
              {...(a.loading !== undefined ? { loading: a.loading } : {})}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
            >
              {a.label}
            </Button>
          ))}
        </Space>
      }
    />
  );
}
