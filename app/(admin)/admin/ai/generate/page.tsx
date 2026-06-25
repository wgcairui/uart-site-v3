'use client'

import { App, Button, Checkbox, Form, Input, Radio, Select, Space, Spin, Tabs, Tag, Tooltip, Typography } from 'antd'
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { AiWorkspace } from '@/components/ai/AiWorkspace'
import { SourceUploadTab } from '@/components/ai/SourceUploadTab'
import { SourceUrlTab } from '@/components/ai/SourceUrlTab'
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
import { aiCommit, aiPreAnalyze } from '@/lib/api/endpoints/admin/ai'
import type { AiRunStats, GenerateStreamDto, PreAnalyzeDto } from '@/types/ai'
import { EMPTY_AI_STATS } from '@/types/ai'

const { Text } = Typography

/** Source 模式：text（粘手册）/ upload（PDF/Excel/Word）/ url（抓网页） */
type SourceMode = 'text' | 'upload' | 'url'

/** file 模式（upload + url）上传/抓取后的元信息，给 generate-stream 的 ossKey/originalFileName/contentType 用 */
interface FileSourceInfo {
  ossKey: string
  originalFileName: string
  contentType: string
}

/**
 * /admin/ai/generate — AI 生成新协议（决策 16 + 19 / 2026-06-24，决策 13 阶段 1 / 2026-06-25）
 *
 * 流程：
 * 1. admin 填写 protocolType + 选择 Source（text/upload/url）+ 建议协议名
 * 2. 点击「生成协议」→ POST /generate-stream (SSE)
 * 3. 流式渲染 text delta + tool_start badge
 * 4. tool_done 后中间 form 实时绑定 tool_done.input
 * 5. saved 事件 → 显示「已保存 v1」+ 跳详情页入口
 *    (file 模式额外自动调 /commit 完成源文档归档，见 onSaved)
 *
 * 后端契约：`wgcairui/uart-server` `feat/ai-protocol-2026-06-24` 分支
 * `src/module/ai/controller/admin-ai.controller.ts`
 */
export default function AiGeneratePage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { stream, abort, isStreaming, error: streamError } = useAiStream()

  // ============ 表单（生成参数）============
  const [form] = Form.useForm<GenerateStreamDto & { overrideExisting: boolean }>()
  const [submitting, setSubmitting] = useState(false)

  // ============ Source 模式（v2 决策 13 阶段 1）============
  // 三个 tab 互斥：text（粘手册）/ upload（PDF/Excel/Word 直传 OSS）/ url（抓网页）
  const [sourceMode, setSourceMode] = useState<SourceMode>('text')
  const [manualText, setManualText] = useState('') // text 模式专用
  const [fileSource, setFileSource] = useState<FileSourceInfo | null>(null) // upload/url 模式专用

  // ============ Pre-analyze（决策 21 / 2026-06-25）============
  // 选完 source 后自动调一次 /pre-analyze，LLM 扫一眼源文档 → 推断 deviceModel + suggestedProtocolName
  // 设计原则：
  // - 失败不阻断：pre-analyze 报错 console.warn，admin 继续手填
  // - 不抢用户输入：用户手动改过 deviceModel/hintProtocolName 后 → touched flag 阻止 prefill
  // - debounce 1s（text 模式）：避免每输入一个字就调一次
  // - abort：text debounce 触发新一轮时 abort 上一次 in-flight（避免 20s 累积）
  const [preAnalyzeLoading, setPreAnalyzeLoading] = useState(false)
  const [preAnalyzeReasoning, setPreAnalyzeReasoning] = useState<string | null>(null)
  const deviceModelTouchedRef = useRef(false)
  const hintProtocolNameTouchedRef = useRef(false)
  // 决策 22：pre-analyze 也能 prefill 设备类型下拉，admin 改过就不再覆盖
  const protocolTypeTouchedRef = useRef(false)
  const preAnalyzeAbortRef = useRef<AbortController | null>(null)
  const textDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ============ Pre-analyze trigger（决策 21）============
  // 统一触发入口。text 模式 debounce 触发；file/url 模式在 tab onUploaded/onFetched 同步触发
  // - abort 上一次 in-flight（20s 兜底）
  // - 失败 console.warn 不阻断，admin 继续手填
  // - prefilled 前检查 touched flag，不抢用户输入
  const triggerPreAnalyze = useCallback(
    async (dto: PreAnalyzeDto) => {
      preAnalyzeAbortRef.current?.abort()
      const controller = new AbortController()
      preAnalyzeAbortRef.current = controller
      setPreAnalyzeLoading(true)
      try {
        const res = await aiPreAnalyze(dto, { signal: controller.signal })
        if (res.code !== 200 || !res.data) {
          console.warn('pre-analyze 失败:', res.msg || `HTTP ${res.code}`)
          return
        }
        const { deviceModel, suggestedProtocolName, confidence, reasoning } = res.data
        // prefilled：只在用户没手动改过的字段上
        if (deviceModel && !deviceModelTouchedRef.current) {
          form.setFieldValue('deviceModel', deviceModel)
        }
        if (suggestedProtocolName && !hintProtocolNameTouchedRef.current) {
          form.setFieldValue('hintProtocolName', suggestedProtocolName)
        }
        // 决策 22：设备类型下拉也 prefill（admin 改过就不覆盖）
        if (res.data.protocolType && !protocolTypeTouchedRef.current) {
          form.setFieldValue('protocolType', res.data.protocolType)
        }
        setPreAnalyzeReasoning(reasoning)
        if (typeof confidence === 'number' && confidence < 0.6) {
          message.info(
            `AI 推断可信度 ${(confidence * 100).toFixed(0)}%，建议 review`
          )
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.warn('pre-analyze 失败:', err)
      } finally {
        if (preAnalyzeAbortRef.current === controller) {
          preAnalyzeAbortRef.current = null
        }
        setPreAnalyzeLoading(false)
      }
    },
    [form]
  )

  // ============ text 模式：debounce 1s 后触发 pre-analyze ============
  useEffect(() => {
    if (sourceMode !== 'text') return
    const text = manualText.trim()
    // 至少 10 字才推断（避免空/超短输入浪费 LLM call）
    if (text.length < 10) return
    if (textDebounceRef.current) clearTimeout(textDebounceRef.current)
    textDebounceRef.current = setTimeout(() => {
      triggerPreAnalyze({
        sourceType: 'text',
        manualText: text,
        ossKey: undefined,
        originalFileName: undefined,
        contentType: undefined,
      })
    }, 1000)
    return () => {
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current)
        textDebounceRef.current = null
      }
    }
  }, [manualText, sourceMode, triggerPreAnalyze])

  // ============ 切 source tab 时重置 touched flags + 清 pre-analyze 状态 ============
  useEffect(() => {
    deviceModelTouchedRef.current = false
    hintProtocolNameTouchedRef.current = false
    protocolTypeTouchedRef.current = false
    setPreAnalyzeReasoning(null)
    preAnalyzeAbortRef.current?.abort()
    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current)
      textDebounceRef.current = null
    }
    setPreAnalyzeLoading(false)
  }, [sourceMode])

  // ============ 组件卸载时清理 ============
  useEffect(() => {
    return () => {
      preAnalyzeAbortRef.current?.abort()
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current)
      }
    }
  }, [])

  // ============ Form onValuesChange：检测用户改过 deviceModel/hintProtocolName ============
  // 不抢用户输入：一旦用户动了 deviceModel / hintProtocolName 字段，
  // prefill 阶段会跳过该字段（用 ref，event-driven，不进 state 避免不必要 re-render）
  const handleValuesChange = useCallback(
    (changed: Partial<GenerateStreamDto & { overrideExisting: boolean }>) => {
      if (changed.deviceModel !== undefined) deviceModelTouchedRef.current = true
      if (changed.hintProtocolName !== undefined) hintProtocolNameTouchedRef.current = true
      if (changed.protocolType !== undefined) protocolTypeTouchedRef.current = true
    },
    []
  )

  const submitGenerate = useCallback(
    async (values: GenerateStreamDto & { overrideExisting?: boolean }) => {
      if (!values.protocolType) {
        message.warning('请选择设备类型')
        return
      }

      // === Source 校验 ===
      let dtoSourceType: 'text' | 'file' = 'text'
      let dtoManualText: string | undefined = undefined
      let dtoOssKey: string | undefined = undefined
      let dtoOriginalFileName: string | undefined = undefined
      let dtoContentType: string | undefined = undefined

      if (sourceMode === 'text') {
        const text = manualText.trim()
        if (text.length === 0) {
          message.warning('请粘贴设备手册或描述')
          return
        }
        if (text.length > 8000) {
          message.warning('设备手册 ≤ 8000 字')
          return
        }
        dtoSourceType = 'text'
        dtoManualText = text
      } else {
        // upload / url 都是 file 模式
        if (!fileSource) {
          message.warning(
            sourceMode === 'upload' ? '请先上传文件' : '请先抓取 URL'
          )
          return
        }
        dtoSourceType = 'file'
        dtoOssKey = fileSource.ossKey
        dtoOriginalFileName = fileSource.originalFileName
        dtoContentType = fileSource.contentType
      }

      // 重置状态
      setProtocol(null)
      setStats((prev) => ({ ...prev, startedAt: Date.now() }))
      setToolStepCount(0)
      assistantMsgIdRef.current = null
      toolJsonAccumRef.current = ''
      const userMsg = buildUserMessage(
        `[生成] ${values.protocolType}${values.deviceModel ? ' / ' + values.deviceModel : ''} · source=${sourceMode}`
      )
      setMessages([userMsg, buildSystemMessage('LLM 推理中…')])
      setSubmitting(true)

      const dto: GenerateStreamDto = {
        protocolType: values.protocolType,
        hintProtocolName: values.hintProtocolName?.trim() || undefined,
        deviceModel: values.deviceModel?.trim() || undefined,
        overrideExisting: values.overrideExisting ?? false,
        // v2 source 字段
        sourceType: dtoSourceType,
        manualText: dtoManualText,
        ossKey: dtoOssKey,
        originalFileName: dtoOriginalFileName,
        contentType: dtoContentType,
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
        onSaved: async (info) => {
          // 2026-06-25 改：优先用 info.protocol（后端 saved 事件带的完整 JSON，
          // MiniMax 不支持 tool_use 后改成 prompt-instruct，server 直接 yield 完整 input）
          // 兼容 v1：toolJsonAccumRef 累积的 tool_delta 仍可作为 fallback
          let parsed: Partial<Uart.protocol> | null = null
          if (info.protocol) {
            parsed = info.protocol as Partial<Uart.protocol>
          } else if (toolJsonAccumRef.current) {
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

          // === v2 file 模式：自动调 /commit 完成源文档归档 ===
          // protocolId + ossKey + originalFileName 三个字段全有才调（text 模式 ossKey 缺）
          if (info.ossKey && info.protocolId && info.originalFileName) {
            const commitInfo = {
              protocolId: info.protocolId,
              protocolName: info.protocolName,
              ossKey: info.ossKey,
              originalFileName: info.originalFileName,
            }
            setMessages((prev) => [
              ...prev,
              {
                id: `committing-${Date.now()}`,
                role: 'system',
                content: '归档源文档到永久区…',
              },
            ])
            try {
              const res = await aiCommit(commitInfo)
              if (res.code === 200 && res.data) {
                if (res.data.promoteError) {
                  // 容错：后端返 200 + promoteError，admin 看到"协议成 + 源文档不可用"
                  message.warning(`源文档归档失败：${res.data.promoteError}`)
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `commit-error-${Date.now()}`,
                      role: 'error',
                      content: `源文档归档失败：${res.data?.promoteError ?? 'unknown'}`,
                    },
                  ])
                } else {
                  message.success('源文档已归档')
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `commit-done-${Date.now()}`,
                      role: 'saved',
                      content: res.data?.sourceOssUrl
                        ? `源文档已归档：${info.originalFileName}`
                        : '源文档已归档',
                      meta: {
                        protocolName: info.protocolName,
                        version: info.version,
                        provider: info.provider,
                      },
                    },
                  ])
                }
              } else {
                // HTTP 200 但 code 非 200 → 后端显式失败
                const msg = res.msg || `HTTP ${res.code}`
                message.warning(`源文档归档失败：${msg}`)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `commit-error-${Date.now()}`,
                    role: 'error',
                    content: `源文档归档失败：${msg}`,
                  },
                ])
              }
            } catch (err: any) {
              const msg = err?.message ? String(err.message) : '网络错误'
              message.warning(`源文档归档失败：${msg}`)
              setMessages((prev) => [
                ...prev,
                {
                  id: `commit-error-${Date.now()}`,
                  role: 'error',
                  content: `源文档归档失败：${msg}`,
                },
              ])
            }
          }
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
    [stream, sourceMode, manualText, fileSource]
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
      onValuesChange={handleValuesChange}
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
        <Form.Item
          label={
            <Space size={4}>
              <Text style={{ fontSize: 12 }}>设备型号</Text>
              {preAnalyzeLoading && (
                <Tag color="processing" icon={<RobotOutlined />} style={{ fontSize: 10, margin: 0 }}>
                  AI 推断中
                </Tag>
              )}
            </Space>
          }
          name="deviceModel"
          style={{ marginBottom: 8 }}
        >
          <Tooltip
            title={preAnalyzeReasoning ?? null}
            placement="top"
            mouseEnterDelay={0.3}
          >
            <Input
              placeholder="如：APC Smart-UPS 3000"
              style={{ width: 180 }}
              prefix={
                // 固定 wrapper（占位 span），避免 loading 切换时 prefix 槽 add/remove
                // 触发 antd v6 Input focus 丢失 warning
                <span style={{ display: 'inline-block', width: 14, height: 14 }}>
                  {preAnalyzeLoading ? <Spin size="small" /> : null}
                </span>
              }
            />
          </Tooltip>
        </Form.Item>
        <Form.Item
          label={
            <Space size={4}>
              <Text style={{ fontSize: 12 }}>建议协议名</Text>
              {preAnalyzeLoading && (
                <Tag color="processing" icon={<RobotOutlined />} style={{ fontSize: 10, margin: 0 }}>
                  AI 推断中
                </Tag>
              )}
            </Space>
          }
          name="hintProtocolName"
          style={{ marginBottom: 8 }}
        >
          <Tooltip
            title={preAnalyzeReasoning ?? null}
            placement="top"
            mouseEnterDelay={0.3}
          >
            <Input
              placeholder="PascalCase，留空让 LLM 起"
              style={{ width: 180 }}
              prefix={
                <span style={{ display: 'inline-block', width: 14, height: 14 }}>
                  {preAnalyzeLoading ? <Spin size="small" /> : null}
                </span>
              }
            />
          </Tooltip>
        </Form.Item>
        <Form.Item label="覆盖同名" name="overrideExisting" valuePropName="checked" style={{ marginBottom: 8 }}>
          <Checkbox>覆盖已存在的协议</Checkbox>
        </Form.Item>
      </Space>
      <Form.Item
        label={
          <Space size={4}>
            <Text style={{ fontSize: 12 }}>Source（设备手册 / 文件 / URL）</Text>
            {sourceMode === 'text' && (
              <Tag style={{ fontSize: 10 }}>≤ 8000 字</Tag>
            )}
            {sourceMode === 'upload' && (
              <Tag style={{ fontSize: 10 }}>PDF/Excel/Word ≤ 20MB</Tag>
            )}
            {sourceMode === 'url' && (
              <Tag style={{ fontSize: 10 }}>http/https 网页</Tag>
            )}
          </Space>
        }
        style={{ marginBottom: 8 }}
      >
        <Tabs
          size="small"
          activeKey={sourceMode}
          onChange={(k) => {
            const next = k as SourceMode
            setSourceMode(next)
            // 切 tab 时清掉另一种模式的 state，避免 stale
            if (next === 'text') {
              setFileSource(null)
            } else {
              setManualText('')
            }
          }}
          items={[
            {
              key: 'text',
              label: '📝 粘文字',
              children: (
                <Input.TextArea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  placeholder="粘贴设备手册片段、modbus 寄存器表、协议示例…留空 LLM 会按通用模板生成"
                />
              ),
            },
            {
              key: 'upload',
              label: '📤 上传文件',
              children: (
                <SourceUploadTab
                  disabled={isStreaming || submitting}
                  onUploaded={(info) => {
                    setFileSource({
                      ossKey: info.ossKey,
                      originalFileName: info.originalFileName,
                      contentType: info.contentType,
                    })
                    // OSS PUT 200 之后触发 pre-analyze（决策 21）
                    triggerPreAnalyze({
                      sourceType: 'file',
                      manualText: undefined,
                      ossKey: info.ossKey,
                      originalFileName: info.originalFileName,
                      contentType: info.contentType,
                    })
                  }}
                />
              ),
            },
            {
              key: 'url',
              label: '🌐 抓 URL',
              children: (
                <SourceUrlTab
                  disabled={isStreaming || submitting}
                  onFetched={(info) => {
                    setFileSource({
                      ossKey: info.ossKey,
                      originalFileName: info.originalFileName,
                      contentType: info.contentType,
                    })
                    // /fetch-url 返回 200 之后触发 pre-analyze（决策 21）
                    triggerPreAnalyze({
                      sourceType: 'file',
                      manualText: undefined,
                      ossKey: info.ossKey,
                      originalFileName: info.originalFileName,
                      contentType: info.contentType,
                    })
                  }}
                />
              ),
            },
          ]}
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