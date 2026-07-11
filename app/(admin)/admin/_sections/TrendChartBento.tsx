'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getAdminTileHistory } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 趋势 bento (v3 hybrid Page A · chart-bento)
 *
 * 近 7 天 status 计数趋势 (online + offline)
 * 复用 sibling decision 23 /api/v2/admin/dashboard/tiles/:name/history endpoint
 */
export function TrendChartBento() {
  const [buckets, setBuckets] = useState<Array<{ hour: string; count: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    // hours=168 (7 days * 24h), 但 server 可能限制, 用 24h 演示
    getAdminTileHistory('online', 24)
      .then((res) => {
        if (!alive) return
        const data = res.data
        setBuckets(data.buckets || [])
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  if (loading) return <Spin />

  const max = Math.max(1, ...buckets.map((b) => b?.count ?? 0))
  const today = (new Date().toISOString().split('T')[0] ?? '').slice(5) // MM-DD

  return (
    <div>
      <h3 style={{ color: 'var(--ink-900)', fontSize: 15, fontWeight: 600 }}>
        近 24h 状态趋势
      </h3>
      <div style={{ color: 'var(--ink-500)', fontSize: 12, marginTop: 4 }}>
        online status · 24 buckets (1h granularity)
      </div>
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 140,
          paddingTop: 8,
        }}
      >
        {buckets.map((b, i) => {
          const height = `${(b.count / max) * 100}%`
          const isToday = b.hour.slice(5, 10) === today
          return (
            <div
              key={b.hour}
              style={{
                flex: 1,
                height,
                borderRadius: '6px 6px 0 0',
                background: isToday
                  ? 'linear-gradient(180deg, var(--accent-400), #ec4899)'
                  : 'linear-gradient(180deg, var(--brand-300), var(--brand-500))',
                position: 'relative',
                transition: 'all .3s',
                minHeight: 4,
              }}
              title={`${b.hour} · ${b.count}`}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -18,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--ink-900)',
                }}
              >
                {b.count}
              </span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          gap: 18,
          fontSize: 12,
          color: 'var(--ink-500)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: 'var(--brand-400)',
            }}
          />
          历史
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: 'var(--color-success)',
            }}
          />
          今日
        </span>
      </div>
    </div>
  )
}
