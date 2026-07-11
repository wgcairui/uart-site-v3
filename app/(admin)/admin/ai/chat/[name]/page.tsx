'use client'

import { App, Button, Form, Input, Skeleton, Space, Tag, Typography } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
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

const { Text } = Typography

/**
 * /admin/ai/chat/:name — AI 多轮修改协议（决策 11 + 19 / 2026-06-24）
 *
 * 流程：
 * 1. 进入页面 → GET /api/v2/user/protocols/:name 加载当前 protocol（v1 借 user 端 GET 端点，
 *    因为 admin 端没暴露 GET :name。admin JWT 有 USER 角色权限，无 auth 问题）
 * 2. 中间 form 实时显示当前 protocol
 * 3. admin 在 Sender 输入修改诉求 → POST /chat-stream (SSE)
 * 4. 流式渲染 text delta + tool_start
 * 5. tool_done 后 form 实时绑定 tool_done.input（chat 不允许改 Protocol 名）
 * 6. saved 事件 → 显示「已保存 v(N+1)」
 *
 * 同一协议累计 chat 次数无限制（v1 简化，v2 加 10 轮上限）。
 *
 * 关键设计：name 变化时用 `<AiChatContent key={name} />` remount，避免 setState-in-effect 警告。
 */
export default function AiChatPage() {
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params?.name ?? '')

  return (
    <>
      <PageHeader
        title={`AI 修改协议：${name || '(未指定)'}`}
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: 'AI 工具', href: '/admin/ai/generate' },
          { title: 'AI 修改协议', href: '/admin/ai/chat' },
          { title: name },
        ]}
      />
      {name ? <AiChatContent key={name} name={name} /> : <Empty name="(未指定)" />}
    </>
  )
}

function Empty({ name }: { name: string }) {
  return (
    <Space orientation="vertical" size={8} style={{ padding: 32 }}>
      <Text type="secondary">未指定协议名</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        从{' '}
        <Link href="/admin/ai/chat" style={{ color: '#8b5cf6' }}>
          AI 修改协议列表
        </Link>{' '}
        选一个
      </Text>
      {name}
    </Space>
  )
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
  const [messages, setMessages] = useState<ChatPaneMessage[]>([])
  const assistantMsgIdRef = useRef<string | null>(null)
  const toolJsonAccumRef = useRef<string>('')
  const [chatForm] = Form.useForm<{ userPrompt: string }>()

  // 跳转到协议详情页（跟 generate 页 + admin protocols 列表「查看」按钮对齐用 Protocol 参数名）
  const goProtocolDetail = (protocolName: string) => {
    router.push(`/admin/node/protocols/info?Protocol=${encodeURIComponent(protocolName)}`)
  }

  // 加载当前协议（mount-only，靠父组件 key 触发 remount 来切换协议）
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
      <div style={{ marginBottom: 8 }}>
        {protocol?.version && (
          <Tag color="cyan" style={{ fontSize: 12 }}>
            当前 v{protocol.version}
          </Tag>
        )}
        {protocol?.source && (
          <Tag color={protocol.source === 'admin' ? 'default' : 'purple'} style={{ fontSize: 12 }}>
            source: {protocol.source}
          </Tag>
        )}
      </div>
      {(
        <AiWorkspace
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
          right={<ProtocolPreviewForm value={protocol} onChange={setProtocol} mode="chat" onJumpToDetail={goProtocolDetail} />}
        />
      )}
    </>
  )
}