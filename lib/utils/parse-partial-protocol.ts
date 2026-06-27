/**
 * Partial JSON Protocol Parser（2026-06-27）
 *
 * 用途：AI 协议生成器流式响应时，后端 v2 prompt-instruct 模式下 LLM 在 text delta
 * 里 yield 完整 JSON（不像 v1 Anthropic tool_use 是结构化 input）。前端需要在
 * text 累积过程中**增量提取**已经能 parse 出来的 instruct[]，让 ProtocolPreviewForm
 * 慢慢填充，而不是等 saved 事件一次性 setProtocol。
 *
 * 算法：
 * 1. 从累积文本中提取 scalar 字段（Type / ProtocolType / Protocol / remark）
 *    用正则匹配，无依赖、容错
 * 2. 提取 instruct[]：定位 "instruct":[ 后的字符，扫描 brace 深度，
 *    每个完整 {...} 尝试 JSON.parse，成功就 push 到结果数组
 * 3. 内部 string 状态机处理转义字符和嵌套引号
 *
 * 性能：O(N) 单次扫描，对几十 KB JSON 文本不卡顿。
 *
 * 不依赖 npm 包（partial-json 等），自己写轻量版避免增加 bundle size。
 */

export interface PartialProtocol {
  Type?: Uart.protocol['Type'] | undefined
  ProtocolType?: Uart.protocol['ProtocolType'] | undefined
  Protocol?: string | undefined
  remark?: string | undefined
  /** 已能完整 parse 的 instruct 列表 */
  instruct?: Uart.protocol['instruct'] | undefined
}

/**
 * 从累积的 LLM 输出文本中 partial-extract 一个 protocol 对象
 *
 * @param accum - LLM 累积的 text（可能含 markdown 解释 + JSON）
 * @returns PartialProtocol 包含当前可解析的部分字段
 */
export function extractPartialProtocol(accum: string): PartialProtocol | null {
  if (!accum || accum.length < 2) return null

  const result: PartialProtocol = {}

  // 1. 提取 scalar 字段（用正则匹配，允许 JSON 未完整闭合）
  const typeMatch = accum.match(/"Type"\s*:\s*(\d+)/)
  if (typeMatch) {
    // cast: communicationType 是 union literal (232 | 485)，正则只能 match number
    result.Type = Number(typeMatch[1]) as Uart.protocol['Type']
  }

  const protocolTypeMatch = accum.match(/"ProtocolType"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)
  if (protocolTypeMatch) {
    // cast: protocolType 是 union literal ('ups' | 'air' | ...)，正则 match 任意 string
    result.ProtocolType = protocolTypeMatch[1] as Uart.protocol['ProtocolType']
  }

  const protocolMatch = accum.match(/"Protocol"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)
  if (protocolMatch) result.Protocol = protocolMatch[1]

  const remarkMatch = accum.match(/"remark"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)
  if (remarkMatch) result.remark = remarkMatch[1]

  // 2. 提取 instruct[]
  result.instruct = extractCompletedInstructs(accum)

  // 至少要有一个字段才返回
  const hasAny =
    result.Type !== undefined ||
    result.ProtocolType !== undefined ||
    result.Protocol !== undefined ||
    result.remark !== undefined ||
    (result.instruct && result.instruct.length > 0)

  return hasAny ? result : null
}

/**
 * 扫描累积文本，提取所有能完整 parse 的 instruct 对象
 *
 * 算法：从 "instruct":[ 后开始扫 brace 深度，每个 depth 从 0 → 1 → 0 的完整 {...}
 * 尝试 JSON.parse，成功就 push。string 内部状态机处理转义。
 */
function extractCompletedInstructs(accum: string): PartialProtocol['instruct'] {
  // 1. 定位 "instruct":[ 的位置（可能跨越空白）
  const match = accum.match(/"instruct"\s*:\s*\[/)
  if (!match || match.index === undefined) return []

  const start = match.index + match[0].length
  const instructs: NonNullable<PartialProtocol['instruct']> = []

  let i = start
  let depth = 0
  let objStart = -1
  let inString = false
  let escape = false

  while (i < accum.length) {
    const ch = accum[i]

    // string 内部状态机
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      i++
      continue
    }

    if (ch === '"') {
      inString = true
      i++
      continue
    }

    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        const objStr = accum.substring(objStart, i + 1)
        try {
          const obj = JSON.parse(objStr)
          if (obj && typeof obj === 'object') {
            instructs.push(obj)
          }
        } catch {
          // 单个 instruct parse 失败，skip（剩余 delta 累积后下次再试）
        }
        objStart = -1
      }
    } else if (ch === ']' && depth === 0) {
      // instruct[] 结束
      break
    }
    i++
  }

  return instructs
}