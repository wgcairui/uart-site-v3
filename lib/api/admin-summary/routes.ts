/**
 * Admin Dashboard Summary Tier 1 — 路由常量
 *
 * 配对 uart-server PR #113 + types/admin-summary.ts
 *
 * 用 `as const` 让 URL 字面量被 TS narrow 成 string literal type,
 * 避免 client wrapper 拼错路径编译通过但运行时 404.
 */
export const SUMMARY_ROUTES = {
  alarmSeverityDistribution: '/api/v2/admin/dashboard/alarms/severity-distribution',
  devicesActiveCount: '/api/v2/admin/dashboard/devices/active-count',
  alarmTrend: '/api/v2/admin/dashboard/alarms/trend',
  dataFreshness: '/api/v2/admin/dashboard/data/freshness',
  protocolUsage: '/api/v2/admin/dashboard/protocols/usage',
  nodeLoad: '/api/v2/admin/dashboard/nodes/load',
  userEngagement: '/api/v2/admin/dashboard/users/engagement',
} as const;

export type SummaryRoute = (typeof SUMMARY_ROUTES)[keyof typeof SUMMARY_ROUTES];
