'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthToken } from '@/lib/utils/token'
import type { AiStreamEvent } from '@/types/ai'

/**
 * AI 协议生成器 SSE 流式消费 hook（决策 16 + 19 / 2026-06-24）。
 *
 * 为什么不直接用 `@ant-design/x` 的 `useXAgent`：
 * - `useXAgent` 的 `request(info, { onUpdate, onSuccess, onError })` 三回调模型
 *   装不下我们后端 6 种 SSE 事件类型（text / tool_start / tool_delta / saved / done / error）
 *   + 多 side effect（saved 触发 form 实时绑定 + 跳详情页；error 触发重试；done 关流）。
 * - 用 typed handler map 精确分发，每个事件类型独立函数，调用方代码可读性更好。
 *
 * 与后端对齐：`src/module/ai/service/ai-stream.service.ts` 的 `pipeSse` 把
 * AsyncGenerator<AiGenerateEvent> 转 `data: {json}\n\n` 推送。
 *
 * 重试设计：每次 `stream()` 调用内部 `new AbortController()`，旧 controller 在
 * finally 里 null 化，互不污染。
 */
export interface AiStreamHandlers {
  /** LLM 自由文本 delta */
  onText?: (delta: string) => void
  /** tool_use 开始（Anthropic tool_use） */
  onToolStart?: (toolName: string) => void
  /** tool_use JSON delta */
  onToolDelta?: (delta: string) => void
  /** 协议已落正式 + 双清缓存完成 */
  onSaved?: (info: Extract<AiStreamEvent, { type: 'saved' }>) => void
  /** 流结束（done 事件或 reader.read() done） */
  onDone?: () => void
  /** 错误：网络 / 后端 503 / DEEPSEEK_API_KEY 缺失 / LLM 报错 */
  onError?: (err: string) => void
}

export interface UseAiStreamResult {
  stream: (url: string, body: unknown, handlers: AiStreamHandlers) => Promise<void>
  abort: () => void
  isStreaming: boolean
  /** 当前 stream 错误（仅最近一次；component 内可清） */
  error: string | null
}

export function useAiStream(): UseAiStreamResult {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 组件卸载时 abort，避免泄漏
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  const stream = useCallback<UseAiStreamResult['stream']>(async (url, body, handlers) => {
    // 上一次未完成 → abort
    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller

    setIsStreaming(true)
    setError(null)

    const token = getAuthToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.authorization = token

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        // 后端无 API key / 未就绪 → 503 / 401 → 显式提示
        let detail = ''
        try {
          const text = await res.text()
          detail = text ? `: ${text.slice(0, 200)}` : ''
        } catch {
          /* ignore */
        }
        const msg = `HTTP ${res.status}${detail}`
        setError(msg)
        handlers.onError?.(msg)
        return
      }

      if (!res.body) {
        const msg = '响应无 body'
        setError(msg)
        handlers.onError?.(msg)
        return
      }

      reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // SSE 用 \n\n 分隔事件；buffer 里可能残留半截，下次 read 继续拼接
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload) continue
          let event: AiStreamEvent
          try {
            event = JSON.parse(payload) as AiStreamEvent
          } catch {
            // 非 JSON 行（心跳等）忽略
            continue
          }
          dispatchEvent(event, handlers)
          if (event.type === 'done') {
            handlers.onDone?.()
            return
          }
          if (event.type === 'error') {
            setError(event.error)
            handlers.onError?.(event.error)
            return
          }
        }
      }

      // 自然结束（reader done 但未收到显式 done 事件，常见于 LLM 提前断流）
      handlers.onDone?.()
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // 用户主动中止 / 组件卸载 — 不算错误
        return
      }
      const msg = err?.message ? String(err.message) : '未知错误'
      setError(msg)
      handlers.onError?.(msg)
    } finally {
      reader?.releaseLock?.()
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsStreaming(false)
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  return { stream, abort, isStreaming, error }
}

function dispatchEvent(event: AiStreamEvent, handlers: AiStreamHandlers) {
  switch (event.type) {
    case 'text':
      handlers.onText?.(event.delta)
      return
    case 'tool_start':
      handlers.onToolStart?.(event.toolName)
      return
    case 'tool_delta':
      handlers.onToolDelta?.(event.delta)
      return
    case 'saved':
      handlers.onSaved?.(event)
      return
    // 'done' / 'error' 由调用方统一处理：setError + handlers.onError
    // 加上 early return 结束 stream 循环
  }
}