'use client'

/**
 * DebugConsole · 调试中心 (调试 tab 内部)
 *
 * 调试 tab = 实时回包流 + AT 指令 / 协议指令 切换
 * - 上: DeviceLiveStream (实时回包流, maxHeight 280, 不 sticky)
 * - 下: AT 指令 + 协议指令 (Segmented 切换)
 *
 * AT 指令按钮按使用频率分组 (查询/设置/控制), 22 按钮加搜索框。
 * 协议指令 form (设备下拉 + 指令 + 定时 checkbox) 跟原 TerminalOprate 一致。
 *
 * 视觉: 玻璃 bento-card · 单列垂直布局
 */

import { Segmented } from 'antd'
import { useState } from 'react'
import { ThunderboltOutlined, CodeOutlined } from '@ant-design/icons'
import { DeviceLiveStream } from '@/components/common/DeviceLiveStream'
import { TerminalAT } from './TerminalAT'
import { TerminalOprate } from './TerminalOprate'

interface DebugConsoleProps {
  mac: string
}

export function DebugConsole({ mac }: DebugConsoleProps) {
  const [view, setView] = useState<'at' | 'instruct'>('at')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 实时回包流 (调试 tab 顶部, maxHeight 280, 不 sticky) */}
      <DeviceLiveStream mac={mac} maxHeight={280} sticky={false} />

      {/* AT / 协议指令 切换 */}
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>指令发送</h3>
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
    </div>
  )
}
