/**
 * 管理员端 AI 协议生成器 API
 *
 * 端点前缀 `/api/v2/admin/ai`，鉴权 ADMIN/ROOT。
 *
 * 注意：
 * - generate-stream / chat-stream 是 SSE（text/event-stream），不走 fetch-impl 的 JSON 解析；
 *   使用 `@/lib/hooks/useAiStream` 直接消费，**不要**用本文件的 wrapper 调用 SSE 端点。
 * - 本文件只暴露一次性 JSON 端点：dry-run / upload / fetch-url / commit。
 *
 * 后端实现：`wgcairui/uart-server` `src/module/ai/controller/admin-ai.controller.ts`
 *
 * 2026-06-25 决策 13 阶段 1 改：新增 upload-token（OSS 预签名）/ fetch-url（后端抓网页）
 * / commit（两段式：OSS tmp → 永久区）三个端点 wrapper。
 *
 * 2026-06-26 改：upload-token → upload（后端中转）。原「浏览器 → OSS 直传」踩了
 * mixed-content（CORS 也漏配），改回后端中转跟 `/admin/data/oss` 的 oss/upload 一致。
 * upload-token 端点保留向后兼容（前端不再用，但 schema 不删）。
 */
import { Post } from '@/lib/api/fetch'
import type {
  CommitDto,
  CommitResult,
  DryRunDto,
  DryRunResult,
  FetchUrlDto,
  FetchUrlResult,
  PreAnalyzeDto,
  PreAnalyzeResult,
  UploadDto,
  UploadResult,
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
 * POST /api/v2/admin/ai/upload（multipart/form-data）
 * 后端中转上传文件到 OSS tmp 区。**不走**预签名直传 —— 浏览器 → 同源后端 → OSS，
 * 完全规避 mixed-content + CORS 配置坑，跟 `/admin/data/oss` 走的
 * `/api/v2/admin/system/oss/upload` 是同一套架构。
 *
 * 入参：
 * - file: File（multipart file 字段）
 * - contentType / fileSize: 元信息（前端 beforeUpload 已校验，后端会再校验一次）
 *
 * 出参：{ ossKey, ossUrl, uploadId, originalFileName, contentType, fileSize }
 *
 * 后端错误码：
 * - 400：contentType 不支持 / fileSize 超过上限 / fileName 不合法
 * - 413：multipart body 超 Koa body parser 上限
 *
 * MIME 白名单（与后端 `src/module/ai/util/oss-token.util.ts` `ALLOWED_AI_PROTOCOL_MIME` 同步）：
 * - application/pdf
 * - application/vnd.ms-excel / application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * - application/msword / application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - text/plain / text/markdown
 *
 * ⚠️ 本函数**不能**用 lib/api/fetch.ts 的 Post（强制 JSON.stringify body）。
 *    直接用 fetch + FormData，鉴权 token 从 cookie 读（fetch-impl 默认行为）。
 */
export const aiUpload = async (dto: UploadDto): Promise<UploadResult> => {
  const fd = new FormData()
  fd.append('file', dto.file, dto.file.name)
  // 元信息走 query string，不放 body（midwayjs/upload 用 @Files 装饰器只读 file 字段，
  // contentType / fileSize 从 multipart filename / data 长度直接读，避免再加 form field）
  const qs = new URLSearchParams({
    contentType: dto.contentType,
    fileSize: String(dto.fileSize),
  }).toString()

  const res = await fetch(`/api/v2/admin/ai/upload?${qs}`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : { code: res.status, data: null, msg: 'No Content' }
  if (json.code !== 200 || !json.data) {
    throw new Error(json.msg || `HTTP ${json.code || res.status}`)
  }
  return json.data as UploadResult
}

/**
 * POST /api/v2/admin/ai/upload-token
 * 拿 OSS 预签名 PUT URL。
 *
 * @deprecated 2026-06-26 — 改用 `aiUpload`（后端中转）。原「浏览器 → OSS 直传」踩了
 *   mixed-content + CORS 配置坑（OSS bucket endpoint 是 HTTP，前端是 HTTPS 页面）。
 *   这个 wrapper 保留仅为向后兼容 schema 参考，前端代码已不再调用。
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

/**
 * POST /api/v2/admin/ai/pre-analyze
 * 设备元数据自动推断（决策 21 / 2026-06-25）。admin 选完 source 后**自动**调一次，
 * LLM 扫一眼源文档 → 推断 deviceModel + suggestedProtocolName → 前端 prefilled 到 form。
 *
 * 调时机（前端集成在 generate/page.tsx onSourceReady）：
 * - text 模式：textarea debounce 1s 后调
 * - file 模式：OSS PUT 200 之后调
 * - URL 模式：/fetch-url 返回 200 之后调
 *
 * 容错（前端处理，不是 wrapper 处理）：
 * - 失败不阻断：pre-analyze 报错 → console.warn，admin 继续手填
 * - 不抢用户输入：用户手动改过 deviceModel/hintProtocolName → 不再 prefilled
 *
 * 支持 AbortSignal：text debounce 触发新一轮时 abort 上一次 in-flight 请求，避免
 * 20s LLM 累积多个并发。20s server-side timeout 是兜底。
 *
 * 后端错误码：
 * - 400：sourceType='text' 时 manualText 必填 / sourceType='file' 时 ossKey+originalFileName 必填 / source 内容为空
 * - 502：LLM 失败 / 未输出有效 JSON / 输出缺少 deviceModel 和 suggestedProtocolName 之一
 */
export const aiPreAnalyze = (
  dto: PreAnalyzeDto,
  options?: { signal?: AbortSignal }
) =>
  Post<{ code: number; data: PreAnalyzeResult; msg?: string }>(
    '/api/v2/admin/ai/pre-analyze',
    dto,
    options
  )
