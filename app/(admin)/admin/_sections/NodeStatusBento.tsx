'use client'
import { useEffect, useState } from 'react'
import { Spin, Tooltip } from 'antd'
import { NodeInfo, runingState } from '@/lib/api/fetchRoot'
import { getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { StatusTag } from '@/components/common/StatusTag'

/**
 * terminals 状态 bento (v3 hybrid Page A · status-bento)
 *
 * 6 variant 状态分布 (online/offline/warn/error/info/idle)
 * 跟 sibling decision 23 server status enum 配套
 *
 * 注: 跟 node 状态无关 — 数据源是 terminal.status (设备上报状态),
 *     节点 (DTU) 状态在 ServerStatusTable 单独管理
 */
export function NodeStatusBento({ refreshTick }: { refreshTick: number }) {
  const [counts, setCounts] = useState<Uart.AdminStatusCounts | null>(null)
  const [nodes, setNodes] = useState<any[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([getAdminTileCounts(), NodeInfo()])
      .then(([c, n]) => {
        if (!alive) return
        setCounts(c.data)
        setNodes(((n as any).data?.items || (n as any).data || []) as any[])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [refreshTick])

  if (!counts) return <Spin />

  const rows: Array<{ key: keyof Uart.AdminStatusCounts; label: string; pulse?: boolean; muted?: boolean; tooltip?: string }> = [
    { key: 'online', label: '在线终端', pulse: true },
    { key: 'offline', label: '离线终端' },
    { key: 'warning', label: '告警终端', muted: true, tooltip: '设备触发 ALARM_TRIGGER 事件,等待恢复' },
    { key: 'error', label: '故障终端', muted: true, tooltip: '设备连接异常 / DTU 链路层失败' },
    { key: 'info', label: '提示终端', muted: true, tooltip: '设备上报参数类告警,无服务故障' },
    { key: 'idle', label: '空闲终端', muted: true, tooltip: '设备已注册但无最近心跳' },
  ]

  // 4 个非主状态都为 0 — 提示等待 alarm/异常事件触发
  const allOptionalZero = ['warning', 'error', 'info', 'idle'].every(k => (counts[k as keyof Uart.AdminStatusCounts] ?? 0) === 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ color: 'var(--ink-900)', fontSize: 15, fontWeight: 600 }}>
          terminals 状态分布
        </h3>
        <span style={{ fontSize: 10, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>terminal.status · live</span>
      </div>
      {rows.map((r) => (
        <Tooltip key={r.key} title={r.tooltip} placement="left">
          <div
            className="status-row-bento"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              background: r.muted ? 'rgba(248, 250, 252, 0.4)' : 'rgba(248, 250, 252, 0.7)',
              fontSize: 13,
              opacity: r.muted && (counts[r.key] ?? 0) === 0 ? 0.55 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-700)', fontWeight: 500 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: `var(--color-${r.key === 'online' ? 'success' : r.key === 'offline' || r.key === 'error' ? 'danger' : r.key === 'warning' ? 'warning' : 'info'})`,
                  animation: r.pulse ? 'pulse-dot 2s infinite' : 'none',
                }}
              />
              <StatusTag variant={r.key as any} />
              <span>{r.label}</span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: r.muted && (counts[r.key] ?? 0) === 0 ? 'var(--ink-400)' : 'var(--ink-700)',
                fontWeight: 600,
              }}
            >
              {counts[r.key] ?? 0}
            </span>
          </div>
        </Tooltip>
      ))}
      {allOptionalZero && (
        <div
          style={{
            marginTop: 4,
            padding: '8px 10px',
            background: 'rgba(139, 92, 246, 0.06)',
            border: '1px solid rgba(139, 92, 246, 0.12)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--brand-600, #7c3aed)',
            lineHeight: 1.5,
          }}
        >
          💡 4 个非主状态为 0 — 当前无 alarm/故障/参数告警/空闲事件触发,系统健康。
        </div>
      )}
    </div>
  )
}
