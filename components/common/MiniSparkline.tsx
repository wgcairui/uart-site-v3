'use client';

import React, { useMemo } from 'react';

/**
 * MiniSparkline — 轻量 SVG 迷你折线图 (无依赖)
 *
 * 用在 StatCard `kind="drilldown"` 的 popover content 里,
 * 展示 trend 桶数据 (e.g. 30d alarm rate).
 *
 * 设计取舍:
 * - 不引入 chart 库 (echarts / recharts / antd-charts) — mini sparkline 只是辅助,
 *   性能开销 (150KB+) 不值得. 30+ buckets SVG path 足够.
 * - 不画轴 / grid / tooltip — popover 空间有限, 看 relative 趋势足够
 * - 自动归一化: 用 max(value) 归一化, y ∈ [0, height-padding]
 * - 空数组 → "暂无数据" 文字
 *
 * 配 page:
 * ```tsx
 * <StatCard
 *   kind="drilldown"
 *   popoverContent={({ data }) => <MiniSparkline data={data as AlarmTrendResp} />}
 * />
 * ```
 */
export interface MiniSparklineProps {
  /** 数据点 (bucket array, 用 total 字段画线) */
  data?: Array<{ bucket: string; total: number }>;
  /** 高度 (px) — 默认 60 */
  height?: number;
  /** 宽度 (px) — 默认 240 (popover content 宽) */
  width?: number;
  /** 主色 (hex) — 默认 var(--color-primary) */
  color?: string;
  /** 副色 (area fill) — 默认主色 15% 透明 */
  fillColor?: string;
  /** 空数据兜底文字 */
  emptyText?: string;
}

export function MiniSparkline({
  data = [],
  height = 60,
  width = 240,
  color = 'var(--color-primary)',
  fillColor,
  emptyText = '暂无数据',
}: MiniSparklineProps) {
  const path = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const max = Math.max(...data.map((d) => Number(d.total) || 0), 1);
    const min = 0;
    const padding = 4;
    const w = width - padding * 2;
    const h = height - padding * 2;
    const stepX = data.length > 1 ? w / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = padding + i * stepX;
      const y = padding + h - ((Number(d.total) || 0) - min) / (max - min || 1) * h;
      return { x, y };
    });

    // 折线
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    // 面积填充 (在折线下方, 沿 y=h+padding 闭合)
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    if (!lastPoint || !firstPoint) return null;
    const areaPath = `${linePath} L${lastPoint.x.toFixed(1)},${(padding + h).toFixed(1)} L${firstPoint.x.toFixed(1)},${(padding + h).toFixed(1)} Z`;

    return { linePath, areaPath, points, max };
  }, [data, height, width]);

  if (!path) {
    return (
      <div
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-500)',
          fontSize: 12,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ width, padding: '4px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--ink-500)',
          marginBottom: 4,
        }}
      >
        <span>峰值 {path.max}</span>
        <span>{data.length} 桶</span>
      </div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <path d={path.areaPath} fill={fillColor ?? `${color}20`} />
        <path d={path.linePath} fill="none" stroke={color} strokeWidth={1.5} />
        {/* 末点 marker */}
        {path.points.length > 0 && (() => {
          const last = path.points[path.points.length - 1];
          if (!last) return null;
          return (
            <circle
              cx={last.x}
              cy={last.y}
              r={2.5}
              fill={color}
            />
          );
        })()}
      </svg>
    </div>
  );
}

export default MiniSparkline;
