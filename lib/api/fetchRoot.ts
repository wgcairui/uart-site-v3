import { universalResult } from '@/types'
import { Post, Get, Put, Patch, Del } from '@/lib/api/fetch'
import { PaginationReq, V2ListResponse } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeleteMultiResult { deleted: { Key: string }[]; res: any }
interface ObjectMeta { name: string; lastModified: string; size: number; url: string; etag: string; type: string }

/** @deprecated 对应 server 端无实现，组件已废弃 */
export interface DevUseTime {
    Interval: number; mac: string; pid: number; timeStamp: number; useTime: number
}
export interface runInfo {
    Node: { online: number, all: number }; Protocol: number
    SysInfo: { freemem: string; hostname: string; loadavg: number[]; totalmem: string; type: string; uptime: string; usecpu: number; usemen: number; version: string }
    Terminal: { online: number, all: number }; TimeOutMonutDev: number; User: { online: number, all: number }; events: number
}
export interface queryResultSave extends Uart.queryResultSave { _id: string, parentId: string, content?: any }
export type logAggs<T = number> = Pick<Uart.logTerminals, "type" | "msg"> & { timeStamp: T }
export type ossfiles = Pick<ObjectMeta, 'name' | 'lastModified' | 'size' | 'url'>

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Dashboard / Stats  (alias /api/v2/admin/data/*)
// ═══════════════════════════════════════════════════════════════════════════════

export const runingState = () => Get<universalResult<runInfo>>('/api/v2/admin/dashboard/stats')
export const NodeInfo = (query?: PaginationReq) => Get<universalResult<V2ListResponse<Uart.nodeInfo>>>('/api/v2/admin/dashboard/nodes/stats', { ...query as any })
export const Nodes = (query?: PaginationReq) => Get<universalResult<V2ListResponse<Uart.NodeClient>>>('/api/v2/admin/dashboard/nodes', { ...query as any })
export const getUserStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/users/stats')
export const getTerminalStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/terminals/stats')
export const getProtocolStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/protocols/stats')
export const getDevModelStats = () => Get<universalResult<any[]>>('/api/v2/admin/dashboard/dev-models/stats')
export const getUserDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/users/detailed-stats')
export const getTerminalDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/terminals/detailed-stats')
export const getAlarmStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/alarms/stats')
export const getProtocolDetailedStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/protocols/detailed-stats')
export const getDataStats = () => Get<universalResult<any>>('/api/v2/admin/dashboard/data/stats')
// Admin: Current data (list with mac search + pagination)
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

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Users  (/api/v2/admin/users)
// ═══════════════════════════════════════════════════════════════════════════════

export const users = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.UserInfo>>>('/api/v2/admin/users/list', { ...query })
export const getUser = (user: string) => Post<universalResult<Uart.UserInfo>>('/api/v2/admin/users/detail', { user })
export const deleteUser = (user: string, hash: string) => Del<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}`, { hash } as any)
export const resetUserPassword = (user: string, password: string) => Post<universalResult<any>>('/api/v2/admin/users/password', { user, password })
export const modifyUserRemark = (user: string, remark: string) => Post<universalResult<any>>('/api/v2/admin/users/remark', { user, remark })
export const toggleUserGroup = (user: string) => Post<universalResult<any>>('/api/v2/admin/users/toggle-group', { user })
export const getUsersOnline = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.UserInfo>>>('/api/v2/admin/users/online', { ...query })
export const getUserOnlineStat = (user: string) => Get<universalResult<boolean>>(`/api/v2/admin/users/${encodeURIComponent(user)}/online-stat`)
export const sendUserSocketInfo = (user: string, msg: string) => Post<universalResult<any>>('/api/v2/admin/users/socket-msg', { user, msg })
export const simulateLogin = (user: string) => Post<universalResult<{ token: string }>>(`/api/v2/admin/users/${encodeURIComponent(user)}/simulate-login`, {})
export const BindDev = (user: string) => Get<universalResult<{ UTs: Uart.Terminal[] }>>(`/api/v2/admin/users/${encodeURIComponent(user)}/bind-devs`)
export const getUserAlarmSetup = (user: string) => Get<universalResult<Uart.userSetup>>(`/api/v2/admin/users/${encodeURIComponent(user)}/alarm-setup`)
export const getUserAlarmSetups = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.userSetup>>>('/api/v2/admin/users/alarm-setups', { ...query })
export const initUserAlarmSetup = (user: string) => Post<universalResult<any>>('/api/v2/admin/users/alarm-setup/init', { user })
export const modifyAdminUserAlarmSetupContacts = (user: string, data: { tels?: string[], mails?: string[], wxs?: string[] }) =>
  Patch<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/alarm-setup`, data)
export const modifyAdminUserAlarmSetupProtocol = (user: string, protocol: string, data: { Threshold?: any[], AlarmStat?: any[], ShowTag?: string[] }) =>
  Put<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/alarm-setup/protocols/${encodeURIComponent(protocol)}`, data)
export const getAlarm = (user: string, start: number, end: number, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.uartAlarmObject>>>(`/api/v2/admin/users/${encodeURIComponent(user)}/terminal-alarms/list`, { startTs: start, endTs: end, ...query })
export const getUserSmsStats = (user: string, days = 30) =>
  Get<universalResult<{ date: string; count: number; details: { tel: string; count: number }[] }[]>>(`/api/v2/admin/users/${encodeURIComponent(user)}/sms-stats?days=${days}`)
export const getUserSmsRecords = (user: string, params?: { page?: number; pageSize?: number; start?: string; end?: string }) => {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.start) searchParams.set('start', params.start)
  if (params?.end) searchParams.set('end', params.end)
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return Get<universalResult<{
    items: {
      id: number
      tel: string
      content: string
      status: string
      createdAt: string
      terminalId?: string
      nodeId?: string
    }[]
    pagination: { page: number; pageSize: number; total: number }
  }>>(`/api/v2/admin/users/${encodeURIComponent(user)}/sms-records${query}`)
}
export const getUserMailRecords = (user: string, params?: { page?: number; pageSize?: number; start?: string; end?: string }) => {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.start) searchParams.set('start', params.start)
  if (params?.end) searchParams.set('end', params.end)
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return Get<universalResult<{
    items: {
      id: number
      email: string
      subject: string
      content: string
      status: string
      createdAt: string
      terminalId?: string
      nodeId?: string
    }[]
    pagination: { page: number; pageSize: number; total: number }
  }>>(`/api/v2/admin/users/${encodeURIComponent(user)}/mail-records${query}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Terminals  (/api/v2/admin/terminals)
// ═══════════════════════════════════════════════════════════════════════════════

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

// Admin: delUserTerminal — admin unbinds a user's device
// v1: POST /api/root/delUserTerminal
// v2: DELETE /api/v2/admin/users/:user/devices/:mac
export const delUserTerminal = (user: string, mac: string) => Del<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/devices/${encodeURIComponent(mac)}`)

// Admin: bindUserDevice — admin binds an existing terminal to a user
// v2: POST /api/v2/admin/users/:user/devices
// v1: 无对应接口（v1 由用户自行调用 /api/addUserTerminal）
// force=true: 设备已被其他用户绑定时强行接管（解绑原用户并转给新用户）
export const bindUserDevice = (user: string, mac: string, force = false) =>
  Post<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/devices`, { mac, force })

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Registered Devices  (/api/v2/admin/register-devs)
// ═══════════════════════════════════════════════════════════════════════════════

export const RegisterTerminals = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.RegisterTerminal>>>('/api/v2/admin/register-devs/list', { ...query })
export const RegisterTerminal = (DevMac: string) => Get<universalResult<Uart.RegisterTerminal>>(`/api/v2/admin/register-devs/terminal/${encodeURIComponent(DevMac)}`)
export const addRegisterTerminal = (DevMac: string, mountNode: string) => Post<universalResult<any>>('/api/v2/admin/register-devs/terminal', { DevMac, mountNode })
export const deleteRegisterTerminal = (DevMac: string) => Del<universalResult<string>>(`/api/v2/admin/register-devs/terminal/${encodeURIComponent(DevMac)}`)

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Protocols  (/api/v2/admin/protocols)
// ═══════════════════════════════════════════════════════════════════════════════

export const getProtocols = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.protocol>>>('/api/v2/admin/protocols/list', { ...query })
export const setProtocol = (Type: number, ProtocolType: string, Protocol: string, instruct: Uart.protocolInstruct[]) =>
  Post<universalResult<any>>('/api/v2/admin/protocols', { Type, Protocol, ProtocolType, instruct })
export const updateProtocol = (protocol: Uart.protocol) => Put<universalResult<any>>('/api/v2/admin/protocols', { protocol })
export const deleteProtocol = (protocol: string) => Del<universalResult<string[]>>(`/api/v2/admin/protocols/${encodeURIComponent(protocol)}`)
export const modifyProtocolRemark = (protocol: string, remark: string) => Post<universalResult<any>>('/api/v2/admin/protocols/remark', { protocol, remark })
export const addDevConstant = (ProtocolType: string, Protocol: string, type: Uart.ConstantThresholdType, arg: any) =>
  Post<universalResult<any>>('/api/v2/admin/protocols/dev-constant', { ProtocolType, Protocol, type, arg })
export const TestScriptStart = (scriptStart: string, name: string) => Post<universalResult<any>>('/api/v2/admin/protocols/test-script', { scriptStart, name })

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Device Types  (/api/v2/admin/device-types)
// ═══════════════════════════════════════════════════════════════════════════════

export const DevTypes = (query?: PaginationReq) => Post<universalResult<V2ListResponse<(Uart.DevsType & { _id?: string })>>>('/api/v2/admin/device-types/list', { ...query })
export const DevType = (DevModel: string) => Get<universalResult<Uart.DevsType[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)
export const addDevType = (Type: string, DevModel: string, Protocols: Pick<Uart.protocol, "ProtocolType" | "Protocol">[]) =>
  Post<universalResult<any>>('/api/v2/admin/device-types', { Type, DevModel, Protocols })
export const deleteDevModel = (DevModel: string) => Del<universalResult<string[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Nodes  (/api/v2/admin/nodes) — deploy server-controllers/admin-node.controller.ts first
// ═══════════════════════════════════════════════════════════════════════════════

export const Node = (name: string) => Get<universalResult<Uart.NodeClient>>(`/api/v2/admin/nodes/${encodeURIComponent(name)}`)
export const setNode = (Name: string, IP: string, Port: number, MaxConnections: number) =>
  Post<universalResult<any>>('/api/v2/admin/nodes', { Name, IP, Port, MaxConnections })
export const deleteNode = (Name: string) => Del<universalResult<string[]>>(`/api/v2/admin/nodes/${encodeURIComponent(Name)}`)

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Logs  (/api/v2/admin/logs)
// ═══════════════════════════════════════════════════════════════════════════════

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
export const loginnerMessages = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<any>>>('/api/v2/admin/logs/inner-messages', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logbulls = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<any>>>('/api/v2/admin/logs/bulls', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logterminalAggs = (mac: string, start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/terminal-aggs', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query, filters: { mac, ...(query?.filters || {}) } })
export const logUserAggs = (user: string, start: number, end: number, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/user-aggs', { startTs: start, endTs: end, ...query, filters: { user, ...(query?.filters || {}) } })
// DEPRECATED — no server-side implementation (return 404)
export const getUseBtyes = (_mac: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const getDtuBusy = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logDevUseTime = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logdataclean = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<{
    items: { timeStamp: number; useTime: number; NumUserRequest: number; NumClientresults: number; CleanClientresultsTimeOut: number }[]
    pagination: { page: number; pageSize: number; total: number }
  }>>('/api/v2/admin/logs/dataclean', { start: start ? new Date(start).getTime() : undefined, end: end ? new Date(end).getTime() : undefined, ...query })
export const logInstructQuery = (_mac: string) => Promise.resolve({ code: 0, data: [], msg: 'DEPRECATED' } as any)

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: WX  (/api/v2/admin/wx) — deploy server-controllers/admin-wx.controller.ts first
// ═══════════════════════════════════════════════════════════════════════════════

export const wx_users = (query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.WX.userInfoPublic>>>('/api/v2/admin/wx/users/list', { ...query })
export const update_wx_users_all = () => Post<universalResult<any>>('/api/v2/admin/wx/users/sync')
export const wx_send_info = (type: number, openid: string, content?: string) =>
  Post<universalResult<Uart.WX.wxRequest>>('/api/v2/admin/wx/send', { type, openid, content })
export const log_wxEvent = (query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.WX.WxEvent>>>('/api/v2/admin/wx/events/list', { ...query })

// ═══════════════════════════════════════════════════════════════════════════════
// Admin: System (Redis / OSS)  — /api/v2/admin/system
// ═══════════════════════════════════════════════════════════════════════════════

export const redisflushall = () => Post<universalResult<any>>('/api/v2/admin/system/redis/flush-all')
export const redisflushdb = () => Post<universalResult<any>>('/api/v2/admin/system/redis/flush-db')
export const rediskeys = (pattern: string = "*", query?: PaginationReq) =>
  Get<universalResult<V2ListResponse<string>>>('/api/v2/admin/system/redis/keys', { pattern, ...query as any })
export const rediskeysdValue = (keys: string[]) => Post<universalResult<string[]>>('/api/v2/admin/system/redis/keys/values', { keys })
export const rediskeysdel = (keys: string[]) => Del<universalResult<any>>('/api/v2/admin/system/redis/keys', { keys } as any)
export const ossFilelist = (prefix?: string, query?: PaginationReq) =>
  Get<universalResult<V2ListResponse<ossfiles>>>('/api/v2/admin/system/oss/files', { prefix, ...query as any })
export const ossDelete = (names: string[]) => Del<universalResult<DeleteMultiResult>>('/api/v2/admin/system/oss/files', { names } as any)

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED: IOT & Secrets — no server-side implementation, return empty
// ═══════════════════════════════════════════════════════════════════════════════

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
