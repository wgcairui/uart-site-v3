'use client'

import { Button, Checkbox, Form, Input, message, Radio, Select, Space, Tag, Typography } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { AiWorkspace } from '@/components/ai/AiWorkspace'
import {
  buildAssistantMessage,
  buildSystemMessage,
  buildUserMessage,
  ChatPane,
  eventToMessage,
  type ChatPaneMessage,
} from '@/components/ai/ChatPane'
import { ProtocolPreviewForm } from '@/components/ai/ProtocolPreviewForm'
import { StatsPane } from '@/components/ai/StatsPane'
import { useAiStream } from '@/lib/hooks/useAiStream'
import type { AiRunStats, GenerateStreamDto } from '@/types/ai'
import { EMPTY_AI_STATS } from '@/types/ai'

const { Text } = Typography

/**
 * /admin/ai/generate — AI 生成新协议（决策 16 + 19 / 2026-06-24）
 *
 * 流程：
 * 1. admin 填写 protocolType + 设备手册（manualText）/ 建议协议名
 * 2. 点击「生成协议」→ POST /generate-stream (SSE)
 * 3. 流式渲染 text delta + tool_start badge
 * 4. tool_done 后中间 form 实时绑定 tool_done.input
 * 5. saved 事件 → 显示「已保存 v1」+ 跳详情页入口
 *
 * 后端契约：`wgcairui/uart-server` `src/module/ai/controller/admin-ai.controller.ts`
 */
export default function AiGeneratePage() {
  const router = useRouter()
  const { stream, abort, isStreaming, error: streamError } = useAiStream()

  // ============ 表单（生成参数）============
  const [form] = Form.useForm<GenerateStreamDto & { overrideExisting: boolean }>()
  const [submitting, setSubmitting] = useState(false)

  // ============ 协议预览 ============
  const [protocol, setProtocol] = useState<Partial<Uart.protocol> | null>(null)

  // ============ 实时统计 ============
  const [stats, setStats] = useState<AiRunStats>(EMPTY_AI_STATS)
  const [toolStepCount, setToolStepCount] = useState(0)
  const startTimeRef = useRef<number>(0)

  // ============ 聊天消息流 ============
  const [messages, setMessages] = useState<ChatPaneMessage[]>([])

  // 维护一个"当前正在累积的 assistant 文本"消息 id
  const assistantMsgIdRef = useRef<string | null>(null)
  // 维护一个"tool_delta JSON 字符串"累积值（tool_done 时一次性 apply 到 form）
  const toolJsonAccumRef = useRef<string>('')

  const instructionCount = protocol?.instruct?.length ?? 0

  const submitGenerate = useCallback(
    async (values: GenerateStreamDto & { overrideExisting?: boolean }) => {
      if (!values.protocolType) {
        message.warning('请选择设备类型')
        return
      }
      const manualText = values.manualText?.trim() ?? ''
      if (manualText.length > 8000) {
        message.warning('设备手册 ≤ 8000 字')
        return
      }

      // 重置状态
      setProtocol(null)
      setStats((prev) => ({ ...prev, startedAt: Date.now() }))
      setToolStepCount(0)
      assistantMsgIdRef.current = null
      toolJsonAccumRef.current = ''
      const userMsg = buildUserMessage(
        `[生成] ${values.protocolType}${values.deviceModel ? ' / ' + values.deviceModel : ''}`
      )
      setMessages([userMsg, buildSystemMessage('LLM 推理中…')])
      setSubmitting(true)

      const dto: GenerateStreamDto = {
        protocolType: values.protocolType,
        hintProtocolName: values.hintProtocolName?.trim() || undefined,
        deviceModel: values.deviceModel?.trim() || undefined,
        manualText: manualText || undefined,
        overrideExisting: values.overrideExisting ?? false,
      }

      await stream('/api/v2/admin/ai/generate-stream', dto, {
        onText: (delta) => {
          // 累积到当前 assistant 消息
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
          // tool_done 后 form 实时绑定：尝试解析累积的 JSON
          let parsed: Partial<Uart.protocol> | null = null
          if (toolJsonAccumRef.current) {
            try {
              parsed = JSON.parse(toolJsonAccumRef.current)
            } catch {
              parsed = null
            }
          }
          const finalProtocol: Partial<Uart.protocol> = parsed ?? {
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
          // 标记 assistant 消息完成
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgIdRef.current ? { ...m, streaming: false } : m
            )
          )
          assistantMsgIdRef.current = null
          // 显示 saved 消息
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
          // 标记 assistant 消息完成
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgIdRef.current ? { ...m, streaming: false } : m
            )
          )
          assistantMsgIdRef.current = null
        },
      })
      setSubmitting(false)
    },
    [stream]
  )

  const handleRetry = () => {
    form.submit()
  }

  const goChat = () => {
    if (protocol?.Protocol) {
      router.push(`/admin/ai/chat/${encodeURIComponent(protocol.Protocol)}`)
    }
  }

  // ============ 输入表单（左侧顶部）============
  const inputFormNode = (
    <Form
      form={form}
      layout="vertical"
      size="small"
      initialValues={{
        protocolType: 'ups',
        overrideExisting: false,
      }}
      onFinish={submitGenerate}
      disabled={isStreaming || submitting}
    >
      <Space size={12} wrap align="end">
        <Form.Item label="设备类型" name="protocolType" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
          <Select
            style={{ width: 160 }}
            options={[
              { value: 'ups', label: 'UPS 电源' },
              { value: 'air', label: '精密空调' },
              { value: 'em', label: '电表' },
              { value: 'th', label: '温湿度' },
              { value: 'io', label: '开关量' },
            ]}
          />
        </Form.Item>
        <Form.Item label="设备型号" name="deviceModel" style={{ marginBottom: 8 }}>
          <Input placeholder="如：APC Smart-UPS 3000" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item label="建议协议名" name="hintProtocolName" style={{ marginBottom: 8 }}>
          <Input placeholder="PascalCase，留空让 LLM 起" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item label="覆盖同名" name="overrideExisting" valuePropName="checked" style={{ marginBottom: 8 }}>
          <Checkbox>覆盖已存在的协议</Checkbox>
        </Form.Item>
      </Space>
      <Form.Item
        label={
          <Space size={4}>
            <Text style={{ fontSize: 12 }}>设备手册 / Modbus 寄存器表</Text>
            <Tag style={{ fontSize: 10 }}>≤ 8000 字</Tag>
          </Space>
        }
        name="manualText"
        style={{ marginBottom: 8 }}
      >
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="粘贴设备手册片段、modbus 寄存器表、协议示例…留空 LLM 会按通用模板生成"
        />
      </Form.Item>
      <Space>
        <Button
          type="primary"
          htmlType="submit"
          loading={isStreaming || submitting}
          icon={<ThunderboltOutlined />}
        >
          {isStreaming ? '生成中…' : '生成协议'}
        </Button>
        {isStreaming && <Button onClick={abort}>中止</Button>}
        {protocol?.Protocol && !isStreaming && (
          <Button onClick={goChat}>用 AI 继续修改 →</Button>
        )}
      </Space>
    </Form>
  )

  return (
    <>
      <PageHeader
        title="AI 生成新协议"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: 'AI 工具', href: '/admin/ai/generate' },
          { title: '生成新协议' },
        ]}
      />
      <AiWorkspace
        left={
          <ChatPane
            messages={messages}
            isStreaming={isStreaming}
            inputForm={inputFormNode}
            onSubmit={() => {
              // generate 页面的 Sender 由 inputForm 顶部的「生成协议」按钮触发，
              // 此处 Sender 仅供后续 chat 流使用（v2 接入），目前禁用
            }}
            retryButton={
              <Button size="small" danger onClick={handleRetry}>
                重试
              </Button>
            }
          />
        }
        middle={<ProtocolPreviewForm value={protocol} onChange={setProtocol} mode="generate" />}
        right={
          <StatsPane
            stats={{ ...stats, error: stats.error ?? streamError ?? undefined }}
            instructionCount={instructionCount}
            toolStepCount={toolStepCount}
          />
        }
      />
    </>
  )
}