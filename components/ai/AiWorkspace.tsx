'use client'

import { ReactNode } from 'react'

/**
 * AI 工具两栏布局骨架（2026-06-27 重构）
 *
 * 之前是 3 列（Form | ProtocolPreview | StatsPane），StatsPane 占右侧 ~25% 宽度
 * 但内容只有 4 个统计指标，垂直堆叠浪费高度。cairui 反馈实时仪表可以放顶部
 * 做一整行（紧凑横条），释放中间栏给 form + preview。
 *
 * 新布局：
 * ```
 *  ┌──────────────────────────────────────────────┐
 *  │ StatsPane 顶部横条（紧凑 4 列）               │
 *  ├─────────────────┬────────────────────────────┤
 *  │ Form (left)     │ ProtocolPreview (right)    │
 *  │ flex 1          │ flex 1.6                   │
 *  │                 │                            │
 *  └─────────────────┴────────────────────────────┘
 * ```
 *
 * 响应式：
 * - ≥ 992px：顶部 stats + 2 列 form/preview
 * - 768-991px：顶部 stats + 2 列窄宽度
 * - < 768px：顶部 stats + form/preview 上下堆叠（单列），所有内部 Card 100%
 *
 * 高度计算：
 * - AdminHeader 64px + scroll-area padding 上下 32px x 2 = 64px + stats 横条 ~84px
 *   = 64 + 64 + 84 = 212px
 * - 旧版 calc(100vh - 128px) + 右侧 StatsPane 290px = 418px 总开销
 * - 新版 calc(100vh - 212px) 直接给 2 列，更紧凑
 */
export interface AiWorkspaceProps {
  /** 顶部统计横条（紧凑横排 4 个指标） */
  topBar: ReactNode
  left: ReactNode
  right: ReactNode
}

export function AiWorkspace({ topBar, left, right }: AiWorkspaceProps) {
  return (
    <div
      className="ai-workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        // 减去 AdminHeader 64 + scroll-area 上下 padding 64 = 128
        height: 'calc(100vh - 128px)',
        minHeight: 600,
        padding: '0 0 16px 0',
      }}
    >
      {/* 顶部紧凑横条（实时仪表） */}
      <section
        className="ai-workspace-topbar"
        style={{
          flexShrink: 0,
          background: 'var(--colorBgContainer, #fff)',
          borderRadius: 12,
          border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          padding: '12px 20px',
          overflow: 'hidden',
        }}
      >
        {topBar}
      </section>

      {/* 底部 2 列：form + preview */}
      <div
        className="ai-workspace-bottom"
        style={{
          flex: 1,
          display: 'flex',
          gap: 12,
          minHeight: 0, // 关键：允许子元素 overflow: auto 生效
        }}
      >
        <section
          className="ai-workspace-left"
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
          className="ai-workspace-right"
          style={{
            flex: '1.6 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--colorBgContainer, #fff)',
            borderRadius: 12,
            border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
            overflow: 'hidden auto',
          }}
        >
          {right}
        </section>
      </div>
    </div>
  )
}