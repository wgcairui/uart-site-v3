/**
 * Admin Dashboard Summary Tier 1 — 7 个 typed BFF client
 *
 * 配对 uart-server PR #113 + types/admin-summary.ts + ./routes.ts
 *
 * 7 个 wrapper 都用 `Get<universalResult<TResp>>(URL, params)` 模式,
 * 跟 lib/api/endpoints/admin/dashboard.ts 现有 wrapper 风格一致.
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
  DevicesActiveCountResp,
  AlarmTrendResp,
  DataFreshnessResp,
  ProtocolUsageResp,
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
// 2. /devices/active-count
// ---------------------------------------------------------------------------

/**
 * 24h 活跃设备数 (有至少 1 条 heartbeat / 终端事件)
 *
 * @param hours 过去 N 小时 (1-168, 默认 24)
 */
export const getDevicesActiveCount = (hours: number = 24) =>
  Get<universalResult<DevicesActiveCountResp>>(
    SUMMARY_ROUTES.devicesActiveCount,
    { hours: String(hours) }
  );

// ---------------------------------------------------------------------------
// 3. /alarms/trend
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
// 4. /data/freshness
// ---------------------------------------------------------------------------

/**
 * 设备数据新鲜度 4 档分桶 (fresh<5min / stale<30min / dead<60min / never)
 */
export const getDataFreshness = () =>
  Get<universalResult<DataFreshnessResp>>(SUMMARY_ROUTES.dataFreshness);

// ---------------------------------------------------------------------------
// 5. /protocols/usage
// ---------------------------------------------------------------------------

/**
 * 每种协议 (pid) 被多少 terminal / mount-dev 使用 (top 20 by deviceCount)
 */
export const getProtocolUsage = () =>
  Get<universalResult<ProtocolUsageResp>>(SUMMARY_ROUTES.protocolUsage);

// ---------------------------------------------------------------------------
// 6. /nodes/load
// ---------------------------------------------------------------------------

/**
 * Node 负载 4 档分桶 (healthy / warning / overloaded / offline)
 */
export const getNodeLoad = () =>
  Get<universalResult<NodeLoadResp>>(SUMMARY_ROUTES.nodeLoad);

// ---------------------------------------------------------------------------
// 7. /users/engagement
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
