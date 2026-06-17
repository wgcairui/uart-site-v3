// 用户端 API 桶 - barrel re-export
// 实际实现按业务域拆到 lib/api/endpoints/，这里保持向后兼容

// 底层请求方法（headers / fetch 封装）
export { Get, Post, Put, Patch, Del, header, getToken } from '@/lib/api/fetch-impl'

// Auth / Guest / Open Utils
export * from '@/lib/api/endpoints/auth'

// User Profile / Device / Alarm / Data / Protocol
export * from '@/lib/api/endpoints/user'

// Amap (external)
export * from '@/lib/api/endpoints/amap'

// 重新导出 PaginationReq / V2ListResponse 方便使用方 import
export type { PaginationReq, V2ListResponse } from '@/types'