'use client';

import Link from 'next/link';
import { ArrowRightOutlined } from '@ant-design/icons';
import { StatCardShell } from './StatCard.base';
import type { StatCardNavigateProps } from './StatCard.types';

/**
 * Navigate variant — 点击 = 跳转到详情/列表页
 *
 * 用 next/link 走 SSR prefetch, 比 router.push 快首屏.
 * 可选 beforeNavigate hook 给二次确认 / 埋点用.
 *
 * 适用: 跳到子列表 / 详情页 (例如 "离线设备 12" → /admin/node/terminal?status=offline).
 * 不适用: 改当前页 filter (用 filter variant).
 */
export function StatCardNavigate(props: StatCardNavigateProps) {
  const { kind: _kind, href, beforeNavigate, ...rest } = props;

  return (
    <StatCardShell
      {...rest}
      clickable
      wrapper={(card) => (
        <Link
          href={href}
          onClick={async (e) => {
            if (beforeNavigate) {
              const result = beforeNavigate();
              if (result instanceof Promise) {
                e.preventDefault();
                await result;
                // hook 不主动跳转, 留给 next/link 默认行为
              }
            }
          }}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div style={{ position: 'relative' }}>
            {card}
            <ArrowRightOutlined
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            />
          </div>
        </Link>
      )}
    />
  );
}
