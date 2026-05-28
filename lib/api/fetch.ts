import { message } from 'antd'
import { universalResult } from '@/types'
import { PaginationReq, V2ListResponse } from '@/types'
import { getToken, getAuthToken } from '@/lib/utils/token'

export { getToken }

export const header = (): Headers => {
  const h = new Headers({ 'content-type': 'application/json' })
  const token = getAuthToken()
  if (token) h.append('authorization', token)
  return h
}

function validationStatus(res: universalResult<any>) {
  if (res?.status === 403) {
    message.error('操作没有权限')
  }
}

async function parseJson(res: Response) {
  const text = await res.text()
  if (!text) return { code: 0, data: null, msg: 'No Content' }
  try {
    return JSON.parse(text)
  } catch {
    // 非 JSON 响应（HTML 错误页等）
    const trimmed = text.trim()
    const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed
    return { code: res.status, data: null, msg: `响应非 JSON: ${preview}` }
  }
}

export const Post = async <T>(
  path: string,
  data?: { [x: string]: any }
): Promise<T> => {
  const init: RequestInit = { method: 'POST', headers: header() }
  if (data !== undefined) init.body = JSON.stringify(data)
  const res = await fetch(path, init)
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Get = async <T>(
  path: string,
  data?: { [x: string]: string }
): Promise<T> => {
  const qs = data ? new URLSearchParams(data).toString() : ''
  const res = await fetch(qs ? `${path}?${qs}` : path, { method: 'GET', headers: header() })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Put = async <T>(
  path: string,
  data: { [x: string]: any }
): Promise<T> => {
  const body = JSON.stringify(data)
  const res = await fetch(path, { method: 'PUT', headers: header(), body })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Patch = async <T>(
  path: string,
  data: { [x: string]: any }
): Promise<T> => {
  const body = JSON.stringify(data)
  const res = await fetch(path, { method: 'PATCH', headers: header(), body })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Del = async <T>(
  path: string,
  data?: { [x: string]: any }
): Promise<T> => {
  const init: RequestInit = { method: 'DELETE', headers: header() }
  if (data) init.body = JSON.stringify(data)
  const res = await fetch(path, init)
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * 获取当前用户 (从token)
 * v2: GET /api/v2/auth/current-user
 */
export const getAuthUser = () => {
  return Get<universalResult<{ user: string; userGroup: string }>>('/api/v2/auth/current-user')
}

/**
 * 获取登录 Hash
 * v2: GET /api/v2/auth/login-hash
 */
export const getLoginHash = (user: string) => {
  return Get<universalResult<string>>('/api/v2/auth/login-hash', { user })
}

/**
 * 账号密码登录
 * v2: POST /api/v2/auth/login
 */
export const login = (user: string, passwd: string) => {
  return Post<universalResult<string>>('/api/v2/auth/login', { user, passwd })
}

/**
 * 微信登录
 * v2: POST /api/v2/auth/wechat-web/login
 */
export const wxlogin = (code: string, state: string) => {
  return Post<universalResult<{ token: string }>>('/api/v2/auth/wechat-web/login', { code, state })
}

// ─── Guest ───────────────────────────────────────────────────────────────────

/**
 * 添加用户
 * v2: POST /api/v2/guest/register
 */
export const addUser = (name: string, user: string, passwd: string, tel: string, mail: string, company: string) => {
  return Post<universalResult<any>>('/api/v2/guest/register', { name, user, passwd, tel, mail, company })
}

/**
 * 重置密码到发送验证码
 * v2: POST /api/v2/guest/password-reset/code
 */
export const resetPasswdValidation = (user: string) => {
  return Post<universalResult<any>>('/api/v2/guest/password-reset/code', { user })
}

/**
 * 重置用户密码
 * v2: POST /api/v2/guest/password-reset
 */
export const resetUserPasswd = (user: string, passwd: string, code: string) => {
  return Post<universalResult<any>>('/api/v2/guest/password-reset', { user, passwd, code })
}

// ─── Open / Utils ────────────────────────────────────────────────────────────

export const crc = (data: any) => {
  return Post<string>('/api/v2/open/utils/crc', { ...data })
}

// V2 gps转高德gps
export const V2_API_Aamp_gps2autoanvi = (
  locations: string | string[],
  coordsys: 'gps' | 'mapbar' | 'baidu' = 'gps'
) => {
  return Post<string | string[]>('/api/v2/open/utils/amap/gps-to-autonavi', {
    coordsys,
    locations: Array.isArray(locations) ? locations.join('|') : locations,
  })
}

/**
 * 获取crc16
 */
export const Crc = (data: any) => {
  return Post<string>('/api/v2/open/utils/crc', { ...data })
}

// ─── User Profile ────────────────────────────────────────────────────────────

/**
 * 获取用户信息
 * v2: GET /api/v2/user/profile
 */
export const userInfo = () => {
  return Get<universalResult<Uart.UserInfo>>('/api/v2/user/profile')
}

/**
 * 修改用户信息
 * v2: PATCH /api/v2/user/profile
 */
export const modifyUserInfo = (data: Partial<Uart.UserInfo>) => {
  return Patch<universalResult<any>>('/api/v2/user/profile', { ...data })
}

/**
 * 获取公众号二维码
 * v2: GET /api/v2/user/profile/mp-ticket
 */
export const mpTicket = () => {
  return Get<universalResult<string>>('/api/v2/user/profile/mp-ticket')
}

/**
 * 获取小程序二维码
 * v2: GET /api/v2/user/profile/wp-ticket
 */
export const wpTicket = () => {
  return Get<universalResult<string>>('/api/v2/user/profile/wp-ticket')
}

// ─── User Devices ────────────────────────────────────────────────────────────

/**
 * 获取用户绑定设备
 * v2: GET /api/v2/user/devices
 */
export const BindDev = () => {
  return Get<universalResult<{ UTs: Uart.Terminal[] }>>('/api/v2/user/devices')
}

/**
 * 获取用户告警
 * v2: POST /api/v2/user/alarms/history
 */
export const getAlarm = (
  start: string = new Date().toLocaleDateString().replace(/\//g, '-') + ' 0:00:00',
  end: string = new Date().toLocaleDateString().replace(/\//g, '-') + ' 23:59:59',
  _query?: PaginationReq
) => {
  return Post<universalResult<(Uart.uartAlarmObject & { _id?: string })[]>>('/api/v2/user/alarms/history', {
    start: new Date(start).getTime(),
    end: new Date(end).getTime(),
  })
}

/**
 * 确认用户告警
 * v2: POST /api/v2/user/alarms/:id/confirm
 */
export const confrimAlarm = (id?: string) => {
  return Post<universalResult<any>>(`/api/v2/user/alarms/${id || ''}/confirm`, {})
}

/**
 * 获取指定且在线的终端
 * v2: GET /api/v2/user/devices/:mac/online
 */
export const getTerminalOnline = (mac: string) => {
  return Get<universalResult<Uart.Terminal | null>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/online`)
}

/**
 * 修改用户设备别名
 * v2: PATCH /api/v2/user/devices/:mac
 */
export const modifyTerminal = (mac: string, name: string) => {
  return Patch<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`, { name })
}

/**
 * 添加绑定设备
 * v2: POST /api/v2/user/devices
 */
export const addUserTerminal = (mac: string) => {
  return Post<universalResult<any>>('/api/v2/user/devices', { mac })
}

/**
 * 删除绑定设备
 * v2: DEL /api/v2/user/devices/:mac
 */
export const delUserTerminal = (mac: string) => {
  return Del<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`)
}

/**
 * 获取设备类型
 * v1 fallback: POST /api/getDevTypes (no user-facing v2 yet)
 */
export const getDevTypes = (Type: string, query?: PaginationReq) => {
  return Post<universalResult<V2ListResponse<Uart.DevsType>>>('/api/getDevTypes', { Type, ...query })
}

/**
 * 删除终端挂载设备
 * v2: DEL /api/v2/user/devices/:mac/mount/:pid
 */
export const delTerminalMountDev = (mac: string, pid: number) => {
  return Del<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}`)
}

/**
 * 添加用户终端挂载设备
 * v2: POST /api/v2/user/devices/:mac/mount
 */
export const addTerminalMountDev = (mac: string, mountDev: Uart.TerminalMountDevs) => {
  return Post<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount`, { mountDev })
}

// ─── User Alarm Setup ────────────────────────────────────────────────────────

/**
 * 获取用户告警配置
 * v2: GET /api/v2/user/alarms/setup
 */
export const getUserAlarmSetup = () => {
  return Get<universalResult<Uart.userSetup>>('/api/v2/user/alarms/setup')
}

/**
 * 修改用户告警配置联系方式
 * v2: PATCH /api/v2/user/alarms/setup
 */
export const modifyUserAlarmSetupTel = (tels: string[], mails: string[]) => {
  return Patch<universalResult<any>>('/api/v2/user/alarms/setup', { tels, mails })
}

/**
 * 获取用户单个协议告警配置
 * v2: GET /api/v2/user/alarms/setup/protocols/:name
 */
export const getUserAlarmProtocol = (protocol: string) => {
  return Get<universalResult<Uart.ProtocolConstantThreshold>>(`/api/v2/user/alarms/setup/protocols/${encodeURIComponent(protocol)}`)
}

/**
 * 获取单个协议告警配置 (系统默认)
 * v2: GET /api/v2/user/alarms/protocols/:name/thresholds
 */
export const getAlarmProtocol = (protocol: string) => {
  return Get<universalResult<Uart.ProtocolConstantThreshold>>(`/api/v2/user/alarms/protocols/${encodeURIComponent(protocol)}/thresholds`)
}

// ─── User Device Data ────────────────────────────────────────────────────────

/**
 * 获取用户设备运行数据
 * v2: GET /api/v2/user/devices/:mac/mount/:pid/data
 */
export const getTerminalData = (mac: string, pid: number | string) => {
  return Get<universalResult<Uart.queryResultSave>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/data`)
}

interface datas {
  name: string;
  value: string;
  time: number;
}

/**
 * 获取用户设备历史运行数据
 * v2: POST /api/v2/user/devices/:mac/mount/:pid/data/history
 */
export const getTerminalDatasV2 = (
  mac: string,
  pid: number | string,
  name: string | string[],
  start: number,
  end: number,
  _query?: PaginationReq
) => {
  const names = typeof name === 'string' ? name : name.length > 1 ? name : name[0] || []
  return Post<universalResult<V2ListResponse<datas>>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/data/history`, {
    name: names,
    start,
    end,
  })
}

/**
 * 重置设备超时状态
 * v2: POST /api/v2/user/devices/:mac/mount/:pid/refresh
 */
export const refreshDevTimeOut = (mac: string, pid: number, interVal?: number) => {
  return Post<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/refresh`, { interVal })
}

/**
 * 固定发送设备操作指令
 * v2: POST /api/v2/user/devices/:mac/mount/:pid/instruct
 */
export const SendProcotolInstructSet = (
  query: Pick<Uart.instructQueryArg, 'DevMac' | 'pid' | 'protocol' | 'mountDev'>,
  item: Uart.OprateInstruct
) => {
  return Post<universalResult<Uart.ApolloMongoResult>>(
    `/api/v2/user/devices/${encodeURIComponent(query.DevMac)}/mount/${query.pid}/instruct`,
    { protocolName: query.protocol, item }
  )
}

// ─── User Protocols ──────────────────────────────────────────────────────────

/**
 * 获取指定协议
 * v2: GET /api/v2/user/protocols/:name
 */
export const getProtocol = (protocol: string) => {
  return Get<universalResult<Uart.protocol>>(`/api/v2/user/protocols/${encodeURIComponent(protocol)}`)
}

/**
 * 设置用户自定义设置(协议配置)
 * v2: POST /api/v2/user/protocols/setup
 */
export const setUserSetupProtocol = (protocol: string, type: Uart.ConstantThresholdType, arg: any) => {
  return Post<universalResult<Uart.ApolloMongoResult>>('/api/v2/user/protocols/setup', { protocol, type, arg })
}

/**
 * 获取协议告警数据集合
 * v2: POST /api/v2/user/protocols/setup/details
 */
export const getProtocolSetup = <T = string>(
  protocol: string,
  type: Uart.ConstantThresholdType,
  user?: string
) => {
  return Post<universalResult<{ sys: T[]; user: T[] }>>('/api/v2/user/protocols/setup/details', { protocol, type, user })
}

/**
 * 获取终端信息
 * v2: GET /api/v2/user/devices/:mac
 */
export const getTerminal = (mac: string) => {
  return Get<universalResult<Uart.Terminal>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`)
}

// ─── User Layout ─────────────────────────────────────────────────────────────

/**
 * 获取用户布局配置
 * v2: GET /api/v2/user/layouts/:id
 */
export const getUserLayout = (id: string) => {
  return Get<universalResult<Uart.userLayout>>(`/api/v2/user/layouts/${id}`)
}

/**
 * 获取聚合设备
 * v2: GET /api/v2/user/aggregations/:id
 */
export const getAggregation = (id: string) => {
  return Get<universalResult<Uart.Aggregation>>(`/api/v2/user/aggregations/${id}`)
}

/**
 * 添加聚合设备
 * v2: POST /api/v2/user/aggregations
 */
export const addAggregation = (name: string, aggs: Uart.AggregationDev[]) => {
  return Post<universalResult<any>>('/api/v2/user/aggregations', { name, aggs })
}

/**
 * 删除聚合设备
 * v2: DEL /api/v2/user/aggregations/:id
 */
export const deleteAggregation = (id: string) => {
  return Del<universalResult<any>>(`/api/v2/user/aggregations/${id}`)
}

/**
 * 设置用户布局配置
 * v2: POST /api/v2/user/layouts
 */
export const setUserLayout = (
  id: string,
  type: string,
  bg: string,
  Layout: Uart.AggregationLayoutNode[]
) => {
  return Post<universalResult<Uart.ApolloMongoResult>>('/api/v2/user/layouts', { id, type, bg, Layout })
}

/**
 * 根据mac和pid获取挂载设备
 * v2: GET /api/v2/user/protocols/device/:mac/mount/:pid
 */
export const getTerminalPidProtocol = (mac: string, pid: number | string) => {
  return Get<universalResult<Uart.TerminalMountDevs>>(`/api/v2/user/protocols/device/${encodeURIComponent(mac)}/mount/${pid}`)
}

// ─── Amap (external) ─────────────────────────────────────────────────────────

const AmapKey: string = '0e99d0426f1afb11f2b95864ebd898d0'
const ApiAddress: string = 'https://restapi.amap.com/v3/'

type restype = 'ip' | 'geocode/geo' | 'geocode/regeo' | 'assistant/coordinate/convert'

interface AmapResonp {
  status: string;
  info: string;
  infocode: string;
}

interface AmapResonpGeocodeGeo extends AmapResonp {
  count: string;
  geocodes: {
    formatted_address: string;
    country: string;
    province: string;
    citycode: string;
    city: string;
    district: string;
    adcode: string;
    street: string;
    number: string;
    location: string;
    level: string;
  }[];
}

interface AmapResonpGeocodeRegeo extends AmapResonp {
  regeocode: { formatted_address: string };
}

interface AmapResonpAutonavi extends AmapResonp {
  locations: string;
}

// 地址转gps
export const Aamp_address2local = (address: string) => {
  return AmapGet<AmapResonpGeocodeGeo>('geocode/geo', { address })
}

// gps转地址
export const Aamp_local2address = (location: string) => {
  return AmapGet<AmapResonpGeocodeRegeo>('geocode/regeo', { location })
}

// gps转高德gps
export const Aamp_gps2autoanvi = (coordsys: 'gps' | 'mapbar' | 'baidu', locations: string) => {
  return AmapGet<AmapResonpAutonavi>('assistant/coordinate/convert', { coordsys, locations })
}

async function AmapGet<T>(type: restype, params: Record<string, string>): Promise<T> {
  const result = await Get<universalResult<T>>(ApiAddress + type, { key: AmapKey, ...params })
  return result.data
}
