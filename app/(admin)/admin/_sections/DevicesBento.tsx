'use client'
import { useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { getTerminals } from '@/lib/api/fetchRoot'
import { StatusTag } from '@/components/common/StatusTag'

/**
 * 设备列表 bento (v3 hybrid Page A · devices-bento)
 *
 * 12 列跨度, 顶部 filter chips (全部/在线/离线/告警) + 5 行设备 preview
 * 跟 sibling decision 23 status enum 配套
 */
type FilterKey = 'all' | 'online' | 'offline' | 'warn' | 'error'

export function DevicesBento() {
  const [list, setList] = useState<Uart.Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let alive = true
    getTerminals(undefined, { page: 1, pageSize: 100 } as any)
      .then((res: any) => {
        if (!alive) return
        setList((res?.data?.items || res?.data || []) as Uart.Terminal[])
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const counts = useMemo(
    () => ({
      all: list.length,
      online: list.filter((d) => (d as any).status === 'online' || (d as any).online).length,
      offline: list.filter((d) => (d as any).status === 'offline' || (!(d as any).online && (d as any).online !== undefined)).length,
      warn: list.filter((d) => (d as any).status === 'warning').length,
      error: list.filter((d) => (d as any).status === 'error').length,
    }),
    [list]
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return list.slice(0, 5)
    return list.filter((d) => {
      const s = (d as any).status
      const o = (d as any).online
      if (filter === 'online') return s === 'online' || (s === undefined && o)
      if (filter === 'offline') return s === 'offline' || (s === undefined && !o && o !== undefined)
      if (filter === 'warn') return s === 'warning'
      if (filter === 'error') return s === 'error'
      return true
    }).slice(0, 5)
  }, [list, filter])

  if (loading) return <Spin />

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: `全部 · ${counts.all}` },
    { key: 'online', label: `在线 · ${counts.online}` },
    { key: 'offline', label: `离线 · ${counts.offline}` },
    { key: 'warn', label: `告警 · ${counts.warn}` },
    { key: 'error', label: `故障 · ${counts.error}` },
  ]

  return (
    <div style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
        }}
      >
        <h3 style={{ color: 'var(--ink-900)', fontSize: 15, fontWeight: 600 }}>设备列表</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: filter === f.key ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                border: `1px solid ${filter === f.key ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}`,
                fontSize: 12,
                color: filter === f.key ? 'var(--brand-500)' : 'var(--ink-500)',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1.2fr 0.6fr',
          padding: '14px 24px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--ink-500)',
          background: 'rgba(237, 233, 254, 0.3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>设备 MAC</div>
        <div>状态</div>
        <div>节点</div>
        <div>最后上报</div>
        <div>操作</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500)' }}>
          暂无数据
        </div>
      ) : (
        filtered.map((d, i) => {
          const status = (d as any).status as 'online' | 'offline' | 'warning' | 'error' | undefined
          const online = (d as any).online as boolean | undefined
          const finalStatus = status || (online === true ? 'online' : online === false ? 'offline' : 'idle')
          return (
            <div
              key={(d as any)._id || (d as any).mac || i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1.2fr 0.6fr',
                alignItems: 'center',
                padding: '14px 24px',
                fontSize: 13.5,
                gap: 12,
                borderTop: i === 0 ? 'none' : '1px solid rgba(139, 92, 246, 0.06)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--ink-900)',
                }}
              >
                {(d as any).mac || (d as any)._id}
              </div>
              <div>
                <StatusTag variant={finalStatus as any} />
              </div>
              <div style={{ color: 'var(--ink-700)' }}>{(d as any).NodeName || '-'}</div>
              <div style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                {(d as any).updateTime
                  ? new Date((d as any).updateTime).toLocaleString('zh-CN', { hour12: false })
                  : '-'}
              </div>
              <div>
                <a
                  href={`/admin/node/terminal/${(d as any).mac || (d as any)._id}`}
                  style={{ color: 'var(--brand-500)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                >
                  查看 →
                </a>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
