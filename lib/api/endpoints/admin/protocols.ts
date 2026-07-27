// 管理员端 Protocols / Device Types API
import { Get, Post, Put, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

// ─── Admin: Protocols  (/api/v2/admin/protocols) ──────────────────────────────

export const getProtocols = (query?: PaginationReq) => Post<universalResult<V2ListResponse<Uart.protocol>>>('/api/v2/admin/protocols/list', { ...query })
export const setProtocol = (Type: number, ProtocolType: string, Protocol: string, instruct: Uart.protocolInstruct[]) =>
  Post<universalResult<any>>('/api/v2/admin/protocols', { Type, Protocol, ProtocolType, instruct })
export const updateProtocol = (protocol: Uart.protocol) => Put<universalResult<any>>('/api/v2/admin/protocols', { protocol })
export const deleteProtocol = (protocol: string) => Del<universalResult<string[]>>(`/api/v2/admin/protocols/${encodeURIComponent(protocol)}`)
export const modifyProtocolRemark = (protocol: string, remark: string) => Post<universalResult<any>>('/api/v2/admin/protocols/remark', { protocol, remark })
export const addDevConstant = (ProtocolType: string, Protocol: string, type: Uart.ConstantThresholdType, arg: any) =>
  Post<universalResult<any>>('/api/v2/admin/protocols/dev-constant', { ProtocolType, Protocol, type, arg })
export const TestScriptStart = (scriptStart: string, name: string) => Post<universalResult<any>>('/api/v2/admin/protocols/test-script', { scriptStart, name })

// ─── Admin: Protocols  History / Rollback / Diff  (server PR #118, 2026-07-27) ──
//
// 配对 midwayuartserver PR #118 (feat/protocol-history-snapshot):
// - `protocols.history` collection 永久保存每个 version 的完整 instruct 快照
// - setProtocol 写入时自动 $inc version + snapshot 旧 v, 给 admin 提供回滚能力
// - 3 个新端点: history (列表) / rollback (回滚) / diff (字段级 diff)
//
// 配套 UI: components/protocol/ProtocolVersionHistory.tsx
// 入口: app/(admin)/admin/node/protocols/info?Protocol=xxx&tab=versionHistory

/** GET /api/v2/admin/protocols/history?Protocol=xxx response.item (字段精简, 不含 instruct 数组) */
export interface ProtocolHistoryItem {
  version: number
  /** 'admin' / 'ai-generate' / 'ai-chat' (回滚仍是 'admin') */
  source: string
  isCurrent: boolean
  createdAt?: string
  createdBy?: string
  replacedAt?: string
  replacedBy?: string
  instructCount: number
}

/** GET /api/v2/admin/protocols/diff?Protocol=xxx&v1=3&v2=4 response.data (per BE 实际 shape) */
export interface ProtocolVersionDiff {
  /** v2 有 v1 没有的 instruct (整对象, 不是只 name) */
  added: Array<{ name: string; value: any }>
  /** v1 有 v2 没有的 instruct (整对象) */
  removed: Array<{ name: string; value: any }>
  /** v1/v2 都有但内容不同 (BE 用 JSON.stringify 字段级比较, 剥 _id) */
  changed: Array<{ name: string; oldValue: any; newValue: any }>
  unchangedCount: number
}

/** GET /api/v2/admin/protocols/history?Protocol=xxx */
export const getProtocolHistory = (Protocol: string) =>
  Get<universalResult<{ items: ProtocolHistoryItem[]; total: number }>>(
    `/api/v2/admin/protocols/history?Protocol=${encodeURIComponent(Protocol)}`
  )

/** POST /api/v2/admin/protocols/rollback body: { Protocol, version } */
export const rollbackProtocol = (Protocol: string, version: number) =>
  Post<universalResult<{ newVersion: number; restoredFrom: number }>>(
    '/api/v2/admin/protocols/rollback',
    { Protocol, version }
  )

/** GET /api/v2/admin/protocols/diff?Protocol=xxx&v1=3&v2=4 */
export const diffProtocol = (Protocol: string, v1: number, v2: number) =>
  Get<universalResult<ProtocolVersionDiff>>(
    `/api/v2/admin/protocols/diff?Protocol=${encodeURIComponent(Protocol)}&v1=${v1}&v2=${v2}`
  )

// ─── Admin: Device Types  (/api/v2/admin/device-types) ─────────────────────────

export const DevTypes = (query?: PaginationReq) => Post<universalResult<V2ListResponse<(Uart.DevsType & { _id?: string })>>>('/api/v2/admin/device-types/list', { ...query })
export const DevType = (DevModel: string) => Get<universalResult<Uart.DevsType[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)
export const addDevType = (Type: string, DevModel: string, Protocols: Pick<Uart.protocol, "ProtocolType" | "Protocol">[]) =>
  Post<universalResult<any>>('/api/v2/admin/device-types', { Type, DevModel, Protocols })
export const deleteDevModel = (DevModel: string) => Del<universalResult<string[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)