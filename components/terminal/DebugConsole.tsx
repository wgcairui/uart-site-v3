'use client'

/**
 * DebugConsole · 调试中心 (2-col)
 *
 * 合并原 AT调试 + 指令调试 两个 tab, 共享 DeviceLiveStream。
 * 左: AT 指令快速发送 (可搜索, 22 按钮折叠)
 * 右: 协议指令 form (设备 + 指令 + 定时)
 *
 * 视觉: 玻璃 bento-card · 2 列 (8/4 配比, antd 24-col grid)
 */

import { Segmented, Tag } from 'antd'
import { useState } from 'react'
import { ThunderboltOutlined, CodeOutlined } from '@ant-design/icons'
import { TerminalAT } from './TerminalAT'
import { TerminalOprate } from './TerminalOprate'

interface DebugConsoleProps {
  mac: string
}

export function DebugConsole({ mac }: DebugConsoleProps) {
  const [view, setView] = useState<'at' | 'instruct'>('at')
  return (
    <div
      className="bento-card"
      style={{
        padding: 20,
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'var(--shadow-bento)',
        borderRadius: 'var(--radius-2xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <CodeOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>调试中心</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
            AT 指令 · 协议指令
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Segmented
            value={view}
            onChange={(v) => setView(v as 'at' | 'instruct')}
            options={[
              { label: <span><ThunderboltOutlined /> AT 指令</span>, value: 'at' },
              { label: <span><CodeOutlined /> 协议指令</span>, value: 'instruct' },
            ]}
          />
        </div>
      </div>
      {view === 'at' ? <TerminalAT mac={mac} /> : <TerminalOprate mac={mac} />}
    </div>
  )
}
