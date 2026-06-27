'use client'

import { Bubble, Prompts, Sender } from '@ant-design/x'
import { Button, Empty, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CodeOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import type { AiStreamEvent } from '@/types/ai'

const { Text } = Typography

/**
 * ChatPane（左侧栏）— 输入 + 对话历史 + Sender
 *
 * 消息角色：
 * - 'user'：admin 输入（generate / chat 提示词）
 * - 'assistant'：LLM 自由文本（text delta 累积）
 * - 'tool'：tool_start / tool_delta 流式渲染（轻量 badge）
 * - 'saved'：saved 事件（带 version + provider）
 * - 'error'：error 事件（红色 + 重试按钮由父组件注入）
 * - 'system'：提示信息（缺 API key / 后端未就绪）
 */
export interface ChatPaneMessage {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'saved' | 'error' | 'system'
  content: string
  /** assistant 流式累积中 */
  streaming?: boolean
  /** saved 事件附带的元信息 */
  meta?: { protocolName: string; version: number; provider: string }
}

export interface ChatPaneProps {
  messages: ChatPaneMessage[]
  isStreaming: boolean
  /** 自定义上方区域（如 generate 的 protocolType 选择器 + manualText 输入框） */
  inputForm?: ReactNode
  /** 空状态时显示的 Prompts 引导（首次进入页面） */
  prompts?: { key: string; label: string; description?: string }[]
  onPromptClick?: (key: string, description?: string) => void
  /** Sender 提交回调 */
  onSubmit: (value: string) => void
  /** 重试按钮（错误时显示在 Sender 上方） */
  retryButton?: ReactNode
}

// 2026-06-25 改：avatar 改成 ReactNode 而不是 {icon, style} 对象
// @ant-design/x Bubble.List 渲染 items 时若 avatar 是 object，会当成 React child
// 渲染 → "Objects are not valid as a React child" 报错。直接传 ReactNode 没问题。
const ROLE_PROPS = {
  user: {
    placement: 'end' as const,
    avatar: <UserOutlined style={{ background: '#87d068', color: '#fff', borderRadius: '50%', padding: 4 }} />,
  },
  assistant: {
    placement: 'start' as const,
    avatar: <RobotOutlined style={{ background: '#1677ff', color: '#fff', borderRadius: '50%', padding: 4 }} />,
    typing: false,
  },
  tool: {
    placement: 'start' as const,
    avatar: <CodeOutlined style={{ visibility: 'hidden' }} />,
    variant: 'borderless' as const,
  },
  saved: {
    placement: 'start' as const,
    avatar: <CheckCircleOutlined style={{ background: '#f6ffed', color: '#52c41a', borderRadius: '50%', padding: 4 }} />,
  },
  error: {
    placement: 'start' as const,
    avatar: <RobotOutlined style={{ background: '#fff1f0', color: '#ff4d4f', borderRadius: '50%', padding: 4 }} />,
  },
  system: {
    placement: 'start' as const,
    avatar: <RobotOutlined style={{ background: '#fffbe6', color: '#faad14', borderRadius: '50%', padding: 4 }} />,
  },
}

export function ChatPane({
  messages,
  isStreaming,
  inputForm,
  prompts,
  onPromptClick,
  onSubmit,
  retryButton,
}: ChatPaneProps) {
  const items = messages.map((m) => {
    if (m.role === 'tool') {
      return {
        key: m.id,
        ...ROLE_PROPS.tool,
        content: (
          <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: 11 }}>
            {m.content}
          </Tag>
        ),
      }
    }
    if (m.role === 'saved') {
      return {
        key: m.id,
        ...ROLE_PROPS.saved,
        content: (
          <Space size={4} wrap>
            <Tag color="success" icon={<CheckCircleOutlined />}>
              协议已保存
            </Tag>
            {m.meta && (
              <>
                <Text strong style={{ fontSize: 12 }}>
                  {m.meta.protocolName}
                </Text>
                <Tag color="blue">v{m.meta.version}</Tag>
                <Tag>{m.meta.provider}</Tag>
              </>
            )}
          </Space>
        ),
      }
    }
    if (m.role === 'error') {
      return {
        key: m.id,
        ...ROLE_PROPS.error,
        content: (
          <Space orientation="vertical" size={4}>
            <Text type="danger" style={{ fontSize: 13 }}>
              {m.content}
            </Text>
            {retryButton}
          </Space>
        ),
      }
    }
    return {
      key: m.id,
      ...ROLE_PROPS[m.role],
      content: m.content,
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {inputForm && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--colorBorderSecondary, #e5e7eb)',
            background: 'var(--colorBgLayout, #fafafa)',
            // 内容超出时可滚动，避免撑爆 ChatPane flex 布局
            // 上限给到 60%（约 600-700px），保证 messages + Sender 还有空间
            maxHeight: '60%',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {inputForm}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}>
        {messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation="vertical" size={8}>
                <Text type="secondary">还没有对话</Text>
                {prompts && prompts.length > 0 && (
                  <Prompts
                    items={prompts.map((p) => ({
                      key: p.key,
                      label: p.label,
                      description: p.description,
                    }))}
                    onItemClick={(info) => {
                      const found = prompts.find((p) => p.key === info.data.key)
                      onPromptClick?.(info.data.key as string, found?.description)
                    }}
                  />
                )}
              </Space>
            }
          />
        ) : (
          <Bubble.List items={items as any} />
        )}
      </div>
      <div
        style={{
          padding: 12,
          borderTop: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          background: 'var(--colorBgContainer, #fff)',
        }}
      >
        <Sender
          loading={isStreaming}
          onSubmit={(v) => {
            if (!v.trim()) return
            onSubmit(v)
          }}
          placeholder={isStreaming ? '正在流式生成…' : '输入修改诉求后回车提交'}
        />
      </div>
    </div>
  )
}

/** 工具函数：从 SSE 事件构造 ChatPaneMessage（不含 user，由调用方维护） */
export function eventToMessage(event: AiStreamEvent, idSuffix: string): ChatPaneMessage | null {
  switch (event.type) {
    case 'text':
      return { id: `text-${idSuffix}`, role: 'assistant', content: event.delta, streaming: true }
    case 'tool_start':
      return {
        id: `tool-start-${idSuffix}`,
        role: 'tool',
        content: `🔧 tool: ${event.toolName}`,
      }
    case 'tool_delta':
      // tool_delta JSON 累积由调用方自己处理（会显示在 form），这里不重复渲染
      return null
    case 'saved':
      return {
        id: `saved-${idSuffix}`,
        role: 'saved',
        content: '已保存',
        meta: {
          protocolName: event.protocolName,
          version: event.version,
          provider: event.provider,
        },
      }
    case 'error':
      return { id: `error-${idSuffix}`, role: 'error', content: event.error }
    case 'done':
      return null
  }
}

export function buildSystemMessage(text: string): ChatPaneMessage {
  return {
    id: `sys-${Date.now()}`,
    role: 'system',
    content: text,
  }
}

export function buildUserMessage(text: string): ChatPaneMessage {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
    content: text,
  }
}

export function buildAssistantMessage(text: string, id?: string): ChatPaneMessage {
  return {
    id: id ?? `assistant-${Date.now()}`,
    role: 'assistant',
    content: text,
    streaming: true,
  }
}