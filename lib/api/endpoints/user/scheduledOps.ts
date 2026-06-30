// 用户端 Scheduled Operations API
// 创建端点嵌在 user-device 路径下, 列表/详情/启停独立 /api/v2/user/scheduled-ops
import { Get, Post, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

/** 创建定时操作 (POST /api/v2/user/devices/:mac/mount/:pid/scheduled-op)
 *  - user 端强制 isBindMac 校验
 *  - mac / pid 从路径取, body 只需 protocol / content / scheduledAt / remark
 */
export const createUserScheduledOp = (
  mac: string,
  pid: number,
  req: Pick<Uart.CreateScheduledOpReq, 'protocol' | 'content' | 'scheduledAt' | 'remark'>
) =>
  Post<universalResult<{ id: string; scheduledAt: number; status: Uart.ScheduledOpStatus }>>(
    `/api/v2/user/devices/${encodeURIComponent(mac)}/mount/${pid}/scheduled-op`,
    req
  )

/** 列表分页 (POST /api/v2/user/scheduled-ops/list)
 *  - user 端自动按 createdBy=user.user 过滤 (后端强制)
 */
export const listUserScheduledOps = (query: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.ScheduledOperation>>>(
    '/api/v2/user/scheduled-ops/list',
    query
  )

/** 详情 (GET /api/v2/user/scheduled-ops/:id) */
export const getUserScheduledOp = (id: string) =>
  Get<universalResult<Uart.ScheduledOperation>>(
    `/api/v2/user/scheduled-ops/${encodeURIComponent(id)}`
  )

/** 取消 (POST /api/v2/user/scheduled-ops/:id/cancel) */
export const cancelUserScheduledOp = (id: string) =>
  Post<universalResult<{ id: string; status: Uart.ScheduledOpStatus }>>(
    `/api/v2/user/scheduled-ops/${encodeURIComponent(id)}/cancel`,
    {}
  )

/** 立即触发 (POST /api/v2/user/scheduled-ops/:id/trigger) */
export const triggerUserScheduledOp = (id: string) =>
  Post<universalResult<{ id: string; status: Uart.ScheduledOpStatus }>>(
    `/api/v2/user/scheduled-ops/${encodeURIComponent(id)}/trigger`,
    {}
  )

/** 删除 (DEL /api/v2/user/scheduled-ops/:id) */
export const deleteUserScheduledOp = (id: string) =>
  Del<universalResult<{ id: string }>>(
    `/api/v2/user/scheduled-ops/${encodeURIComponent(id)}`
  )
