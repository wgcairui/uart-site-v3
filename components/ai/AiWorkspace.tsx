'use client'

import { ReactNode } from 'react'

/**
 * AI Workspace 布局骨架（2026-06-27 重构 #2）
 *
 * cairui 反馈之前布局（顶部 stats + 2 列 form/preview）还是太紧凑：
 * 1. 左侧 form 和「对话」应该分成左右两侧（form 在左，messages + sender 在右）
 * 2. 协议预览默认隐藏，生成后再下面创建新的一块（占据整行下方）
 * 3. 协议生成完可以跳转到对应的协议详情页
 *
 * 新布局（cairui 设计的版本）：
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ StatsPane 顶部紧凑横条                               │
 *  ├───────────────────┬──────────────────────────────────┤
 *  │ Form（左）        │ Chat（右）                        │
 *  │ 设备类型/型号等    │ Messages + Sender                │
 *  │ 生成按钮          │                                   │
 *  ├───────────────────┴──────────────────────────────────┤
 *  │ ProtocolPreview（底部整行）                          │
 *  │ 仅在 protocol 非空时显示                              │
 *  │ 头部：[跳转到详情页] 按钮 + 协议名                    │
 *  │ 指令卡片列表（scroll）                               │
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * 响应式：
 * - ≥ 768px：form/chat 左右 2 列 + preview 底部
 * - < 768px：stats / form / chat / preview 全部垂直堆叠
 */
export interface AiWorkspaceProps {
  /** 顶部紧凑横条（实时仪表） */
  topBar: ReactNode
  /** 左列：form（设备类型 / 设备型号 / Source / 生成按钮等） */
  left: ReactNode
  /** 右列：chat（messages + sender） */
  right: ReactNode
  /** 底部面板：协议预览，默认隐藏（生成后才传入） */
  bottomPanel?: ReactNode
}

export function AiWorkspace({ topBar, left, right, bottomPanel }: AiWorkspaceProps) {
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

      {/* 中部：form 左 + chat 右 */}
      <div
        className="ai-workspace-middle"
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
            overflow: 'hidden auto',
          }}
        >
          {left}
        </section>
        <section
          className="ai-workspace-right"
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
          {right}
        </section>
      </div>

      {/* 底部面板：协议预览（默认隐藏） */}
      {bottomPanel && (
        <section
          className="ai-workspace-bottom-panel"
          style={{
            flexShrink: 0,
            // 桌面端：高度自适应（最大 50vh），内部 scroll
            // 移动端：自动 wrap 到所有 section 之下，高度自适应
            maxHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--colorBgContainer, #fff)',
            borderRadius: 12,
            border: '1px solid var(--colorBorderSecondary, #e5e7eb)',
            overflow: 'hidden',
          }}
        >
          {bottomPanel}
        </section>
      )}
    </div>
  )
}