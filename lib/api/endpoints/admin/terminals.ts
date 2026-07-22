// 管理员端 Terminals / Registered Devices API
import { Get, Post, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

// ─── Admin: Terminals  (/api/v2/admin/terminals) ──────────────────────────────

export const getTerminals = (filter?: Partial<Record<keyof Uart.Terminal, 1 | 0>>, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.Terminal>>>('/api/v2/admin/terminals/list', { filter, ...query })
export const adminGetTerminal = (mac: string) => Get<universalResult<Uart.Terminal>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}`)
export const getTerminalUser = (mac: string) => Get<universalResult<string>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/user`)
export const getTerminalBindUsers = (mac: string, query?: PaginationReq) =>
  Get<universalResult<V2ListResponse<Uart.UserInfo>>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/bind-users/list`, { ...query as any })
export const setTerminalOwner = (mac: string, user: string) => Post<universalResult<any>>('/api/v2/admin/terminals/owner', { mac, user })
export const changeShareApi = (mac: string) => Post<universalResult<any>>('/api/v2/admin/terminals/share', { mac })
export const modifyTerminalRemark = (mac: string, remark: string) => Post<universalResult<any>>('/api/v2/admin/terminals/remark', { mac, remark })
export const setTerminalOnline = (mac: string, online: boolean) => Post<universalResult<any>>('/api/v2/admin/terminals/online', { mac, online })
export const initTerminal = (mac: string) => Post<universalResult<any>>('/api/v2/admin/terminals/init', { mac })
export const sendATInstruct = (mac: string, content: string) => Post<universalResult<any>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/at-instruct`, { content })
export const SendProcotolInstructSet = (query: Omit<Uart.instructQuery, "type" | 'events'>) =>
  Post<universalResult<Uart.ApolloMongoResult>>(`/api/v2/admin/terminals/${encodeURIComponent(query.DevMac)}/instruct`, { pid: query.pid, protocol: query.protocol, content: query.content })
export const addListenMac = (mac: string) => Post<universalResult<string[]>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/listen`, {})
export const delListenMac = (mac: string) => Del<universalResult<string[]>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/listen`)
export const cleanListenMac = () => Del<universalResult<void>>('/api/v2/admin/terminals/listen/all')
/** 设备心跳 3 层数据 (realtime + transitions + samples) — server 端 admin-terminal.controller.ts:138-191 */
export const getTerminalHeartbeat = (mac: string) =>
  Get<universalResult<Uart.HeartbeatResponse>>(`/api/v2/admin/terminals/${encodeURIComponent(mac)}/heartbeat`)

// ─── Admin: Registered Devices  (/api/v2/admin/register-devs) ─────────────────

export const RegisterTerminals = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.RegisterTerminal>>>('/api/v2/admin/register-devs/list', { ...query })
export const RegisterTerminal = (DevMac: string) => Get<universalResult<Uart.RegisterTerminal>>(`/api/v2/admin/register-devs/terminal/${encodeURIComponent(DevMac)}`)
export const addRegisterTerminal = (DevMac: string, mountNode: string) => Post<universalResult<any>>('/api/v2/admin/register-devs/terminal', { DevMac, mountNode })
export const deleteRegisterTerminal = (DevMac: string) => Del<universalResult<string>>(`/api/v2/admin/register-devs/terminal/${encodeURIComponent(DevMac)}`)