// 用户端 User Profile / Device / Alarm Setup / Data / Protocol API
import { Get, Post, Patch, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

// ─── User Profile ────────────────────────────────────────────────────────────

/** 获取用户信息 v2: GET /api/v2/user/profile */
export const userInfo = () => {
  return Get<universalResult<Uart.UserInfo>>('/api/v2/user/profile')
}

/** 修改用户信息 v2: PATCH /api/v2/user/profile */
export const modifyUserInfo = (data: Partial<Uart.UserInfo>) => {
  return Patch<universalResult<any>>('/api/v2/user/profile', { ...data })
}

/** 获取公众号二维码 v2: GET /api/v2/user/profile/mp-ticket */
export const mpTicket = () => {
  return Get<universalResult<string>>('/api/v2/user/profile/mp-ticket')
}

/** 获取小程序二维码 v2: GET /api/v2/user/profile/wp-ticket */
export const wpTicket = () => {
  return Get<universalResult<string>>('/api/v2/user/profile/wp-ticket')
}

// ─── User Devices ────────────────────────────────────────────────────────────

/** 获取用户绑定设备 v2: GET /api/v2/user/devices */
export const BindDev = () => {
  return Get<universalResult<{ UTs: Uart.Terminal[] }>>('/api/v2/user/devices')
}

/** 获取用户告警 v2: POST /api/v2/user/alarms/history */
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
 * 校验 alarmId 是否是合法的 MongoDB ObjectId (24 位 hex)
 *
 * 用于 alarms 列表 / 详情页 / confirm 操作的统一守卫。
 * 2026-07-04 抽出独立函数，alarm/page.tsx + confrimAlarm 复用，
 * 避免在多处 inline regex 导致规则漂移。
 */
export const isValidAlarmId = (id?: string | null): id is string => {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)
}

/** 确认用户告警 v2: POST /api/v2/user/alarms/:id/confirm
 *
 * 2026-06-29 加 guard：24 位 hex regex 校验。fail 直接 reject，
 * 避免发出明知会 400 的请求（用户体验差）。
 *
 * 背景：server-errors-daily-scan 报告真实用户在 HarmonyOS + WeChat 内嵌
 * 浏览器触发 POST /alarms/undefined/confirm（id 是字面字符串 "undefined"），
 * server-side hex guard 正确返 400，但用户点了按钮没响应。根因是
 * 调用方传入 undefined / 缺失字段的 _id。
 *
 * 2026-07-04 加固：reject 替代 fake success response，避免 caller 误判
 * 为成功（之前用 code:0 模拟成功，caller 拿到后继续 setAlarmsData +
 * message.success，会误导用户）。
 *
 * 服务端 commit 0ea3bd5 (P4.1) 的 hex guard 已生效，这里不重复 server 校验，
 * 只是**防止发出明知会失败的请求**。
 */
export const confrimAlarm = (id?: string) => {
  if (!isValidAlarmId(id)) {
    if (typeof console !== 'undefined') {
      console.warn('[confrimAlarm] invalid alarmId, reject:', id)
    }
    return Promise.reject(new Error(`invalid alarmId (frontend guard): ${JSON.stringify(id)}`))
  }
  return Post<universalResult<any>>(`/api/v2/user/alarms/${id}/confirm`, {})
}

/** 获取指定且在线的终端 v2: GET /api/v2/user/devices/:mac/online */
export const getTerminalOnline = (mac: string) => {
  return Get<universalResult<Uart.Terminal | null>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/online`)
}

/** 修改用户设备别名 v2: PATCH /api/v2/user/devices/:mac */
export const modifyTerminal = (mac: string, name: string) => {
  return Patch<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`, { name })
}

/** 添加绑定设备 v2: POST /api/v2/user/devices */
export const addUserTerminal = (mac: string) => {
  return Post<universalResult<any>>('/api/v2/user/devices', { mac })
}

/** 删除绑定设备 v2: DEL /api/v2/user/devices/:mac */
export const delUserTerminal = (mac: string) => {
  return Del<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`)
}

/** 获取设备类型 v1 fallback: POST /api/getDevTypes (no user-facing v2 yet) */
export const getDevTypes = (Type: string, query?: PaginationReq) => {
  return Post<universalResult<V2ListResponse<Uart.DevsType>>>('/api/getDevTypes', { Type, ...query })
}

/** 删除终端挂载设备 v2: DEL /api/v2/user/devices/:mac/mount/:pid */
export const delTerminalMountDev = (mac: string, pid: number) => {
  return Del<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}`)
}

/** 添加用户终端挂载设备 v2: POST /api/v2/user/devices/:mac/mount */
export const addTerminalMountDev = (mac: string, mountDev: Uart.TerminalMountDevs) => {
  return Post<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount`, { mountDev })
}

// ─── User Alarm Setup ────────────────────────────────────────────────────────

/** 获取用户告警配置 v2: GET /api/v2/user/alarms/setup */
export const getUserAlarmSetup = () => {
  return Get<universalResult<Uart.userSetup>>('/api/v2/user/alarms/setup')
}

/** 修改用户告警配置联系方式 v2: PATCH /api/v2/user/alarms/setup */
export const modifyUserAlarmSetupTel = (tels: string[], mails: string[]) => {
  return Patch<universalResult<any>>('/api/v2/user/alarms/setup', { tels, mails })
}

/** 获取用户单个协议告警配置 v2: GET /api/v2/user/alarms/setup/protocols/:name */
export const getUserAlarmProtocol = (protocol: string) => {
  return Get<universalResult<Uart.ProtocolConstantThreshold>>(`/api/v2/user/alarms/setup/protocols/${encodeURIComponent(protocol)}`)
}

/** 获取单个协议告警配置 (系统默认) v2: GET /api/v2/user/alarms/protocols/:name/thresholds */
export const getAlarmProtocol = (protocol: string) => {
  return Get<universalResult<Uart.ProtocolConstantThreshold>>(`/api/v2/user/alarms/protocols/${encodeURIComponent(protocol)}/thresholds`)
}

// ─── User Device Data ────────────────────────────────────────────────────────

/** 获取用户设备运行数据 v2: GET /api/v2/user/devices/:mac/mount/:pid/data */
export const getTerminalData = (mac: string, pid: number | string) => {
  return Get<universalResult<Uart.queryResultSave>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/data`)
}

interface datas {
  name: string;
  value: string;
  time: number;
}

/** 获取用户设备历史运行数据 v2: POST /api/v2/user/devices/:mac/mount/:pid/data/history */
export const getTerminalDatasV2 = (
  mac: string,
  pid: number | string,
  name: string | string[],
  start: number,
  end: number,
  query?: PaginationReq
) => {
  const names = typeof name === 'string' ? name : name.length > 1 ? name : name[0] || []
  const safePid = Number(pid) || 0
  return Post<universalResult<V2ListResponse<datas>>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${safePid}/data/history`, {
    name: names,
    start,
    end,
    ...query,
  })
}

/** 折线图专用：单次最多 2000 点，服务端可选去重。POST /api/v2/user/devices/:mac/mount/:pid/data/chart */
export interface ChartDataItem {
  name: string;
  value: string;
  time: number;
  unit?: string;
  parseValue?: string;
  issimulate?: boolean;
}
export interface ChartDataResponse {
  items: ChartDataItem[];
  total: number;        // 原始点数
  deduped: number;      // 被去重掉的点数
  returned: number;     // 实际返回点数（可能 < total 因为 maxPoints 采样）
  dedup: boolean;
}
export const getDeviceChartData = (
  mac: string,
  pid: number | string,
  name: string | string[],
  start: number,
  end: number,
  options?: { dedup?: boolean; maxPoints?: number }
) => {
  const names = typeof name === 'string' ? name : name.length > 1 ? name : name[0] || []
  const safePid = Number(pid) || 0
  return Post<universalResult<ChartDataResponse>>(
    `/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${safePid}/data/chart`,
    {
      name: names,
      start,
      end,
      dedup: options?.dedup ?? true,
      maxPoints: options?.maxPoints ?? 500,
    }
  )
}

/** 重置设备超时状态 v2: POST /api/v2/user/devices/:mac/mount/:pid/refresh */
export const refreshDevTimeOut = (mac: string, pid: number, interVal?: number) => {
  return Post<universalResult<any>>(`/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/refresh`, { interVal })
}

/** 固定发送设备操作指令 v2: POST /api/v2/user/devices/:mac/mount/:pid/instruct */
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

/** 获取指定协议 v2: GET /api/v2/user/protocols/:name */
export const getProtocol = (protocol: string) => {
  return Get<universalResult<Uart.protocol>>(`/api/v2/user/protocols/${encodeURIComponent(protocol)}`)
}

/** 设置用户自定义设置(协议配置) v2: POST /api/v2/user/protocols/setup */
export const setUserSetupProtocol = (protocol: string, type: Uart.ConstantThresholdType, arg: any) => {
  return Post<universalResult<Uart.ApolloMongoResult>>('/api/v2/user/protocols/setup', { protocol, type, arg })
}

/** 获取协议告警数据集合 v2: POST /api/v2/user/protocols/setup/details */
export const getProtocolSetup = <T = string>(
  protocol: string,
  type: Uart.ConstantThresholdType,
  user?: string
) => {
  return Post<universalResult<{ sys: T[]; user: T[] }>>('/api/v2/user/protocols/setup/details', { protocol, type, user })
}

/** 获取终端信息 v2: GET /api/v2/user/devices/:mac */
export const getTerminal = (mac: string) => {
  return Get<universalResult<Uart.Terminal>>(`/api/v2/user/devices/${encodeURIComponent(mac)}`)
}

// ─── User Layout / Aggregation ───────────────────────────────────────────────

/** 获取用户布局配置 v2: GET /api/v2/user/layouts/:id */
export const getUserLayout = (id: string) => {
  return Get<universalResult<Uart.userLayout>>(`/api/v2/user/layouts/${id}`)
}

/** 获取聚合设备 v2: GET /api/v2/user/aggregations/:id */
export const getAggregation = (id: string) => {
  return Get<universalResult<Uart.Aggregation>>(`/api/v2/user/aggregations/${id}`)
}

/** 添加聚合设备 v2: POST /api/v2/user/aggregations */
export const addAggregation = (name: string, aggs: Uart.AggregationDev[]) => {
  return Post<universalResult<any>>('/api/v2/user/aggregations', { name, aggs })
}

/** 删除聚合设备 v2: DEL /api/v2/user/aggregations/:id */
export const deleteAggregation = (id: string) => {
  return Del<universalResult<any>>(`/api/v2/user/aggregations/${id}`)
}

/** 设置用户布局配置 v2: POST /api/v2/user/layouts */
export const setUserLayout = (
  id: string,
  type: string,
  bg: string,
  Layout: Uart.AggregationLayoutNode[]
) => {
  return Post<universalResult<Uart.ApolloMongoResult>>('/api/v2/user/layouts', { id, type, bg, Layout })
}

/** 根据mac和pid获取挂载设备 v2: GET /api/v2/user/protocols/device/:mac/mount/:pid */
export const getTerminalPidProtocol = (mac: string, pid: number | string) => {
  return Get<universalResult<Uart.TerminalMountDevs>>(`/api/v2/user/protocols/device/${encodeURIComponent(mac)}/mount/${pid}`)
}