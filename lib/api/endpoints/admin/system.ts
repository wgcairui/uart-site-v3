// 管理员端 WX / System (Redis/OSS) / Deprecated (IOT/Secrets) API
import { Get, Post, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

// ─── Admin: WX  (/api/v2/admin/wx) ────────────────────────────────────────────

export const wx_users = (query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.WX.userInfoPublic>>>('/api/v2/admin/wx/users/list', { ...query })
export const update_wx_users_all = () => Post<universalResult<any>>('/api/v2/admin/wx/users/sync')
export const wx_send_info = (type: number, openid: string, content?: string) =>
  Post<universalResult<Uart.WX.wxRequest>>('/api/v2/admin/wx/send', { type, openid, content })

// ─── Admin: System (Redis / OSS)  — /api/v2/admin/system ──────────────────────

interface DeleteMultiResult { deleted: { Key: string }[]; res: any }
interface ObjectMeta { name: string; lastModified: string; size: number; url: string; etag: string; type: string }
export type ossfiles = Pick<ObjectMeta, 'name' | 'lastModified' | 'size' | 'url'>

export const redisflushall = () => Post<universalResult<any>>('/api/v2/admin/system/redis/flush-all')
export const redisflushdb = () => Post<universalResult<any>>('/api/v2/admin/system/redis/flush-db')
export const rediskeys = (pattern: string = "*", query?: PaginationReq) =>
  Get<universalResult<V2ListResponse<string>>>('/api/v2/admin/system/redis/keys', { pattern, ...query as any })
export const rediskeysdValue = (keys: string[]) => Post<universalResult<string[]>>('/api/v2/admin/system/redis/keys/values', { keys })
export const rediskeysdel = (keys: string[]) => Del<universalResult<any>>('/api/v2/admin/system/redis/keys', { keys } as any)
export const ossFilelist = (prefix?: string, query?: PaginationReq) =>
  Get<universalResult<V2ListResponse<ossfiles>>>('/api/v2/admin/system/oss/files', { prefix, ...query as any })
export const ossDelete = (names: string[]) => Del<universalResult<DeleteMultiResult>>('/api/v2/admin/system/oss/files', { names } as any)

// ─── DEPRECATED: IOT & Secrets — no server-side implementation, return empty ──

export const iotRemoteUrl = (_mac: string) => Promise.resolve({ code: 0, data: '', msg: 'DEPRECATED' } as any)
export const IotDoIotUnbindResume = (_iccid: string) => Promise.resolve({ code: 0, data: false, msg: 'DEPRECATED' } as any)
export const IotQueryCardInfo = (_iccid: string) => Promise.resolve({ code: 0, data: {} as any, msg: 'DEPRECATED' } as any)
export const IotQueryCardFlowInfo = (_iccid: string) => Promise.resolve({ code: 0, data: {} as any, msg: 'DEPRECATED' } as any)
export const IotQueryIotCardOfferDtl = (_iccid: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const IotUpdateAutoRechargeSwitch = (_iccid: string, _open: boolean) => Promise.resolve({ code: 0, data: false, msg: 'DEPRECATED' } as any)
export const IotRecharge = (_mac: string) => Promise.resolve({ code: 0, data: {} as any, msg: 'DEPRECATED' } as any)
export const IotUpdateIccidInfo = (_mac: string) => Promise.resolve({ code: 0, data: {} as any, msg: 'DEPRECATED' } as any)
export const UpdateIccids = () => Promise.resolve({ code: 0, data: { time: 0, length: 0 }, msg: 'DEPRECATED' } as any)
export const set_Secret = (_opt: Uart.Secret_app) => Promise.resolve({ code: 0, data: '', msg: 'DEPRECATED' } as any)
export const get_Secret = (_type: Uart.secretType) => Promise.resolve({ code: 0, data: null, msg: 'DEPRECATED' } as any)

/** @deprecated 对应 server 端无实现，组件已废弃 */
export interface DevUseTime {
    Interval: number; mac: string; pid: number; timeStamp: number; useTime: number
}