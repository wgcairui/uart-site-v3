// 管理员端 Logs API  (/api/v2/admin/logs)
import { Post } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

export type logAggs<T = number> = Pick<Uart.logTerminals, "type" | "msg"> & { timeStamp: T }

export const lognodes = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logNodes>>>('/api/v2/admin/logs/nodes', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logterminals = (start: string, end: string, mac?: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logTerminals>>>('/api/v2/admin/logs/terminals', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), mac, ...query })
export const logsmssends = (start: string, end: string, phone?: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logSmsSend>>>('/api/v2/admin/logs/sms', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), phone, ...query })
export const logsmssendsCountInfo = () => Post<universalResult<{ _id: string, sum: number }[]>>('/api/v2/admin/logs/sms/count-info', {})
export const logmailsends = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logMailSend>>>('/api/v2/admin/logs/mail', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const loguartterminaldatatransfinites = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.uartAlarmObject>>>('/api/v2/admin/logs/transfinite', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const loguserlogins = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logUserLogins>>>('/api/v2/admin/logs/user-logins', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const loguserrequsts = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logUserRequst>>>('/api/v2/admin/logs/user-requests', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logwxsubscribes = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.WX.wxsubscribeMessage>>>('/api/v2/admin/logs/wx-subscribes', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logterminalAggs = (mac: string, start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/terminal-aggs', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query, filters: { mac, ...(query?.filters || {}) } })
export const logUserAggs = (user: string, start: number, end: number, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/user-aggs', { startTs: start, endTs: end, ...query, filters: { user, ...(query?.filters || {}) } })

// DEPRECATED — no server-side implementation (return 404)
export const getUseBtyes = (_mac: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const getDtuBusy = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logDevUseTime = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logInstructQuery = (_mac: string) => Promise.resolve({ code: 0, data: [], msg: 'DEPRECATED' } as any)