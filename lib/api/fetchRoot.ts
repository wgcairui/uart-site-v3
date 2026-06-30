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

export type { PaginationReq, V2ListResponse } from '@/types'