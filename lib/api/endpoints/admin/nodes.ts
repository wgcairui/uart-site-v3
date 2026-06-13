// 管理员端 Nodes API  (/api/v2/admin/dashboard/nodes)
// nodeTokenHash 永远不返回；用 hasToken 派生字段判断是否已配置 token
import { Get, Post, Del } from '@/lib/api/fetch'
import { universalResult, PaginationReq } from '@/types'

/** rotateNodeToken 的单条返回项 */
export interface NodeTokenPlain {
  Name: string;
  plainToken: string;
}

/** POST /nodes 创建/更新响应：新建时 plainToken 有值，更新时 plainToken 为 undefined */
export interface SetNodeResult {
  node: Uart.NodeClient;
  plainToken?: string;
}

export const Node = (name: string) => Get<universalResult<Uart.NodeClient>>(`/api/v2/admin/dashboard/nodes/${encodeURIComponent(name)}`)
export const Nodes = (query?: PaginationReq) => Get<universalResult<Uart.NodeClient[]>>('/api/v2/admin/dashboard/nodes', { ...query as any })
export const setNode = (Name: string, IP: string, Port: number, MaxConnections: number) =>
  Post<universalResult<SetNodeResult>>('/api/v2/admin/dashboard/nodes', { Name, IP, Port, MaxConnections })
export const deleteNode = (Name: string) => Del<universalResult<string[]>>(`/api/v2/admin/dashboard/nodes/${encodeURIComponent(Name)}`)
export const rotateNodeToken = (Name: string) => Post<universalResult<NodeTokenPlain>>(`/api/v2/admin/dashboard/nodes/${encodeURIComponent(Name)}/rotate-token`, {})