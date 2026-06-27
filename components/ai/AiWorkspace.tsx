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
 *
 * 高度计算（2026-06-27 修正）：
 * - AdminHeader 高度：64px
 * - .scroll-area padding：32px 上下 = 64px
 * - 总扣除：64 + 64 = 128px
 * - 旧版 `- 48px` 算错（main padding 是 64px 不是 48px）
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
        // 减去 AdminHeader 64 + scroll-area 上下 padding 64 = 128
        height: 'calc(100vh - 128px)',
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
          // 中间栏协议内容可能很长，需要内部 scroll
          overflow: 'hidden auto',
        }}
      >
        {middle}
      </section>
      <section
        style={{
          flex: '0.8 1 0',
          minWidth: 240,
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