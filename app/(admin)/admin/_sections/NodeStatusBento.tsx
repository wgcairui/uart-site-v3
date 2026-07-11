'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { NodeInfo, runingState } from '@/lib/api/fetchRoot'
import { getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { StatusTag } from '@/components/common/StatusTag'

/**
 * 节点状态 bento (v3 hybrid Page A · status-bento)
 *
 * 6 variant 状态分布 (online/offline/warn/error/info/idle)
 * 跟 sibling decision 23 server status enum 配套
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

  const rows: Array<{ key: keyof Uart.AdminStatusCounts; label: string; pulse?: boolean }> = [
    { key: 'online', label: '在线节点', pulse: true },
    { key: 'offline', label: '离线节点' },
    { key: 'warning', label: '告警节点' },
    { key: 'error', label: '故障节点' },
    { key: 'info', label: '提示节点' },
    { key: 'idle', label: '空闲节点' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ color: 'var(--ink-900)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        节点状态分布
      </h3>
      {rows.map((r) => (
        <div
          key={r.key}
          className="status-row-bento"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(248, 250, 252, 0.7)',
            fontSize: 13,
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
              color: 'var(--ink-500)',
              fontWeight: 600,
            }}
          >
            {counts[r.key] ?? 0}
          </span>
        </div>
      ))}
    </div>
  )
}
