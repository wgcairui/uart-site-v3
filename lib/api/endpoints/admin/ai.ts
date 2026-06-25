/**
 * 管理员端 AI 协议生成器 API
 *
 * 端点前缀 `/api/v2/admin/ai`，鉴权 ADMIN/ROOT。
 *
 * 注意：
 * - generate-stream / chat-stream 是 SSE（text/event-stream），不走 fetch-impl 的 JSON 解析；
 *   使用 `@/lib/hooks/useAiStream` 直接消费，**不要**用本文件的 wrapper 调用 SSE 端点。
 * - 本文件只暴露一次性 JSON 端点：dry-run / upload-token / fetch-url / commit。
 *
 * 后端实现：`wgcairui/uart-server` `src/module/ai/controller/admin-ai.controller.ts`
 *
 * 2026-06-25 决策 13 阶段 1 改：新增 upload-token（OSS 预签名）/ fetch-url（后端抓网页）
 * / commit（两段式：OSS tmp → 永久区）三个端点 wrapper。
 */
import { Post } from '@/lib/api/fetch'
import type {
  CommitDto,
  CommitResult,
  DryRunDto,
  DryRunResult,
  FetchUrlDto,
  FetchUrlResult,
  UploadTokenDto,
  UploadTokenResult,
} from '@/types/ai'

/**
 * POST /api/v2/admin/ai/dry-run
 * 一次性返回验证结果。**不要**轮询或订阅——后端 v1 不持久化历史。
 */
export const aiDryRun = (dto: DryRunDto) =>
  Post<{ code: number; data: DryRunResult; msg?: string }>('/api/v2/admin/ai/dry-run', dto)

/**
 * POST /api/v2/admin/ai/upload-token
 * 拿 OSS 预签名 PUT URL。前端拿到 uploadUrl 后用 `fetch(uploadUrl, { method: 'PUT', body: file })`
 * 直传 OSS，**不经过**后端中转。
 *
 * 后端错误码：
 * - 400：contentType 不支持 / fileSize 超过上限 / fileName 不合法
 *
 * MIME 白名单（与后端 `src/module/ai/util/oss-token.util.ts` 同步）：
 * - application/pdf
 * - application/vnd.ms-excel / application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * - application/msword / application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - text/plain / text/markdown
 */
export const aiUploadToken = (dto: UploadTokenDto) =>
  Post<{ code: number; data: UploadTokenResult; msg?: string }>(
    '/api/v2/admin/ai/upload-token',
    dto
  )

/**
 * POST /api/v2/admin/ai/fetch-url
 * 后端 server fetch URL + cheerio 抽 main → 落 OSS tmp/ 当 .txt 文件。
 * 后续走 file 模式相同路径（拿到 ossKey 后给 /generate-stream）。
 *
 * 后端错误码：
 * - 400：url 不合法 / 协议非 http/https / 不允许内网（SSRF 防护）
 * - 502：URL 抓取 4xx/5xx / 抓取超时（10s）
 * - 415：URL 内容类型非 HTML
 */
export const aiFetchUrl = (dto: FetchUrlDto) =>
  Post<{ code: number; data: FetchUrlResult; msg?: string }>(
    '/api/v2/admin/ai/fetch-url',
    dto
  )

/**
 * POST /api/v2/admin/ai/commit
 * 两段式：把 OSS tmp/ 源文档 promote 到永久区。
 *
 * 调时机：/generate-stream SSE 推 `saved` 事件且 `event.ossKey` 存在时，**自动**调这个端点。
 *
 * 容错：promote 失败也返 200 + `promoteError` 字段（不要 throw），admin 看到协议 + 源文档可用性提示。
 */
export const aiCommit = (dto: CommitDto) =>
  Post<{ code: number; data: CommitResult; msg?: string }>('/api/v2/admin/ai/commit', dto)
