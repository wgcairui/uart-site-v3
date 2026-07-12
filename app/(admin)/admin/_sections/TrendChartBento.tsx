'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getAdminTileHistory } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 趋势 bento (v4 增强 · 决策 C + sibling d81dbeb 2026-07-12)
 *
 * 数据源: /api/v2/admin/dashboard/tiles/:name/history
 *   - 7d  (默认, hours=168, granularity=hour)
 *   - 30d (hours=720, granularity=day)  ← sibling PR-B 扩展
 *
 * 切换: 7天 / 30天 按钮
 */
type Mode = '7d' | '30d'
const MODE_CONFIG: Record<Mode, { hours: number; granularity: 'hour' | 'day'; label: string }> = {
    '7d': { hours: 168, granularity: 'hour', label: '7天' },
    '30d': { hours: 720, granularity: 'day', label: '30天' },
}

export function TrendChartBento({ refreshTick }: { refreshTick?: number }) {
    const [mode, setMode] = useState<Mode>('7d')
    const [onlineBuckets, setOnlineBuckets] = useState<any[]>([])
    const [offlineBuckets, setOfflineBuckets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        setLoading(true)
        const cfg = MODE_CONFIG[mode]
        Promise.all([
            getAdminTileHistory('online', cfg.hours, cfg.granularity),
            getAdminTileHistory('offline', cfg.hours, cfg.granularity),
        ])
            .then(([on, off]) => {
                if (!alive) return
                setOnlineBuckets(on.data.buckets || [])
                setOfflineBuckets(off.data.buckets || [])
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [mode, refreshTick])

    if (loading) return <Spin />

    const cfg = MODE_CONFIG[mode]
    const max = Math.max(
        1,
        ...onlineBuckets.map((b: any) => b.count || 0),
        ...offlineBuckets.map((b: any) => b.count || 0),
    )
    const todayDay = new Date().toISOString().split('T')[0]?.slice(5) // MM-DD
    const todayHour = new Date().toISOString().slice(5, 13) // MM-DDTHH

    const isToday = (b: any) => cfg.granularity === 'day'
        ? b.day?.slice(5) === todayDay
        : b.hour?.slice(5, 13) === todayHour

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ color: 'var(--ink-900)', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        趋势 · online / offline
                    </h3>
                    <div style={{ color: 'var(--ink-500)', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {cfg.label} · {cfg.granularity} granularity · {onlineBuckets.length} buckets
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--ink-50)', borderRadius: 8, padding: 3 }}>
                    {(['7d', '30d'] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                padding: '4px 12px', fontSize: 11, fontWeight: 500,
                                border: 'none', borderRadius: 6, cursor: 'pointer',
                                background: mode === m ? '#fff' : 'transparent',
                                color: mode === m ? 'var(--brand-600)' : 'var(--ink-500)',
                                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all .2s',
                            }}
                        >
                            {MODE_CONFIG[m].label}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: cfg.granularity === 'day' ? 6 : 4, height: 140, paddingTop: 8 }}>
                {onlineBuckets.map((b: any, i: number) => {
                    const height = `${((b.count || 0) / max) * 100}%`
                    const today = isToday(b)
                    return (
                        <div
                            key={cfg.granularity === 'day' ? b.day : b.hour}
                            style={{
                                flex: 1, height, borderRadius: '6px 6px 0 0',
                                background: today
                                    ? 'linear-gradient(180deg, var(--accent-400), #ec4899)'
                                    : 'linear-gradient(180deg, var(--brand-300), var(--brand-500))',
                                position: 'relative', transition: 'all .3s', minHeight: 4,
                            }}
                            title={`${cfg.granularity === 'day' ? b.day : b.hour} · ${b.count}`}
                        >
                            {(b.count || 0) > 0 && cfg.granularity === 'day' && (
                                <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-900)' }}>
                                    {b.count}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
            <div style={{ marginTop: cfg.granularity === 'day' ? 8 : 32, display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-500)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--brand-400)' }} />
                    online
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--ink-300)' }} />
                    offline
                </span>
                {cfg.granularity === 'day' && onlineBuckets.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {onlineBuckets[0].day} → {onlineBuckets[onlineBuckets.length - 1].day}
                    </span>
                )}
            </div>
        </div>
    )
}

export default TrendChartBento
