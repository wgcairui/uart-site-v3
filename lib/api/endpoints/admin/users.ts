// 管理员端 Users API  (/api/v2/admin/users)
import { Get, Post, Patch, Put, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

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

// Admin: delUserTerminal — admin unbinds a user's device
// v2: DELETE /api/v2/admin/users/:user/devices/:mac
export const delUserTerminal = (user: string, mac: string) => Del<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/devices/${encodeURIComponent(mac)}`)

// Admin: bindUserDevice — admin binds an existing terminal to a user
// v2: POST /api/v2/admin/users/:user/devices
// force=true: 设备已被其他用户绑定时强行接管（解绑原用户并转给新用户）
export const bindUserDevice = (user: string, mac: string, force = false) =>
  Post<universalResult<any>>(`/api/v2/admin/users/${encodeURIComponent(user)}/devices`, { mac, force })