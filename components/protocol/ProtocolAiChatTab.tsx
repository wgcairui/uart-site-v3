'use client'

import { App, Button, Form, Input, Skeleton, Space } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageOutlined } from '@ant-design/icons'
import { AiWorkspace } from '@/components/ai/AiWorkspace'
import {
  buildAssistantMessage,
  buildSystemMessage,
  buildUserMessage,
  ChatPane,
  type ChatPaneMessage,
} from '@/components/ai/ChatPane'
import { ProtocolPreviewForm } from '@/components/ai/ProtocolPreviewForm'
import { StatsPane } from '@/components/ai/StatsPane'
import { useAiStream } from '@/lib/hooks/useAiStream'
import { getProtocol } from '@/lib/api/fetch'
import { EMPTY_AI_STATS, type AiRunStats } from '@/types/ai'

interface ProtocolAiChatTabProps {
  protocolName: string
}

/**
 * 「AI 修改」tab（合并自 /admin/ai/chat/[name]，决策 PR-1 / 2026-07-17）
 *
 * 父级 Tabs 已展示协议 hero（紫渐变 + 6 KV），本 tab 不再重复 device hero。
 * 父级传 `key={Protocol}` 强制协议切换时 remount（避免协议 A 的 chat 流污染协议 B 的 state）。
 *
 * 流程（与原 /admin/ai/chat/:name 完全一致）：
 * 1. mount → GET /api/v2/user/protocols/:name 加载当前 protocol
 *    （admin JWT 有 USER 角色权限，复用 user 端 GET 端点；admin 端没暴露 GET :name）
 * 2. 中间 form 实时显示当前 protocol
 * 3. admin 在 Sender 输入修改诉求 → POST /api/v2/admin/ai/chat-stream (SSE)
 * 4. 流式渲染 text delta + tool_start
 * 5. tool_done 后 form 实时绑定 tool_done.input（chat 不允许改 Protocol 名）
 * 6. saved 事件 → 显示「已保存 v(N+1)」，自动 refresh form
 *
 * 同一协议累计 chat 次数无限制（v1 简化，v2 加 10 轮上限）。
 */
export const ProtocolAiChatTab: React.FC<ProtocolAiChatTabProps> = ({ protocolName }) => {
  return <AiChatContent key={protocolName} name={protocolName} />
}

interface AiChatContentProps {
  name: string
}

function AiChatContent({ name }: AiChatContentProps) {
  const { message } = App.useApp()
  const { stream, abort, isStreaming, error: streamError } = useAiStream()
  const router = useRouter()

  const [protocol, setProtocol] = useState<Partial<Uart.protocol> | null>(null)
  const [loadingProtocol, setLoadingProtocol] = useState(true)
  const [stats, setStats] = useState<AiRunStats>(EMPTY_AI_STATS)
  const [toolStepCount, setToolStepCount] = useState(0)
  const [chatRoundCount, setChatRoundCount] = useState(0)
  const [messages, setMessages] = useState<ChatPaneMessage[]>([])
  const assistantMsgIdRef = useRef<string | null>(null)
  const toolJsonAccumRef = useRef<string>('')
  const [chatForm] = Form.useForm<{ userPrompt: string }>()

  // 跳转到协议详情页（保留 ?tab=info&version=N 锚定到 info tab 方便查看新版本）
  const goProtocolDetail = (protocolName: string) => {
    router.push(`/admin/node/protocols/info?Protocol=${encodeURIComponent(protocolName)}&tab=info`)
  }

  // 加载当前协议（mount-only，靠 key={name} 触发 remount 来切换协议）
  useEffect(() => {
    let cancelled = false
    getProtocol(name)
      .then((res: any) => {
        if (cancelled) return
        const data = res?.data
        if (data && data.Protocol) {
          setProtocol(data)
          setMessages([
            buildSystemMessage(
              `已加载协议 ${data.Protocol}（v${data.version ?? 1}，source=${data.source ?? 'admin'}）。在下方输入修改诉求后回车。`
            ),
          ])
        } else {
          message.error('协议加载失败')
          setMessages([buildSystemMessage('协议加载失败，请确认协议名是否正确')])
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        message.error(`加载失败：${err?.message ?? err}`)
        setMessages([buildSystemMessage(`加载失败：${err?.message ?? err}`)])
      })
      .finally(() => {
        if (!cancelled) setLoadingProtocol(false)
      })
    return () => {
      cancelled = true
    }
  }, [name])

  const submitChat = useCallback(
    async (userPrompt: string) => {
      if (!userPrompt.trim()) return
      if (userPrompt.length > 2000) {
        message.warning('修改诉求 ≤ 2000 字')
        return
      }

      // 追加 user 消息 + 清理状态
      setMessages((prev) => [...prev, buildUserMessage(userPrompt)])
      setStats((prev) => ({ ...prev, startedAt: Date.now() }))
      setToolStepCount(0)
      setChatRoundCount((n) => n + 1)
      assistantMsgIdRef.current = null
      toolJsonAccumRef.current = ''

      await stream('/api/v2/admin/ai/chat-stream', { protocolName: name, userPrompt }, {
        onText: (delta) => {
          if (assistantMsgIdRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgIdRef.current
                  ? { ...m, content: m.content + delta, streaming: true }
                  : m
              )
            )
          } else {
            const msg = buildAssistantMessage(delta)
            assistantMsgIdRef.current = msg.id
            setMessages((prev) => [...prev, msg])
          }
        },
        onToolStart: (toolName) => {
          setToolStepCount((n) => n + 1)
          setMessages((prev) => [
            ...prev,
            {
              id: `tool-start-${Date.now()}`,
              role: 'tool',
              content: `🔧 tool: ${toolName}`,
            },
          ])
          toolJsonAccumRef.current = ''
        },
        onToolDelta: (delta) => {
          toolJsonAccumRef.current += delta
        },
        onSaved: (info) => {
          let parsed: Partial<Uart.protocol> | null = null
          if (toolJsonAccumRef.current) {
            try {
              parsed = JSON.parse(toolJsonAccumRef.current)
            } catch {
              parsed = null
            }
          }
          const finalProtocol: Partial<Uart.protocol> = {
            ...(parsed ?? {}),
            Protocol: info.protocolName,
          }
          setProtocol(finalProtocol)
          setStats((s) => ({
            ...s,
            finishedAt: Date.now(),
            inputTokens: info.inputTokens,
            outputTokens: info.outputTokens,
            latencyMs: info.latencyMs,
            provider: info.provider,
            usedFallback: info.usedFallback,
            instructionCount: finalProtocol.instruct?.length,
          }))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgIdRef.current ? { ...m, streaming: false } : m
            )
          )
          assistantMsgIdRef.current = null
          setMessages((prev) => [
            ...prev,
            {
              id: `saved-${Date.now()}`,
              role: 'saved',
              content: '已保存',
              meta: {
                protocolName: info.protocolName,
                version: info.version,
                provider: info.provider,
              },
            },
          ])
          message.success(`协议 ${info.protocolName} v${info.version} 已保存`)
        },
        onError: (err) => {
          setStats((s) => ({ ...s, finishedAt: Date.now(), error: err }))
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'error',
              content: err,
            },
          ])
        },
        onDone: () => {
          setStats((s) => ({ ...s, finishedAt: s.finishedAt ?? Date.now() }))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgIdRef.current ? { ...m, streaming: false } : m
            )
          )
          assistantMsgIdRef.current = null
        },
      })
    },
    [name, stream]
  )

  const inputFormNode = (
    <Space.Compact style={{ width: '100%' }}>
      <Form form={chatForm} style={{ flex: 1 }}>
        <Form.Item name="userPrompt" noStyle>
          <Input
            placeholder="输入修改诉求后回车（如：把输入电压系数改为 0.1 / 加上电池容量字段）"
            disabled={isStreaming || loadingProtocol}
            onPressEnter={(e) => {
              e.preventDefault()
              const v = chatForm.getFieldValue('userPrompt') as string
              if (v && v.trim()) {
                submitChat(v)
                chatForm.resetFields()
              }
            }}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
      <Button
        type="primary"
        icon={<MessageOutlined />}
        loading={isStreaming}
        disabled={loadingProtocol}
        onClick={() => {
          const v = chatForm.getFieldValue('userPrompt') as string
          if (v && v.trim()) {
            submitChat(v)
            chatForm.resetFields()
          }
        }}
      >
        发送
      </Button>
      {isStreaming && <Button onClick={abort}>中止</Button>}
    </Space.Compact>
  )

  const instructionCount = protocol?.instruct?.length ?? 0

  return (
    <>
      <style jsx global>{`
        .ai-chat-topbar-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%) !important;
          border-color: transparent !important;
          position: relative;
          overflow: hidden;
        }
        .ai-chat-topbar-hero::after {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, var(--accent-400) 0%, transparent 70%);
          opacity: 0.4;
          pointer-events: none;
        }
        .ai-chat-topbar-hero .ant-typography,
        .ai-chat-topbar-hero .ant-typography-secondary,
        .ai-chat-topbar-hero .ant-space-item {
          color: rgba(255, 255, 255, 0.85) !important;
        }
        .ai-chat-topbar-hero .ant-typography strong {
          color: #fff !important;
        }
        .ai-chat-topbar-hero .anticon {
          color: rgba(255, 255, 255, 0.85) !important;
        }
        .ai-chat-topbar-hero [style*="background: var(--colorTextTertiary)"] {
          background: rgba(255, 255, 255, 0.2) !important;
        }
        .ai-chat-topbar-hero [style*="background: var(--colorBorderSecondary"] {
          background: rgba(255, 255, 255, 0.18) !important;
        }
        .ai-chat-topbar-hero .ant-tag {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
          color: #fff !important;
        }
        .ai-chat-topbar-hero .ant-tag-warning {
          background: rgba(245, 158, 11, 0.3) !important;
          border-color: rgba(245, 158, 11, 0.5) !important;
          color: #fbbf24 !important;
        }
      `}</style>

      <AiWorkspace
        rootHeight="calc(100vh - 64px - 64px - 16px)"
        topBarClassName="ai-chat-topbar-hero"
        leftClassName="ai-chat-left"
        rightClassName="ai-chat-right"
        topBar={
          <StatsPane
            stats={{ ...stats, error: stats.error ?? streamError ?? undefined }}
            instructionCount={instructionCount}
            toolStepCount={toolStepCount}
          />
        }
        left={
          <div style={{ position: 'relative', height: '100%' }}>
            {loadingProtocol && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.7)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            )}
            <ChatPane
              messages={messages}
              isStreaming={isStreaming}
              inputForm={inputFormNode}
              onSubmit={() => undefined}
              retryButton={
                <Button size="small" danger onClick={() => chatForm.submit()}>
                  重试
                </Button>
              }
            />
          </div>
        }
        right={
          <ProtocolPreviewForm
            value={protocol}
            onChange={setProtocol}
            mode="chat"
            onJumpToDetail={goProtocolDetail}
          />
        }
      />
    </>
  )
}
