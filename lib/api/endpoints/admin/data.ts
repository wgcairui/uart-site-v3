// 管理员端 Data 域 BFF (alias /api/v2/admin/data/*)
// 配对 midwayuartserver PR #116 (feat/admin-reparse) 2026-07-27
// 配套 UI: components/data/ReparseDiffModal.tsx
// 入口: app/(admin)/admin/node/terminal/[mac]/mount-dev/[pid]/page.tsx 历史数据 tab
import { Post } from '@/lib/api/fetch'
import { universalResult } from '@/types'

/** POST /api/v2/admin/data/reparse request */
export interface ReparseRequest {
  /** client.resultcolltions._id (24 hex) */
  resultId: string
  /** 不传 = latest；传 = 该 version (>=1) */
  protocolVersion?: number
}

/** 解析后的单条参数 (跟 result[name]/value/parseValue/unit 对齐) */
export interface ReparseParam {
  name: string
  value: string
  parseValue: string
  unit?: string
}

/** 差异行 (per name, 跟 name union 关联 old/new) */
export interface ReparseDiffRow {
  name: string
  changed: boolean
  /** changed = false 时以下 4 字段都缺省 (前端不展示) */
  oldValue?: string
  newValue?: string
  oldParseValue?: string
  newParseValue?: string
}

/** POST /api/v2/admin/data/reparse response.data */
export interface ReparseResponse {
  /** 原始 bytes 转 UTF-8 string (调试用, 可能不可读) */
  raw: string
  /** 实际使用的协议 (新解析走哪个) */
  protocol: {
    name: string
    version: number
    type: string
    instruct: string[]
  }
  /** result 当时 (写入时) 用的协议解析结果 */
  old: ReparseParam[]
  /** 当前 protocol 解析结果 */
  new: ReparseParam[]
  /** per-name diff (新增 / 删除 / 变更都标 changed) */
  diff: ReparseDiffRow[]
  /** 备注 (e.g. raw 找不到 / protocol 找不到时 server 返回 404 + notes) */
  notes?: string
}

/**
 * 对历史 result 行调最新协议重跑 raw bytes, 返回 old/new 解析结果 + diff
 *
 * 错误契约 (跟 server feat/admin-reparse 端点对齐):
 * - 400: resultId 格式错
 * - 404: 找不到 result / raw (90d TTL 过期) / mountDev / protocol version
 * - 500: 解析失败
 */
export const postReparse = (body: ReparseRequest) =>
  Post<universalResult<ReparseResponse>>('/api/v2/admin/data/reparse', body)
