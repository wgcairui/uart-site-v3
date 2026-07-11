// 管理员端 Dashboard / Stats API (alias /api/v2/admin/data/*)
import { Get, Post } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

export interface runInfo {
    Node: { online: number, all: number }; Protocol: number
    SysInfo: { freemem: string; hostname: string; loadavg: number[]; totalmem: string; type: string; uptime: string; usecpu: number; usemen: number; version: string }
    Terminal: { online: number, all: number }; TimeOutMonutDev: number; User: { online: number, all: number }; events: number
}

export interface queryResultSave extends Uart.queryResultSave { _id: string, parentId: string, content?: any }

export const runingState = () => Get<universalResult<runInfo>>('/api/v2/admin/dashboard/stats')
export const NodeInfo = (query?: PaginationReq) => Get<universalResult<V2ListResponse<Uart.nodeInfo>>>('/api/v2/admin/dashboard/nodes/stats', { ...query as any })
export const getUserStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/users/stats')
export const getTerminalStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/terminals/stats')
export const getProtocolStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/protocols/stats')
export const getDevModelStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/dev-models/stats')
export const getUserDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/users/detailed-stats')
export const getTerminalDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/terminals/detailed-stats')
export const getAlarmStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/alarms/stats')
export const getProtocolDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/protocols/detailed-stats')
export const getDataStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/data/stats')

// ─── v2 status enum admin dashboard (server feat/status-enum-v2 @ commit 0bd6cdf) ───
// admin 仪表盘 6 status 分布 (online/offline/warning/error/info/idle) + 单 status 24h trend
// 跟 designTokens.STATUS 6 variant 对齐, 部署后 admin dashboard 加渲染
/** GET /api/v2/admin/dashboard/tiles */
export const getAdminTileCounts = () =>
  Get<universalResult<Uart.AdminStatusCounts>>('/api/v2/admin/dashboard/tiles')
/** GET /api/v2/admin/dashboard/tiles/:name/history?hours=24 */
export const getAdminTileHistory = (name: Uart.DeviceStatus, hours: number = 24) =>
  Get<universalResult<Uart.AdminStatusHistoryResp>>(`/api/v2/admin/dashboard/tiles/${name}/history`, { hours: String(hours) })

/** 当前数据列表 (mac 搜索 + 分页) */
export const ClientResultSingle = (query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<queryResultSave>>>('/api/v2/admin/dashboard/current/list', { ...query })
export const getNodeInstructQuery = (query?: PaginationReq) => Get<universalResult<any>>('/api/v2/admin/dashboard/instruct/stats', { ...query as any })
export const getNodeInstructQueryMac = (mac: string, pid: number | string) => Get<universalResult<number>>(`/api/v2/admin/dashboard/instruct/stats/${encodeURIComponent(mac)}/${encodeURIComponent(pid)}`)
export const ClientResults = (start: number, end: number, id?: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.queryResult>>>('/api/v2/admin/dashboard/history/raw', { start, end, id, ...query })
export const ClientResult = (start: number, end: number, id?: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<queryResultSave>>>('/api/v2/admin/dashboard/history/parsed', { start, end, id, ...query })
export const ClientResultList = (startTs: number, endTs: number, mac: string, pid: number, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<queryResultSave>>>('/api/v2/admin/data/history/parsed/list', { startTs, endTs, mac, pid, ...query })
export const DataClean = () => Post<universalResult<any>>('/api/v2/admin/dashboard/clean', {})
export const nodeRestart = (node: string) => Post<universalResult<any>>(`/api/v2/admin/dashboard/nodes/${encodeURIComponent(node)}/restart`, {})