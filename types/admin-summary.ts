/**
 * Admin Dashboard Summary Tier 1 — 7 个响应类型
 *
 * 配对 uart-server PR #113: 7 个新 dashboard endpoint
 * - GET /dashboard/alarms/severity-distribution
 * - GET /dashboard/devices/active-count
 * - GET /dashboard/alarms/trend
 * - GET /dashboard/data/freshness
 * - GET /dashboard/protocols/usage
 * - GET /dashboard/nodes/load
 * - GET /dashboard/users/engagement
 *
 * 镜像 midwayuartserver/src/module/system/service/summary-stats.service.ts
 * 7 个方法返回类型, hand-written (no monorepo), PR review 时核对.
 *
 * 维护注意: BE 端 service 改动时, 这里必须同步更新.
 * 如果两边的字段不一致, 会在 client 端类型错误或静默运行时 undefined.
 *
 * 最后核对 commit: midwayuartserver @ b2e51cc (PR #113)
 */

// ============================================================================
// 1. /alarms/severity-distribution
// ============================================================================

export type AlarmSeverity = 'critical' | 'warning' | 'info';

export interface AlarmSeverityItem {
  tag: string;
  count: number;
  severity: AlarmSeverity;
}

export type AlarmSeverityDistributionResp = AlarmSeverityItem[];

// ============================================================================
// 2. /devices/active-count
// ============================================================================

export interface DevicesActiveCountResp {
  /** 过去 N 小时至少上报 1 条数据的设备数 (distinct mac) */
  active: number;
  /** 终端总数 */
  total: number;
  /** active / total 百分比, 1 位小数 */
  rate: number;
}

// ============================================================================
// 3. /alarms/trend
// ============================================================================

export interface AlarmTrendBucket {
  /** ISO string, 例 "2026-07-25T08:00:00.000Z" */
  bucket: string;
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export type AlarmTrendResp = AlarmTrendBucket[];

// ============================================================================
// 4. /data/freshness
// ============================================================================

export interface DataFreshnessResp {
  /** 最后数据 < 5min ago */
  fresh: number;
  /** 5min - 30min */
  stale: number;
  /** 30min - 60min */
  dead: number;
  /** > 60min 或从未上报 */
  never: number;
  total: number;
}

// ============================================================================
// 5. /protocols/usage
// ============================================================================

export interface ProtocolUsageItem {
  /** 协议 id (pid) */
  protocol: string;
  /** 使用该协议的 terminal 数 (distinct) */
  terminalCount: number;
  /** mount-dev 总数 */
  deviceCount: number;
}

export type ProtocolUsageResp = ProtocolUsageItem[];

// ============================================================================
// 6. /nodes/load
// ============================================================================

export interface NodeLoadResp {
  /** connections < 50% MaxConnections */
  healthy: number;
  /** 50% - 80% */
  warning: number;
  /** > 80% */
  overloaded: number;
  /** socket.io disconnected */
  offline: number;
  total: number;
}

// ============================================================================
// 7. /users/engagement
// ============================================================================

export interface UserEngagementItem {
  user: string;
  deviceCount: number;
  alarmCount7d: number;
  smsCount7d: number;
  /** last login timestamp (ms), 可选 — 老用户没登录过则缺 */
  lastLogin?: number;
}

export type UserEngagementResp = UserEngagementItem[];
