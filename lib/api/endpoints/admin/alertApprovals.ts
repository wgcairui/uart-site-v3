// 管理员端 Alert Approval API
// 路径前缀: /api/v2/admin/alert-approvals
// server 端权威源: midwayuartserver/src/module/alert-approval/
// DTO 字段名权威源: types/uart.d.ts (UartAlertApprovalQueue* / UartAlertApprovalStats)
import { Get, Post } from '@/lib/api/fetch'
import { universalResult, V2ListResponse } from '@/types'

/** 列表分页 (POST /api/v2/admin/alert-approvals/list) */
export const listAlertApprovals = (query: Uart.UartAlertApprovalQueueListReq) =>
  Post<universalResult<V2ListResponse<Uart.UartAlertApprovalQueue>>>(
    '/api/v2/admin/alert-approvals/list',
    query
  )

/** 详情 (GET /api/v2/admin/alert-approvals/:id) */
export const getAlertApproval = (id: string) =>
  Get<universalResult<Uart.UartAlertApprovalQueue>>(
    `/api/v2/admin/alert-approvals/${encodeURIComponent(id)}`
  )

/** 批准 (POST /api/v2/admin/alert-approvals/:id/approve) — 立即发 */
export const approveAlertApproval = (id: string, req: Uart.UartAlertApprovalDecisionDto = {}) =>
  Post<universalResult<{ id: string; status: 'approved' }>>(
    `/api/v2/admin/alert-approvals/${encodeURIComponent(id)}/approve`,
    req
  )

/** 拒绝 (POST /api/v2/admin/alert-approvals/:id/reject) — 写 audit, 不发 */
export const rejectAlertApproval = (id: string, req: Uart.UartAlertApprovalDecisionDto) =>
  Post<universalResult<{ id: string; status: 'rejected' }>>(
    `/api/v2/admin/alert-approvals/${encodeURIComponent(id)}/reject`,
    req
  )

/** 取消 (POST /api/v2/admin/alert-approvals/:id/cancel) — 撤回延迟告警 */
export const cancelAlertApproval = (id: string, req: Uart.UartAlertApprovalDecisionDto = {}) =>
  Post<universalResult<{ id: string; status: 'cancelled' }>>(
    `/api/v2/admin/alert-approvals/${encodeURIComponent(id)}/cancel`,
    req
  )

/** 批量批准 (POST /api/v2/admin/alert-approvals/batch-approve) */
export const batchApproveAlertApprovals = (req: Uart.UartAlertApprovalBatchDecisionDto) =>
  Post<universalResult<{ succeeded: string[]; failed: { id: string; error: string }[] }>>(
    '/api/v2/admin/alert-approvals/batch-approve',
    req
  )

/** 批量拒绝 (POST /api/v2/admin/alert-approvals/batch-reject) */
export const batchRejectAlertApprovals = (req: Uart.UartAlertApprovalBatchDecisionDto) =>
  Post<universalResult<{ succeeded: string[]; failed: { id: string; error: string }[] }>>(
    '/api/v2/admin/alert-approvals/batch-reject',
    req
  )

/** 统计 (GET /api/v2/admin/alert-approvals/stats) */
export const getAlertApprovalStats = () =>
  Get<universalResult<Uart.UartAlertApprovalStats>>(
    '/api/v2/admin/alert-approvals/stats'
  )
