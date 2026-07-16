'use client'

import { TeamOutlined } from '@ant-design/icons'
import { TerminalBindUsers } from './TerminalIccidInfo'

interface BindUsersSectionProps {
  mac: string
  share: boolean
  ownerId?: string
  onChange?: () => void
}

/**
 * BindUsersSection · 设备绑定用户主视图 section (v3 hybrid Page B 配套, #32 移出 tab)
 *
 * 把原本藏在「绑定用户」tab 里的 TerminalBindUsers 表提到主视图,
 * 跟挂载设备一起形成完整的「设备关系」区域。
 *
 * 视觉: 玻璃 bento-card · 单卡包整表 · 紫光阴影
 * 复用: TerminalBindUsers (server data + share/owner 鉴权 + update callback)
 */
export function BindUsersSection({ mac, share, ownerId, onChange }: BindUsersSectionProps) {
  return (
    <div
      className="bento-card"
      style={{
        padding: 20,
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'var(--shadow-bento)',
        borderRadius: 'var(--radius-2xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-info) 0%, var(--brand-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <TeamOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>设备绑定用户</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            分享状态: {share ? '开启' : '关闭'} · 完整表格
          </div>
        </div>
      </div>

      <TerminalBindUsers
        mac={mac}
        share={share}
        ownerId={ownerId ?? ''}
        update={() => onChange?.()}
      />
    </div>
  )
}
