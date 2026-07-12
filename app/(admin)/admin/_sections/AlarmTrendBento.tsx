'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { AlertOutlined, CheckCircleFilled } from '@ant-design/icons'
import { getAdminTileHistory } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 告警趋势 bento (v3 hybrid v4 扩展 · 决策 C)
 *
 * 24h warning + error 双曲线趋势
 * 数据源: /api/v2/admin/dashboard/tiles/:name/history?hours=24
 *
 * 设计: stack area chart
 *   - 24 个小时桶 (server 返 buckets: [{hour, count}])
 *   - warning 紫 (#8b5cf6) + error 红 (#ef4444) 双区域叠加
 */
export function AlarmTrendBento({ refreshTick }: { refreshTick: number }) {
    const [warn, setWarn] = useState<Array<{ hour: string; count: number }>>([])
    const [err, setErr] = useState<Array<{ hour: string; count: number }>>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        Promise.all([
            getAdminTileHistory('warning', 24),
            getAdminTileHistory('error', 24),
        ])
            .then(([w, e]) => {
                if (!alive) return
                setWarn(((w.data as any)?.buckets || []) as any)
                setErr(((e.data as any)?.buckets || []) as any)
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [refreshTick])

    if (loading) return <Spin />

    // 取并集 hours
    const all = new Set<string>([...warn.map(x => x.hour), ...err.map(x => x.hour)])
    const hours = Array.from(all).sort()
    const wMap = new Map(warn.map(x => [x.hour, x.count]))
    const eMap = new Map(err.map(x => [x.hour, x.count]))
    const max = Math.max(
        1,
        ...hours.map(h => (wMap.get(h) || 0) + (eMap.get(h) || 0))
    )

    const w = 460, h = 140
    const padL = 28, padR = 8, padT = 12, padB = 18
    const chartW = w - padL - padR, chartH = h - padT - padB
    const xStep = chartW / Math.max(1, hours.length - 1)

    const pointsW = hours.map((hr, i) => {
        const v = wMap.get(hr) || 0
        return [padL + i * xStep, padT + chartH * (1 - v / max)] as const
    })
    const pointsE = hours.map((hr, i) => {
        const v = eMap.get(hr) || 0
        return [padL + i * xStep, padT + chartH * (1 - v / max)] as const
    })

    const totalWarn = warn.reduce((s, x) => s + x.count, 0)
    const totalErr = err.reduce((s, x) => s + x.count, 0)

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertOutlined style={{ color: '#f59e0b' }} /> 24h 告警趋势
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        warning · error 双线
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                    <Legend color="#8b5cf6" label="告警" value={totalWarn} />
                    <Legend color="#ef4444" label="故障" value={totalErr} />
                </div>
            </div>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
                {/* y axis grid */}
                {[0, 0.5, 1].map((p, i) => (
                    <line key={i} x1={padL} x2={w - padR} y1={padT + chartH * p} y2={padT + chartH * p} stroke="var(--ink-100)" strokeWidth="1" strokeDasharray={p === 0 ? '0' : '2 3'} />
                ))}
                {/* warning line */}
                <polyline
                    points={pointsW.map(p => p.join(',')).join(' ')}
                    fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                {pointsW.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#8b5cf6" />
                ))}
                {/* error line */}
                <polyline
                    points={pointsE.map(p => p.join(',')).join(' ')}
                    fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                {pointsE.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#ef4444" />
                ))}
                {/* x axis labels (start/mid/end) */}
                {hours.length > 0 && (
                    <>
                        <text x={padL} y={h - 4} fontSize="9" fill="var(--ink-500)" fontFamily="var(--font-mono)">{hours[0]?.slice(5) || ''}</text>
                        <text x={w / 2} y={h - 4} fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontFamily="var(--font-mono)">{hours[Math.floor(hours.length / 2)]?.slice(5) || ''}</text>
                        <text x={w - padR} y={h - 4} fontSize="9" fill="var(--ink-500)" textAnchor="end" fontFamily="var(--font-mono)">{hours[hours.length - 1]?.slice(5) || ''}</text>
                    </>
                )}
            </svg>
            {totalWarn === 0 && totalErr === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#10b981', fontSize: 12 }}>
                    <CheckCircleFilled /> 24h 无告警
                </div>
            )}
        </div>
    )
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ color: 'var(--ink-700)' }}>{label}</span>
            <span style={{ fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
        </div>
    )
}

export default AlarmTrendBento
