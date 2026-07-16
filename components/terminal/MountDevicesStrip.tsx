'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Tooltip, Empty, Button } from 'antd'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  WarningFilled,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { devTypeIcon } from '@/components/common/IconFont'
import { TerminalAddMountDev } from './TerminalAddMountDev'

interface MountDevicesStripProps {
  mac: string
  mountDevs: Uart.TerminalMountDevs[]
  onChange?: () => void
}

/**
 * MountDevicesStrip · 终端挂载设备横向条 (v3 hybrid Page B 配套)
 *
 * 把原本藏在「挂载设备」tab 里的子设备列表提到主视图,
 * 一眼看到所有 pid 的状态 + 协议 + 在线情况, 点击进入详情。
 *
 * 视觉: 玻璃 bento-card · 横向 flex row · compact card · 紫光 hover
 * 空状态: "暂无挂载设备" + 添加按钮 (复用 TerminalAddMountDev)
 * 防御: 缺字段 '?' 兜底
 */
export function MountDevicesStrip({ mac, mountDevs, onChange }: MountDevicesStripProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const list = Array.isArray(mountDevs) ? mountDevs : []

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
            background: 'linear-gradient(135deg, #06b6d4 0%, var(--brand-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <AppstoreOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>挂载设备</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {list.length} 个子设备 · 点击进入详情
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
            style={{ borderRadius: 8 }}
          >
            添加设备
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>
              暂无挂载设备 · 点击右上「添加设备」注册
            </span>
          }
          style={{ padding: '24px 0' }}
        >
          <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            添加设备
          </Button>
        </Empty>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            padding: '4px 2px 8px',
            scrollbarWidth: 'thin',
          }}
        >
          {list.map((dev) => (
            <MountDevCard
              key={`${mac}-${dev.pid}`}
              dev={dev}
              onClick={() => router.push(`/admin/node/terminal/${mac}?tab=${dev.pid}`)}
            />
          ))}
        </div>
      )}

      <TerminalAddMountDev
        visible={addOpen}
        mac={mac}
        onCancel={() => setAddOpen(false)}
        onChange={() => { onChange?.(); setAddOpen(false) }}
      />
    </div>
  )
}

function MountDevCard({
  dev,
  onClick,
}: {
  dev: Uart.TerminalMountDevs
  onClick: () => void
}) {
  const online = !!dev.online
  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />

  return (
    <div
      onClick={onClick}
      style={{
        flex: '0 0 220px',
        minHeight: 132,
        padding: 14,
        borderRadius: 14,
        background: online
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.04) 0%, rgba(245, 158, 11, 0.04) 100%)',
        border: online
          ? '1px solid rgba(16, 185, 129, 0.15)'
          : '1px solid rgba(245, 158, 11, 0.18)',
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-bento-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            color: online ? 'var(--color-success)' : 'var(--color-warning)',
            boxShadow: '0 2px 8px -2px rgba(99, 102, 241, 0.15)',
          }}
        >
          {iconEl}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={dev.mountDev}
          >
            {dev.mountDev || '未命名'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
            PID {dev.pid} · {dev.Type || '?'}
          </div>
        </div>
        <Tooltip title={online ? '在线' : '离线'}>
          {online ? (
            <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 14 }} />
          ) : (
            <WarningFilled style={{ color: 'var(--color-warning)', fontSize: 14 }} />
          )}
        </Tooltip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Tag color={online ? 'success' : 'warning'} style={{ margin: 0, fontSize: 11 }}>
          {online ? '在线' : '离线'}
        </Tag>
        <Tag color="purple" style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {dev.protocol || '未配置'}
        </Tag>
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--brand-500)', fontWeight: 500,
        }}
      >
        <span>查看详情</span>
        <ArrowRightOutlined />
      </div>
    </div>
  )
}
