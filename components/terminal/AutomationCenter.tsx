'use client'

/**
 * AutomationCenter · 自动化中心
 *
 * 原 AdminScheduledOpTab 直接嵌入, 套一个 bento-card 视觉跟其他中心对齐。
 * 快速创建按钮 (按协议指令名) 仍然从 server 拉, 保持 16 个上限。
 */

import { ScheduleOutlined } from '@ant-design/icons'
import { AdminScheduledOpTab } from './AdminScheduledOpTab'

interface AutomationCenterProps {
  mac: string
}

export function AutomationCenter({ mac }: AutomationCenterProps) {
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
            background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <ScheduleOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>自动化中心</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
            定时操作 · 快速创建
          </div>
        </div>
      </div>
      <AdminScheduledOpTab mac={mac} />
    </div>
  )
}
