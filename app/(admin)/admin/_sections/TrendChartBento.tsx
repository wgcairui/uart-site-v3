'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getAdminTileHistory, getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 趋势 bento (v4 增强 · 决策 C + sibling d81dbeb 2026-07-12)
 *
 * 数据源:
 *   - 历史: /api/v2/admin/dashboard/tiles/offline/history?hours=168|720&granularity=hour|day
 *     ← sibling PR-B 端点: log.terminalEvents kind=TERMINAL_OFFLINE 桶聚合
 *   - 当前快照: /api/v2/admin/dashboard/tiles
 *     ← fallback: 当 history 端点返全 0 (server 端没 emit TERMINAL_OFFLINE 事件) 时,
 *        拿当前 online/offline 数字显示快照, 等 sibling emit 实现后自动显示真趋势
 *
 * ⚠️ 已知 sibling P0: server 端从未 emit TERMINAL_OFFLINE 事件 (terminalEvents collection 0 docs)
 *    在 sibling 修之前, 7d/30d trend 会全 0, 这里用 tileCounts 兜底显示当前 snapshot
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
    const [offlineBuckets, setOfflineBuckets] = useState<any[]>([])
    const [snapshot, setSnapshot] = useState<{ online: number; offline: number; total: number } | null>(null)
    const [loading, setLoading] = useState(true)
    const [dataEmpty, setDataEmpty] = useState(false)

    useEffect(() => {
        let alive = true
        setLoading(true)
        const cfg = MODE_CONFIG[mode]
        Promise.all([
            getAdminTileHistory('offline', cfg.hours, cfg.granularity),
            getAdminTileCounts(),
        ])
            .then(([off, counts]) => {
                if (!alive) return
                const buckets = off.data.buckets || []
                setOfflineBuckets(buckets)
                const totalCount = buckets.reduce((s: number, b: any) => s + (b.count || 0), 0)
                setDataEmpty(totalCount === 0)
                const c = counts.data || {}
                setSnapshot({
                    online: c.online ?? 0,
                    offline: c.offline ?? 0,
                    total: (c.online ?? 0) + (c.offline ?? 0),
                })
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [mode, refreshTick])

    if (loading) return <Spin />

    const cfg = MODE_CONFIG[mode]
    const max = Math.max(
        1,
        ...offlineBuckets.map((b: any) => b.count || 0),
    )
    const todayDay = new Date().toISOString().split('T')[0]?.slice(5)
    const todayHour = new Date().toISOString().slice(5, 13)

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
                        {cfg.label} · {cfg.granularity} granularity · {offlineBuckets.length} buckets
                        {dataEmpty && snapshot && (
                            <span style={{ marginLeft: 8, color: 'var(--accent-500, #f59e0b)' }}>
                                · 历史 0 (server emit 待实现) → 当前快照
                            </span>
                        )}
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

            {dataEmpty && snapshot ? (
                // 历史端点全 0 (sibling 未 emit TERMINAL_OFFLINE) → 显示当前快照 fallback
                <>
                    <div
                        style={{
                            marginTop: 16,
                            padding: '10px 14px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: 10,
                            fontSize: 12,
                            color: '#b45309',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            lineHeight: 1.6,
                        }}
                    >
                        <span style={{ fontSize: 14, lineHeight: 1 }}>⏳</span>
                        <div>
                            <strong>历史趋势等待 server emit TERMINAL_OFFLINE 事件</strong>
                            <div style={{ color: '#92400e', fontSize: 11, marginTop: 2 }}>
                                PR-B 端点已就绪, 等 sibling uart-server 把离线事件写入 <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.04)', padding: '1px 4px', borderRadius: 3 }}>log.terminalEvents</code> collection 后自动激活。下面是当前实时快照。
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, height: 120 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                                当前 online
                            </div>
                            <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--brand-600, #7c3aed)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                                {snapshot.online}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 56, background: 'var(--ink-200, #e5e7eb)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                                当前 offline
                            </div>
                            <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--ink-500, #6b7280)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                                {snapshot.offline}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 56, background: 'var(--ink-200, #e5e7eb)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                                总数
                            </div>
                            <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--ink-900)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                                {snapshot.total}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: cfg.granularity === 'day' ? 6 : 4, height: 140, paddingTop: 8 }}>
                    {offlineBuckets.map((b: any, i: number) => {
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
                                title={`${cfg.granularity === 'day' ? b.day : b.hour} · offline 翻转 ${b.count}`}
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
            )}

            <div style={{ marginTop: cfg.granularity === 'day' ? 8 : 32, display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-500)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--brand-400)' }} />
                    online
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--ink-300)' }} />
                    offline
                </span>
                {!dataEmpty && cfg.granularity === 'day' && offlineBuckets.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {offlineBuckets[0].day} → {offlineBuckets[offlineBuckets.length - 1].day}
                    </span>
                )}
            </div>
        </div>
    )
}

export default TrendChartBento
