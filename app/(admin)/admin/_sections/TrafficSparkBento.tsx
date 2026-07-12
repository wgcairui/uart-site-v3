'use client'
import { useEffect, useState } from 'react'
import { Spin, Tooltip } from 'antd'
import { ThunderboltFilled } from '@ant-design/icons'
import { getTrafficSparkline } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 实时流量 sparkline bento (决策 C + sibling d81dbeb 2026-07-12)
 *
 * 数据源: /api/v2/admin/dashboard/traffic/sparkline?minutes=60
 * 渲染: SVG 折线 + 渐变填充区 + 总数/均值/峰值
 * 切换: 60min / 240min / 720min (1h / 4h / 12h)
 */
export function TrafficSparkBento({ refreshTick }: { refreshTick: number }) {
    const [minutes, setMinutes] = useState(60)
    const [data, setData] = useState<{ points: { ts: string; count: number }[]; total: number; avg: number; minutes: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        setLoading(true)
        getTrafficSparkline(minutes)
            .then((res) => {
                if (!alive) return
                setData(res.data)
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [minutes, refreshTick])

    if (loading || !data) return <Spin />

    const points = data.points
    if (points.length === 0) {
        return (
            <div className="bento-card" style={{ padding: 24, height: '100%' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThunderboltFilled style={{ color: '#8b5cf6' }} /> 实时流量
                </h3>
                <div style={{ color: 'var(--ink-500)', fontSize: 12, textAlign: 'center', padding: 40 }}>暂无流量数据</div>
            </div>
        )
    }

    const w = 580, h = 140
    const padL = 36, padR = 8, padT = 12, padB = 20
    const chartW = w - padL - padR, chartH = h - padT - padB
    const max = Math.max(1, ...points.map(p => p.count))
    const xStep = chartW / Math.max(1, points.length - 1)
    const pts = points.map((p, i) => [padL + i * xStep, padT + chartH * (1 - p.count / max)] as const)
    const polyPts = pts.map(p => p.join(',')).join(' ')
    const areaPts = `${padL},${padT + chartH} ${polyPts} ${padL + (points.length - 1) * xStep},${padT + chartH}`
    const peakIdx = points.reduce((bestIdx, p, i) => (p.count > (points[bestIdx]?.count ?? 0) ? i : bestIdx), 0)
    const peak = points[peakIdx]!
    const startTs = new Date(points[0]!.ts)
    const endTs = new Date(points[points.length - 1]!.ts)
    const fmt = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ThunderboltFilled style={{ color: '#8b5cf6' }} /> 实时流量
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        terminal events · {fmt(startTs)} → {fmt(endTs)}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                    <Stat label="总数" value={data.total} />
                    <Stat label="均值" value={`${data.avg.toFixed(1)}/min`} color="#8b5cf6" />
                    <Stat label="峰值" value={peak.count} color="#f59e0b" tip={`@ ${fmt(new Date(peak.ts!))}`} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'flex-end' }}>
                {[60, 240, 720].map(m => (
                    <button
                        key={m}
                        onClick={() => setMinutes(m)}
                        style={{
                            padding: '3px 10px', fontSize: 11, fontWeight: 500,
                            border: 'none', borderRadius: 6, cursor: 'pointer',
                            background: minutes === m ? 'var(--brand-500)' : 'var(--ink-50)',
                            color: minutes === m ? '#fff' : 'var(--ink-500)',
                            transition: 'all .2s',
                        }}
                    >
                        {m >= 60 ? `${m / 60}h` : `${m}min`}
                    </button>
                ))}
            </div>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
                <defs>
                    <linearGradient id="trafficGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* y axis grid */}
                {[0, 0.5, 1].map((p, i) => (
                    <line key={i} x1={padL} x2={w - padR} y1={padT + chartH * p} y2={padT + chartH * p} stroke="var(--ink-100)" strokeWidth="1" strokeDasharray={p === 0 ? '0' : '2 3'} />
                ))}
                {/* area fill */}
                <polygon points={areaPts} fill="url(#trafficGrad)" />
                {/* line */}
                <polyline points={polyPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* peak marker */}
                <circle cx={pts[peakIdx]![0]} cy={pts[peakIdx]![1]} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                {/* x axis labels */}
                {points.length > 0 && (
                    <>
                        <text x={padL} y={h - 6} fontSize="9" fill="var(--ink-500)" fontFamily="var(--font-mono)">{fmt(startTs)}</text>
                        <text x={w / 2} y={h - 6} fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontFamily="var(--font-mono)">{fmt(new Date((startTs.getTime() + endTs.getTime()) / 2))}</text>
                        <text x={w - padR} y={h - 6} fontSize="9" fill="var(--ink-500)" textAnchor="end" fontFamily="var(--font-mono)">{fmt(endTs)}</text>
                    </>
                )}
            </svg>
        </div>
    )
}

function Stat({ label, value, color, tip }: { label: string; value: number | string; color?: string; tip?: string }) {
    const node = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--ink-500)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: color || 'var(--ink-900)', fontFamily: 'var(--font-mono)' }}>{value}</span>
        </div>
    )
    return tip ? <Tooltip title={tip}>{node}</Tooltip> : node
}

export default TrafficSparkBento
