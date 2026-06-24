'use client'

import { ReactNode } from 'react'

/**
 * AI 工具三栏布局骨架（决策 16 + 19 + 20 / 2026-06-24）
 *
 *  ┌──────────────┬──────────────────┬──────────────┐
 *  │ Left         │ Middle           │ Right        │
 *  │ 输入/对话    │ 协议预览表单     │ 实时仪表     │
 *  │              │                  │              │
 *  │ Sender       │ Form 控件        │ token 计数   │
 *  │ Bubble.List  │ (实时绑定 LLM     │ 当前指令条数 │
 *  │ Prompts      │  tool_done.input)│ 延迟         │
 *  │              │                  │ LLM 推理步骤 │
 *  └──────────────┴──────────────────┴──────────────┘
 *
 * 视觉规则：
 * - 三栏 flex 1:1.4:0.8（中间 form 最宽），高 100%，各自独立滚动
 * - 中间栏顶部固定表头（Title + 操作按钮），下方 form scroll
 * - 用 designTokens 的颜色变量，跟 admin 整体风格统一
 */
export interface AiWorkspaceProps {
  left: ReactNode
  middle: ReactNode
  right: ReactNode
}

export function AiWorkspace({ left, middle, right }: AiWorkspaceProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        height: 'calc(100vh - 64px - 48px)', // 减去 AdminHeader + main padding
        minHeight: 600,
        padding: '0 0 16px 0',
      }}
    >
      <section
        style={{
          flex: '1 1 0',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--colorBgContainer, #fff)',
          borderRadius: 12,
          border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          overflow: 'hidden',
        }}
      >
        {left}
      </section>
      <section
        style={{
          flex: '1.4 1 0',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--colorBgContainer, #fff)',
          borderRadius: 12,
          border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          overflow: 'hidden',
        }}
      >
        {middle}
      </section>
      <section
        style={{
          flex: '0.8 1 0',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--colorBgContainer, #fff)',
          borderRadius: 12,
          border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          overflow: 'hidden',
        }}
      >
        {right}
      </section>
    </div>
  )
}