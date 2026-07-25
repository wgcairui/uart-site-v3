'use client';

import type { ReactNode } from 'react';
import {
  VARIANT_TO_TAILWIND_BG,
  type SummaryVariant,
} from '@/lib/utils/designTokens';

function resolveColor(variant?: SummaryVariant, color?: string): string {
  return color ?? (variant ? `var(--color-${variant})` : 'var(--color-primary)');
}

/**
 * StatCard shared shell — 跟 PageSummary 的 .stat-card CSS 视觉一致
 *
 * 4 variant 都用同一个 shell 渲染 label / value / extra / icon 区,
 * 只在 footer / 交互层做差异化 (filter 高亮 outline / navigate 包 Link /
 * action footer button / drilldown 包 Popover).
 *
 * 视觉规则 (跟 PageSummary 对齐, docs/style-guide.md §3.2):
 * - rounded-2xl + shadow-sm + hover lift (4 variant 通用)
 * - 右上角图标 40×40 rounded-xl + bg-{variant}-50
 * - 主数值 text-3xl font-bold + tabular-nums
 * - 副标签 text-xs 方向用 semantic 色
 *
 * 替代方案: 直接复用 PageSummary 组件, 但 PageSummary 不导出 internal renderer,
 *   4 variant 改写需要 export 一次. 维护成本高于复制 50 行 shell.
 *   当前实现: 复制 50 行 shell, 共享 .stat-card CSS class 保持视觉一致.
 */
export interface StatCardShellProps {
  label: string;
  value: ReactNode;
  extra?: ReactNode;
  icon?: ReactNode;
  variant?: SummaryVariant;
  color?: string;
  loading?: boolean;
  error?: string;
  /** 启用 hover cursor: pointer (filter / navigate / drilldown 用) */
  clickable?: boolean;
  /** 选中态 outline + bg (filter variant 用) */
  active?: boolean;
  /** 卡片整体 onClick (filter / navigate 用) */
  onClick?: () => void;
  /** footer slot (action variant 用) */
  footer?: ReactNode;
  /** 最外层包装 (Link / Popover 等) */
  wrapper?: (children: ReactNode) => ReactNode;
}

export function StatCardShell({
  label,
  value,
  extra,
  icon,
  variant = 'primary',
  color,
  loading,
  error,
  clickable,
  active,
  onClick,
  footer,
  wrapper,
}: StatCardShellProps) {
  const resolvedColor = resolveColor(variant, color);
  const bgColor = VARIANT_TO_TAILWIND_BG[variant];

  const card = (
    <div
      className={`stat-card ${clickable ? 'stat-card-clickable' : ''} ${
        error ? 'stat-card-error' : ''
      }`}
      onClick={onClick}
      style={{
        outline: active ? `1px solid ${resolvedColor}` : undefined,
        background: active ? `${bgColor}` : undefined,
        borderColor: error ? 'var(--color-warning)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="stat-card-label">{label}</div>
          <div
            className="stat-card-value"
            style={{ color: resolvedColor, opacity: loading ? 0.4 : 1 }}
          >
            {error ? '—' : value}
          </div>
          {extra && <div className="stat-card-extra">{extra}</div>}
        </div>
        {icon && (
          <div
            className="stat-card-icon"
            style={{ background: bgColor, color: resolvedColor }}
          >
            {icon}
          </div>
        )}
      </div>
      {footer && <div className="stat-card-footer">{footer}</div>}
    </div>
  );

  return wrapper ? wrapper(card) : card;
}
