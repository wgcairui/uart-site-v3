// 管理员端 Feature Flag API
// 路径前缀: /api/v2/admin/feature-flags
// server 端权威源: midwayuartserver/src/module/feature-flag/
// DTO 字段名权威源: types/uart.d.ts (UartFeatureFlag* / UartFeatureFlagEvaluation)
import { Get, Post, Put, Del } from '@/lib/api/fetch'
import { universalResult, V2ListResponse } from '@/types'

/** 列表分页 (POST /api/v2/admin/feature-flags/list) */
export const listFeatureFlags = (query: Uart.UartFeatureFlagListReq) =>
  Post<universalResult<V2ListResponse<Uart.UartFeatureFlag>>>(
    '/api/v2/admin/feature-flags/list',
    query
  )

/** 详情 (GET /api/v2/admin/feature-flags/:id) */
export const getFeatureFlag = (id: string) =>
  Get<universalResult<Uart.UartFeatureFlag>>(
    `/api/v2/admin/feature-flags/${encodeURIComponent(id)}`
  )

/** 按 key 查 (GET /api/v2/admin/feature-flags/by-key/:key) — 评估器内部用 */
export const getFeatureFlagByKey = (key: string) =>
  Get<universalResult<Uart.UartFeatureFlag>>(
    `/api/v2/admin/feature-flags/by-key/${encodeURIComponent(key)}`
  )

/** 创建 (POST /api/v2/admin/feature-flags) */
export const createFeatureFlag = (req: Uart.UartFeatureFlagCreateDto) =>
  Post<universalResult<Uart.UartFeatureFlag>>(
    '/api/v2/admin/feature-flags',
    req
  )

/** 更新 (PUT /api/v2/admin/feature-flags/:id) — 含 killSwitch 切换 */
export const updateFeatureFlag = (id: string, req: Uart.UartFeatureFlagUpdateDto) =>
  Put<universalResult<Uart.UartFeatureFlag>>(
    `/api/v2/admin/feature-flags/${encodeURIComponent(id)}`,
    req
  )

/** 软删 (DEL /api/v2/admin/feature-flags/:id) — enabled=false */
export const deleteFeatureFlag = (id: string) =>
  Del<universalResult<{ id: string }>>(
    `/api/v2/admin/feature-flags/${encodeURIComponent(id)}`
  )

/** 复制 (POST /api/v2/admin/feature-flags/:id/duplicate) — key 加 -copy */
export const duplicateFeatureFlag = (id: string) =>
  Post<universalResult<Uart.UartFeatureFlag>>(
    `/api/v2/admin/feature-flags/${encodeURIComponent(id)}/duplicate`,
    {}
  )

/** 切换 kill switch (POST /api/v2/admin/feature-flags/:id/kill-switch) */
export const setFeatureFlagKillSwitch = (id: string, killSwitch: boolean, reason?: string) =>
  Post<universalResult<Uart.UartFeatureFlag>>(
    `/api/v2/admin/feature-flags/${encodeURIComponent(id)}/kill-switch`,
    { killSwitch, reason }
  )
