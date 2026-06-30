// 管理员端 Scheduled Operations API
// 路径前缀: /api/v2/admin/scheduled-ops
import { Get, Post, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

/** 创建定时操作 (POST /api/v2/admin/scheduled-ops) */
export const createScheduledOp = (req: Uart.CreateScheduledOpReq) =>
  Post<universalResult<{ id: string; scheduledAt: number; status: Uart.ScheduledOpStatus }>>(
    '/api/v2/admin/scheduled-ops',
    req
  )

/** 列表分页 (POST /api/v2/admin/scheduled-ops/list) */
export const listScheduledOps = (query: PaginationReq) =>
  Post<universalResult<V2ListResponse<Uart.ScheduledOperation>>>(
    '/api/v2/admin/scheduled-ops/list',
    query
  )

/** 详情 (GET /api/v2/admin/scheduled-ops/:id) */
export const getScheduledOp = (id: string) =>
  Get<universalResult<Uart.ScheduledOperation>>(
    `/api/v2/admin/scheduled-ops/${encodeURIComponent(id)}`
  )

/** 取消 (POST /api/v2/admin/scheduled-ops/:id/cancel) */
export const cancelScheduledOp = (id: string) =>
  Post<universalResult<{ id: string; status: Uart.ScheduledOpStatus }>>(
    `/api/v2/admin/scheduled-ops/${encodeURIComponent(id)}/cancel`,
    {}
  )

/** 立即触发 (POST /api/v2/admin/scheduled-ops/:id/trigger) */
export const triggerScheduledOp = (id: string) =>
  Post<universalResult<{ id: string; status: Uart.ScheduledOpStatus }>>(
    `/api/v2/admin/scheduled-ops/${encodeURIComponent(id)}/trigger`,
    {}
  )

/** 删除 (DEL /api/v2/admin/scheduled-ops/:id) */
export const deleteScheduledOp = (id: string) =>
  Del<universalResult<{ id: string }>>(
    `/api/v2/admin/scheduled-ops/${encodeURIComponent(id)}`
  )
