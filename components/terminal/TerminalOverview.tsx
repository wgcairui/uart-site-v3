'use client'

import { useState } from 'react'
import { Tooltip, Tag } from 'antd'
import {
  InfoCircleOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  NodeIndexOutlined,
  CheckCircleFilled,
  WarningFilled,
  CopyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { TerminalAddMountDev } from './TerminalAddMountDev'

interface TerminalOverviewProps {
  terminal: Uart.Terminal
  onChange?: () => void
}

interface KVItem {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  copyable?: string | undefined
  fullWidth?: boolean | undefined
}

/**
 * TerminalOverview · 终端信息卡 (v3 hybrid Page B 配套)
 *
 * 把原本藏在「详细信息」tab 里的 terminal 静态数据提到主视图,
 * 填掉 LiveControls 在 terminal 级别无效(需 mount device pid)留下的空白。
 *
 * 12 KV · 3x4 grid (响应式):
 * - 别名(name) / 状态(online) / 共享(share)
 * - AT / PID / 挂载节点
 * - ICCID / IP / Port
 * - 信号 / 定位(jw) / 更新时间
 *
 * 视觉: 玻璃 bento-card 16px padding · 18px 圆角 · 紫光阴影
 * 防御: 所有字段 ?? '-' 兜底, trial mode 缺数据也漂亮渲染
 */
export function TerminalOverview({ terminal, onChange }: TerminalOverviewProps) {
  const [addOpen, setAddOpen] = useState(false)
  const t = terminal
  const online = !!t.online
  const mountDevCount = t.mountDevs?.length ?? 0

  const items: KVItem[] = [
    {
      label: '别名',
      value: t.name || '-',
      copyable: t.name || undefined,
    },
    {
      label: '状态',
      icon: <ApiOutlined />,
      value: online ? (
        <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CheckCircleFilled /> 实时连接
        </span>
      ) : (
        <span style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <WarningFilled /> 离线
        </span>
      ),
    },
    {
      label: '共享',
      value: t.share ? <Tag color="processing">开启</Tag> : <Tag>关闭</Tag>,
    },
    {
      label: 'AT 支持',
      icon: <ThunderboltOutlined />,
      value: t.AT ? <Tag color="cyan">支持</Tag> : <Tag>不支持</Tag>,
    },
    {
      label: 'PID',
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.PID || '-'}</span>,
      copyable: t.PID || undefined,
    },
    {
      label: '挂载节点',
      icon: <NodeIndexOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.mountNode || '-'}</span>,
      copyable: t.mountNode || undefined,
    },
    {
      label: 'ICCID',
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.ICCID || '-'}</span>,
      copyable: t.ICCID || undefined,
    },
    {
      label: '设备 IP',
      icon: <GlobalOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.ip || '-'}</span>,
      copyable: t.ip || undefined,
    },
    {
      label: 'TCP 端口',
      value: t.port ?? '-',
    },
    {
      label: '信号强度',
      value: t.signal != null ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SignalBars value={t.signal} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{t.signal}</span>
        </span>
      ) : '-',
    },
    {
      label: '设备定位',
      icon: <EnvironmentOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.jw || '-'}</span>,
      copyable: t.jw || undefined,
    },
    {
      label: '固件版本',
      value: (
        <span style={{ display: 'inline-flex', gap: 8, fontFamily: 'var(--font-mono)' }}>
          {t.Gver ? <Tooltip title="GPRS 固件"><Tag color="purple">G {t.Gver}</Tag></Tooltip> : null}
          {t.ver ? <Tooltip title="应用固件"><Tag color="blue">V {t.ver}</Tag></Tooltip> : null}
          {!t.Gver && !t.ver ? '-' : null}
        </span>
      ),
    },
  ]

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <InfoCircleOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>终端信息</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            静态参数 · 12 KV
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Tag color={mountDevCount > 0 ? 'purple' : 'default'}>
            {mountDevCount} 个挂载设备
          </Tag>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '4px 18px',
          flex: 1,
          alignContent: 'start',
        }}
      >
        {items.map((it, i) => (
          <KVRow key={i} item={it} />
        ))}
      </div>

      <div
        style={{
          marginTop: 16, paddingTop: 14,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
        }}
      >
        <span>更新时间: {t.uptime ? dayjs(t.uptime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        <span>iotStat: {t.iotStat || '-'}</span>
      </div>

      <TerminalAddMountDev
        visible={addOpen}
        mac={t.DevMac}
        onCancel={() => setAddOpen(false)}
        onChange={() => { onChange?.(); setAddOpen(false) }}
      />
    </div>
  )
}

function KVRow({ item }: { item: KVItem }) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--ink-100)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-500)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {item.icon}
        {item.label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--ink-900)',
          fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={typeof item.value === 'string' ? item.value : undefined}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
        {item.copyable ? (
          <Tooltip title="复制">
            <CopyOutlined
              style={{ color: 'var(--ink-400)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => {
                navigator.clipboard?.writeText(item.copyable!)
              }}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function SignalBars({ value }: { value: number }) {
  // 0-31 CSQ 范围, 显示 4 格信号
  const level = value <= 0 ? 0 : value < 10 ? 1 : value < 20 ? 2 : value < 25 ? 3 : 4
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[1, 2, 3, 4].map((bar) => {
        const active = bar <= level
        const h = 4 + bar * 2.5
        return (
          <span
            key={bar}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              background: active ? 'var(--color-success)' : 'var(--ink-200)',
              transition: 'background 0.2s',
            }}
          />
        )
      })}
    </span>
  )
}
