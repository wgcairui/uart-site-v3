/**
 * 管理员端 AI Ops API (server feat/ai-ops @ PR #106)
 *
 * 端点分两类：
 * 1. issue-ai-token (admin 自己用, admin 鉴权) — admin 调一次拿 AI 专用 token
 * 2. ai-ops/diagnose + ai-ops/system/health (admin 鉴权, 调用方便内部用)
 *    注: server 端 RoleType.AI 也有权限, 但 admin token 也可以调, 跟其他
 *    admin endpoint 一样
 *
 * 注意:
 * - 所有 endpoint 走 admin 鉴权 (AI token 在生产环境是离线 Mavis skill 用, web 端
 *   admin token 调一次拿 token 字符串 + 展示 + 复制即可)
 * - issue-ai-token 返回的 token **不可在 web 端用** (会让 admin 当前 session 失效) —
 *   它是给 AI/Mavis 在命令行 / 其他工具用的, web 端只展示不调用
 * - diagnose 5 维数据走 server 端 Promise.all 并行, 单维度失败不阻断其他维度
 *
 * 字段名权威源: midwayuartserver/src/module/ai-ops/ + midwayuartserver/src/module/auth/
 */
import { Get, Post } from '@/lib/api/fetch'
import { universalResult } from '@/types'

/**
 * POST /api/v2/admin/auth/issue-ai-token
 * admin 调一次拿 AI 专用 long-lived stateless JWT, 30d 有效
 * 返回的 token 拿到后只展示 + 复制, **不要** 用它调 web 端任何 endpoint
 * (会让 admin 当前 session 失效 / 跟 admin token 错位)
 */
export const issueAiToken = (dto: Uart.AiTokenIssueDto) =>
  Post<universalResult<Uart.AiTokenIssueResult>>(
    '/api/v2/admin/auth/issue-ai-token',
    dto,
  )

/**
 * POST /api/v2/admin/ai-ops/diagnose
 * 一站式设备诊断: mac + 可选 5 维 include 开关 + limit
 * 5 维数据 (terminal / heartbeat / instructHistory / alarms / transitions) 并行返回
 * 单维度失败不影响其他, 失败维度 fallback null
 */
export const aiOpsDiagnose = (dto: Uart.AiDiagnoseReq) =>
  Post<universalResult<Uart.AiDiagnoseResult>>(
    '/api/v2/admin/ai-ops/diagnose',
    dto,
  )

/**
 * GET /api/v2/admin/ai-ops/system/health
 * 系统健康: server uptime / mongo ping / redis ping / 5xx 计数 / 设备统计
 * overall 枚举: 'healthy' | 'degraded' | 'down'
 */
export const aiOpsSystemHealth = () =>
  Get<universalResult<Uart.AiSystemHealthResult>>(
    '/api/v2/admin/ai-ops/system/health',
  )
