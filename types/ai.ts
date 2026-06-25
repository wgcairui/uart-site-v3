/**
 * AI 协议生成器前端契约类型（决策 16 + 19 + 20 + 2026-06-25 决策 13 阶段 1）
 *
 * 与后端 `wgcairui/uart-server` `feat/ai-protocol-2026-06-24` 分支
 * `src/module/ai/service/ai-protocol.service.ts` 的
 * `AiGenerateEvent` / `AiChatEvent` 严格对齐。
 *
 * 2026-06-25 决策 13 阶段 1 改：
 * - 新增 sourceType='text'|'file' 二选一（file 模式走 OSS 提文字）
 * - 新增 saved.protocolId/ossKey/originalFileName/sourceSummary 字段（file 模式触发 /commit）
 * - 新增 upload-token / fetch-url / commit 三个 DTO（两段式提交）
 */

/** 后端 generate / chat 端点共同的 SSE 事件类型（结构相同，version 来源不同）
 *
 * 2026-06-25 改：
 * - tool_start / tool_delta 已弃用（MiniMax 不支持 Anthropic tool_use）
 * - 新增 saved.protocol 字段（LLM 生成的完整 JSON，让前端 form 直接绑字段，
 *   替代 v1 的 tool_delta 流式累积）
 * - 新增 saved.protocolId/ossKey/originalFileName/sourceSummary 字段
 *   （file 模式下前端拿到后**自动**调 /commit 完成源文档归档）
 */
export type AiStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_delta'; delta: string }
  | {
      type: 'saved';
      protocolName: string;
      version: number;
      provider: string;
      usedFallback: boolean;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      /** LLM 生成的完整协议 JSON（与后端 Protocols 表对应） */
      protocol?: any;
      /** Protocols._id（v2 才有，前端拿去调 /commit） */
      protocolId?: string;
      /** 源文档 OSS 路径（v2 + file 模式才有，前端拿去调 /commit） */
      ossKey?: string;
      /** 源文档原始文件名（v2 + file 模式才有，前端拿去调 /commit） */
      originalFileName?: string;
      /** 源文档摘要（debug 字符串：ext=pdf bytes=... truncated=...） */
      sourceSummary?: string;
    }
  | { type: 'done' }
  | { type: 'error'; error: string }

/** POST /generate-stream 入参
 *
 * v2 sourceType 互斥：
 * - sourceType='text'（默认，向后兼容 v1）：manualText 必填
 * - sourceType='file'：ossKey + originalFileName 必填，contentType 建议填
 */
export interface GenerateStreamDto {
  protocolType: Uart.protocolType
  hintProtocolName: string | undefined
  deviceModel: string | undefined
  /** sourceType='text' 时必填（≤8000 字） */
  manualText: string | undefined
  overrideExisting: boolean | undefined
  // === v2 source 字段（optional，向后兼容）===
  /** 'text'（默认）| 'file'；不传走 v1 路径 */
  sourceType?: 'text' | 'file'
  /** sourceType='file' 时必填，来自 /upload-token 或 /fetch-url 返回 */
  ossKey?: string
  /** sourceType='file' 时必填 */
  originalFileName?: string
  /** sourceType='file' 时建议填（MIME） */
  contentType?: string
  // === end v2 ===
}

/** POST /chat-stream 入参 */
export interface ChatStreamDto {
  protocolName: string
  userPrompt: string
}

/** POST /dry-run 入参 */
export interface DryRunDto {
  protocolName: string
  sampleSize: number | undefined
  lookbackHours: number | undefined
}

/** POST /dry-run 出参 */
export interface DryRunResult {
  protocolName: string
  sampleSize: number
  samplesUsed: number
  pass: boolean
  score: number
  checks: Array<{ name: string; ok: boolean; message: string }>
  llmAssessment: string
  provider: string
  inputTokens: number
  outputTokens: number
}

// ============================================================================
// 2026-06-25 决策 13 阶段 1：source 二选一（Text/Upload/URL）
// ============================================================================

/** POST /upload-token 入参 */
export interface UploadTokenDto {
  /** 原始文件名，含扩展名（用于 MIME 白名单校验 + OSS 路径） */
  fileName: string
  /** MIME，必需在白名单内（PDF/Excel/Word/TXT/MD） */
  contentType: string
  /** 字节数，1 ~ 20MB（后端有硬限制） */
  fileSize: number
}

/** POST /upload-token 出参 */
export interface UploadTokenResult {
  /** PUT 上去的预签名 URL（15min 有效） */
  uploadUrl: string
  /** OSS 路径，形如 ai-protocol/u_abc/tmp/upload_xxx/P02.pdf */
  ossKey: string
  /** 公开 GET URL（admin 详情页展示用） */
  ossUrl: string
  /** uuid，本次上传 session id */
  uploadId: string
  /** 900s */
  expires: number
  /** 20MB（与 AI_PROTOCOL_MAX_SIZE 同步） */
  maxSize: number
}

/** POST /fetch-url 入参 */
export interface FetchUrlDto {
  /** 必须是 http/https；后端禁 localhost / 127.0.0.1 / 内网段（SSRF 防护） */
  url: string
}

/** POST /fetch-url 出参 */
export interface FetchUrlResult {
  uploadId: string
  /** 形如 ai-protocol/u_abc/tmp/upload_uuid/url_uuid.txt */
  ossKey: string
  /** 公开 GET URL */
  ossUrl: string
  /** 从 <title> 抓的，给 admin 展示 */
  title: string
  /** 截断前字节数 */
  bytes: number
  /** 是否被 200KB 截断 */
  truncated: boolean
  /** 原始 URL（admin 溯源用） */
  sourceUrl: string
}

/** POST /commit 入参 */
export interface CommitDto {
  /** /generate-stream SSE saved 事件推的 protocolId */
  protocolId: string
  /** /generate-stream SSE saved 事件推的 protocolName */
  protocolName: string
  /** /generate-stream SSE saved 事件推的 ossKey */
  ossKey: string
  /** /generate-stream SSE saved 事件推的 originalFileName */
  originalFileName: string
}

/** POST /commit 出参
 *
 * 容错：promote 失败也返 200 + promoteError 字段，admin UI 显示"源文档不可用"。
 */
export interface CommitResult {
  protocolId: string
  protocolName: string
  /** 永久区 OSS key（promote 成功才有） */
  sourceOssKey?: string
  /** 永久区 GET URL（admin 详情页可点） */
  sourceOssUrl?: string
  /** promote 失败时给，admin UI 显示"源文档不可用" */
  promoteError?: string
}

/** 实时仪表右侧面板聚合状态（page 内部维护） */
export interface AiRunStats {
  inputTokens: number
  outputTokens: number
  latencyMs: number
  provider: string | undefined
  usedFallback: boolean | undefined
  instructionCount: number | undefined
  startedAt: number | undefined
  finishedAt: number | undefined
  /** 错误状态：API key 缺失 / 后端 503 / 网络错误 等 */
  error: string | undefined
}

/** 空 stats 初始值（避免 setStats({}) 触发 exactOptionalPropertyTypes 错误） */
export const EMPTY_AI_STATS: AiRunStats = {
  inputTokens: 0,
  outputTokens: 0,
  latencyMs: 0,
  provider: undefined,
  usedFallback: undefined,
  instructionCount: undefined,
  startedAt: undefined,
  finishedAt: undefined,
  error: undefined,
}