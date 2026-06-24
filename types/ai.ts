/**
 * AI 协议生成器前端契约类型（决策 16 + 19 + 20 / 2026-06-24）
 *
 * 与后端 `src/module/ai/service/ai-protocol.service.ts` 的
 * `AiGenerateEvent` / `AiChatEvent` 严格对齐。
 */

/** 后端 generate / chat 端点共同的 SSE 事件类型（结构相同，version 来源不同） */
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
    }
  | { type: 'done' }
  | { type: 'error'; error: string }

/** POST /generate-stream 入参 */
export interface GenerateStreamDto {
  protocolType: Uart.protocolType
  hintProtocolName: string | undefined
  deviceModel: string | undefined
  manualText: string | undefined
  overrideExisting: boolean | undefined
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