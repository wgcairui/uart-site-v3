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

// ─── Admin: Device Types  (/api/v2/admin/device-types) ─────────────────────────

export const DevTypes = (query?: PaginationReq) => Post<universalResult<V2ListResponse<(Uart.DevsType & { _id?: string })>>>('/api/v2/admin/device-types/list', { ...query })
export const DevType = (DevModel: string) => Get<universalResult<Uart.DevsType[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)
export const addDevType = (Type: string, DevModel: string, Protocols: Pick<Uart.protocol, "ProtocolType" | "Protocol">[]) =>
  Post<universalResult<any>>('/api/v2/admin/device-types', { Type, DevModel, Protocols })
export const deleteDevModel = (DevModel: string) => Del<universalResult<string[]>>(`/api/v2/admin/device-types/${encodeURIComponent(DevModel)}`)