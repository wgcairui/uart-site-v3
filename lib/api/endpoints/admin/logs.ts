// 管理员端 Logs API  (/api/v2/admin/logs)
import { Post, Get } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

export type logAggs<T = number> = Pick<Uart.logTerminals, "type" | "msg"> & { timeStamp: T }

export const lognodes = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logNodes>>>('/api/v2/admin/logs/nodes', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logterminals = (start: string, end: string, mac?: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logTerminals>>>('/api/v2/admin/logs/terminals', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), mac, ...query })
export const logsmssends = (start: string, end: string, phone?: string, query?: Uart.SmsSendListReq) =>
  Post<universalResult<V2ListResponse<Uart.logSmsSend>>>('/api/v2/admin/logs/sms', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), phone, ...query })
export const logsmssendsCountInfo = () => Post<universalResult<{ _id: string, sum: number }[]>>('/api/v2/admin/logs/sms/count-info', {})
/**
 * 短信时间分桶统计 (server feat/mail-sms-filter-ui)
 * 出参: { total, month, week, day, tags: [] }
 */
export const logSmsTimeBucket = (start: string | number, end: string | number) =>
  Post<universalResult<Uart.UartAlarmTimeBucket>>(
    '/api/v2/admin/logs/sms/count-by-bucket',
    {
      startTs: typeof start === 'string' ? new Date(start).getTime() : start,
      endTs: typeof end === 'string' ? new Date(end).getTime() : end,
    },
  )
export const logmailsends = (start: string, end: string, query?: Uart.MailSendListReq) =>
  Post<universalResult<V2ListResponse<Uart.logMailSend>>>('/api/v2/admin/logs/mail', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
/**
 * 邮件时间分桶统计 (server feat/mail-sms-filter-ui)
 * 出参: { total, month, week, day, tags: [] } (mail/sms 不返 tag 分布)
 */
export const logMailTimeBucket = (start: string | number, end: string | number) =>
  Post<universalResult<Uart.UartAlarmTimeBucket>>(
    '/api/v2/admin/logs/mail/count-by-bucket',
    {
      startTs: typeof start === 'string' ? new Date(start).getTime() : start,
      endTs: typeof end === 'string' ? new Date(end).getTime() : end,
    },
  )
export const loguartterminaldatatransfinites = (start: string, end: string, query?: Uart.UartAlarmListReq) =>
  Post<universalResult<V2ListResponse<Uart.uartAlarmObject>>>('/api/v2/admin/logs/transfinite', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
/**
 * 告警时间分桶统计 (server feat/alarm-time-bucket)
 * - total: 当前时间窗内真实总数
 * - month: 自然月 1号 → endTs (cairui 拍 "自然周" 13:48, 月同口径)
 * - week:  自然周 周一 → endTs
 * - day:   今天 00:00 → endTs
 * - tags:  当前时间窗内 tag 分布 [{ type, value }], 跟前 PageSummary tag 分布卡联动
 *
 * 注: 之前 client 端用 items (≤200) 算"月/周/日"偏低, 这次 server 端
 *     走 countDocuments, 准确率跟时间窗内真实数量一致
 */
export const logAlarmTimeBucket = (start: string | number, end: string | number) =>
  Post<universalResult<Uart.UartAlarmTimeBucket>>(
    '/api/v2/admin/logs/transfinite/count-by-bucket',
    {
      startTs: typeof start === 'string' ? new Date(start).getTime() : start,
      endTs: typeof end === 'string' ? new Date(end).getTime() : end,
    },
  )
export const loguserlogins = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logUserLogins>>>('/api/v2/admin/logs/user-logins', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const loguserrequsts = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.logUserRequst>>>('/api/v2/admin/logs/user-requests', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logwxsubscribes = (start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.WX.wxsubscribeMessage>>>('/api/v2/admin/logs/wx-subscribes', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query })
export const logterminalAggs = (mac: string, start: string, end: string, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/terminal-aggs', { startTs: new Date(start).getTime(), endTs: new Date(end).getTime(), ...query, filters: { mac, ...(query?.filters || {}) } })

/** admin terminal timeline — server feat/log-terminal-timeline @ 0cc02dd */
export interface TerminalTimelineQuery extends PaginationReq {
  kinds?: Uart.TerminalEventKind[]
  includeNodeEvents?: boolean
}
export const logTerminalTimeline = (
  mac: string,
  start: string | number,
  end: string | number,
  query?: TerminalTimelineQuery,
) =>
  Post<universalResult<V2ListResponse<Uart.TerminalTimelineItem>>>(
    '/api/v2/admin/logs/terminal/timeline',
    {
      mac,
      startTs: typeof start === 'string' ? new Date(start).getTime() : start,
      endTs: typeof end === 'string' ? new Date(end).getTime() : end,
      ...(query?.kinds?.length ? { kinds: query.kinds } : {}),
      ...(query?.includeNodeEvents !== undefined ? { includeNodeEvents: query.includeNodeEvents } : {}),
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 50,
    },
  )

/** admin server-error log list — server feat/admin-server-errors (PR #28)
 *  POST 风格: filters (exact $in 白名单) + search (regex 模糊白名单)
 *  ⚠️ path 是 /logs/ (带 s), 跟 admin-log.controller.ts prefix 一致
 *  字段名权威源: midwayuartserver/src/module/log/entity/server-error-record.entity.ts
 */
export const logservererrors = (query: Uart.ServerErrorListReq) =>
  Post<universalResult<V2ListResponse<Uart.ServerErrorRecord>>>(
    '/api/v2/admin/logs/server-errors/list',
    {
      startTs: query.startTs,
      endTs: query.endTs,
      ...(query.filters && Object.keys(query.filters).length ? { filters: query.filters } : {}),
      ...(query.search && Object.keys(query.search).length ? { search: query.search } : {}),
      ...(query.sortBy ? { sortBy: query.sortBy } : {}),
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    },
  )

/** 详情 — GET 风格: 按 requestId 单条拉, 不分页
 *  404 case: server 端抛 Error → middleware 返 500, 前端按 500 处理
 */
export const logservererrorById = (requestId: string) =>
  Get<universalResult<Uart.ServerErrorRecord>>(
    `/api/v2/admin/logs/server-errors/${encodeURIComponent(requestId)}`,
  )
export const logUserAggs = (user: string, start: number, end: number, query?: PaginationReq) =>
  Post<universalResult<V2ListResponse<logAggs>>>('/api/v2/admin/logs/user-aggs', { startTs: start, endTs: end, ...query, filters: { user, ...(query?.filters || {}) } })

// DEPRECATED — no server-side implementation (return 404)
export const getUseBtyes = (_mac: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const getDtuBusy = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logDevUseTime = (_mac: string, _start: string, _end: string, _query?: PaginationReq) => Promise.resolve({ code: 0, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, msg: 'DEPRECATED' } as any)
export const logInstructQuery = (_mac: string) => Promise.resolve({ code: 0, data: [], msg: 'DEPRECATED' } as any)

// ─── UserJourney 业务事件追踪 (cairui 09:09 拍板 #1+2+3+4) ─────────────
// 跟 loguserrequsts (per-request) 双轨 30d, 后续根据 admin 反馈再决定是否废弃 UserRequests
// 端点 schema 跟 server-errors / scheduled-ops 一致 (复用 buildPaginationQuery)

/** journey list 端点 — POST 风格, time range + filters + search + sort + pagination
 *  ⚠️ 跟 server-errors 一致: path 用 /log/ (单数) 跟 admin-log.controller.ts 对齐
 *  ⚠️ query 字段名权威源: midwayuartserver src/module/log/dto/list-user-journey.dto.ts
 */
export const loguserjourneys = (query: Uart.UserJourneyListReq) =>
  Post<universalResult<V2ListResponse<Uart.UserJourney>>>(
    '/api/v2/admin/logs/user-journeys/list',
    {
      startTs: query.startTs,
      endTs: query.endTs,
      ...(query.filters && Object.keys(query.filters).length ? { filters: query.filters } : {}),
      ...(query.search && Object.keys(query.search).length ? { search: query.search } : {}),
      ...(query.sortBy ? { sortBy: query.sortBy } : {}),
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      needTotal: query.needTotal ?? true,
    },
  )

/** journey 详情 — GET 风格, 一次返完整 steps (limit=1000 兜底, sibling 拍板不分页)
 *  ⚠️ journeyId 字段加了 @index 但时序表不生效, server 端走 timeStamp 30d 范围扫描
 *  404 case: server 端抛 Error → middleware 返 500, 前端按 500 处理 (跟 logservererrorById 一致)
 */
export const loguserjourneyById = (journeyId: string) =>
  Get<universalResult<Uart.UserJourney>>(
    `/api/v2/admin/logs/user-journeys/${encodeURIComponent(journeyId)}`,
  )