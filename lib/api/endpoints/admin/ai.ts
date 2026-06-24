/**
 * 管理员端 AI 协议生成器 API
 *
 * 端点前缀 `/api/v2/admin/ai`，鉴权 ADMIN/ROOT。
 *
 * 注意：
 * - generate-stream / chat-stream 是 SSE（text/event-stream），不走 fetch-impl 的 JSON 解析；
 *   使用 `@/lib/hooks/useAiStream` 直接消费，**不要**用本文件的 wrapper 调用 SSE 端点。
 * - 本文件只暴露 dry-run 这种一次性 JSON 端点。
 *
 * 后端实现：`wgcairui/uart-server` `src/module/ai/controller/admin-ai.controller.ts`
 */
import { Post } from '@/lib/api/fetch'
import type { DryRunDto, DryRunResult } from '@/types/ai'

/**
 * POST /api/v2/admin/ai/dry-run
 * 一次性返回验证结果。**不要**轮询或订阅——后端 v1 不持久化历史。
 */
export const aiDryRun = (dto: DryRunDto) =>
  Post<{ code: number; data: DryRunResult; msg?: string }>('/api/v2/admin/ai/dry-run', dto)