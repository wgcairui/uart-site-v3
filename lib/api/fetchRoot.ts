// 管理员端 API 桶 - barrel re-export
// 实际实现按业务域拆到 lib/api/endpoints/admin/，这里保持向后兼容

export * from '@/lib/api/endpoints/admin/dashboard'
export * from '@/lib/api/endpoints/admin/users'
export * from '@/lib/api/endpoints/admin/terminals'
export * from '@/lib/api/endpoints/admin/protocols'
export * from '@/lib/api/endpoints/admin/nodes'
export * from '@/lib/api/endpoints/admin/logs'
export * from '@/lib/api/endpoints/admin/system'
export * from '@/lib/api/endpoints/admin/scheduledOps'
export * from '@/lib/api/endpoints/admin/ai'
// feat/feature-flag-platform 2026-07-21
export * from '@/lib/api/endpoints/admin/featureFlags'
export * from '@/lib/api/endpoints/admin/alertApprovals'
// feat/ai-ops (server PR #106): AI token 签发 + 一站式诊断 + 系统健康
export * from '@/lib/api/endpoints/admin/aiOps'

export type { PaginationReq, V2ListResponse } from '@/types'