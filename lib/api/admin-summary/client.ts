/**
 * Admin Dashboard Summary Tier 1 — 5 个 typed BFF client
 *
 * 配对 uart-server PR #113 + types/admin-summary.ts + ./routes.ts
 *
 * 5 个 wrapper 都用 `Get<universalResult<TResp>>(URL, params)` 模式,
 * 跟 lib/api/endpoints/admin/dashboard.ts 现有 wrapper 风格一致.
 *
 * P0 round 2 删 dead wrapper:
 * - getDevicesActiveCount (0 引用, dev stat 现用 AnomalousDevicesCard 替代)
 * - getProtocolUsage (0 引用, 协议用量信息从 terminal stats 反查)
 *
 * 设计原则:
 * - URL 集中常量 (./routes.ts), 不在 client 里 hardcode string
 * - 响应类型 1:1 镜像 BE service 返回 (types/admin-summary.ts)
 * - 默认参数保守 (24h / 24h / hour / 20 limit) — 跟 BE 端 service 默认值一致
 * - 不在 client 做数据转换 (类型转换交给 page 层 useDashboardStat hook)
 *
 * 使用方:
 *   import { getAlarmSeverityDistribution } from '@/lib/api/admin-summary/client'
 *   const { data } = useDashboardStat(() => getAlarmSeverityDistribution('24h'), [])
 */

import { Get } from '@/lib/api/fetch';
import { universalResult } from '@/types';
import type {
  AlarmSeverityDistributionResp,
  AlarmTrendResp,
  DataFreshnessResp,
  NodeLoadResp,
  UserEngagementResp,
} from '@/types/admin-summary';
import { SUMMARY_ROUTES } from './routes';

// ---------------------------------------------------------------------------
// 1. /alarms/severity-distribution
// ---------------------------------------------------------------------------

/**
 * 告警 tag 严重度分布 (top 20)
 *
 * @param range 时间窗: '24h' (默认) | '7d' | '30d'
 */
export const getAlarmSeverityDistribution = (
  range: '24h' | '7d' | '30d' = '24h'
) =>
  Get<universalResult<AlarmSeverityDistributionResp>>(
    SUMMARY_ROUTES.alarmSeverityDistribution,
    { range }
  );

// ---------------------------------------------------------------------------
// 2. /alarms/trend
// ---------------------------------------------------------------------------

/**
 * 告警 rate trend (按 hour|day 桶 + severity split)
 *
 * @param hours 时间窗 (1-720, 默认 24)
 * @param granularity 桶粒度 (hour | day, 默认 hour). hours>168 时 BE 自动切 day.
 */
export const getAlarmTrend = (
  hours: number = 24,
  granularity: 'hour' | 'day' = 'hour'
) =>
  Get<universalResult<AlarmTrendResp>>(SUMMARY_ROUTES.alarmTrend, {
    hours: String(hours),
    granularity,
  });

// ---------------------------------------------------------------------------
// 3. /data/freshness
// ---------------------------------------------------------------------------

/**
 * 设备数据新鲜度 4 档分桶 (fresh<5min / stale<30min / dead<60min / never)
 */
export const getDataFreshness = () =>
  Get<universalResult<DataFreshnessResp>>(SUMMARY_ROUTES.dataFreshness);

// ---------------------------------------------------------------------------
// 4. /nodes/load
// ---------------------------------------------------------------------------

/**
 * Node 负载 4 档分桶 (healthy / warning / overloaded / offline)
 */
export const getNodeLoad = () =>
  Get<universalResult<NodeLoadResp>>(SUMMARY_ROUTES.nodeLoad);

// ---------------------------------------------------------------------------
// 5. /users/engagement
// ---------------------------------------------------------------------------

/**
 * 用户活跃度排行 (top N by deviceCount*2 + alarmCount7d + smsCount7d)
 *
 * @param limit 返回行数 (1-100, 默认 20)
 */
export const getUserEngagement = (limit: number = 20) =>
  Get<universalResult<UserEngagementResp>>(SUMMARY_ROUTES.userEngagement, {
    limit: String(limit),
  });
