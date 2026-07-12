'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { HeartFilled, CheckCircleFilled, WarningFilled, CloseCircleFilled } from '@ant-design/icons'
import { getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { runingState } from '@/lib/api/fetchRoot'

/**
 * 健康度评分 bento (v3 hybrid v4 扩展 · 决策 C)
 *
 * 算法: score = (online + idle) / total * 100
 *   - 90-100 优秀 (绿色, CheckCircleFilled)
 *   - 70-89  良好 (蓝色)
 *   - 50-69  警告 (黄色, WarningFilled)
 *   - 0-49   危险 (红色, CloseCircleFilled)
 *
 * 数据源: /api/v2/admin/dashboard/tiles (6 status enum) + /api/v2/admin/dashboard/stats (timeoutAgg)
 */
export function HealthScoreBento({ refreshTick }: { refreshTick: number }) {
    const [score, setScore] = useState<number | null>(null)
    const [breakdown, setBreakdown] = useState<{ ok: number; warn: number; bad: number; total: number; timeout: number } | null>(null)

    useEffect(() => {
        let alive = true
        Promise.all([getAdminTileCounts(), runingState()])
            .then(([c, r]) => {
                if (!alive) return
                const t = c.data
                const total = (t.online ?? 0) + (t.offline ?? 0) + (t.warning ?? 0) + (t.error ?? 0) + (t.info ?? 0) + (t.idle ?? 0)
                const ok = (t.online ?? 0) + (t.idle ?? 0)
                const warn = (t.warning ?? 0) + (t.info ?? 0)
                const bad = (t.offline ?? 0) + (t.error ?? 0)
                const s = total > 0 ? Math.round((ok / total) * 100) : 0
                setScore(s)
                setBreakdown({
                    ok, warn, bad, total,
                    timeout: (r.data as any)?.TimeOutMonutDev ?? 0,
                })
            })
            .catch(() => { })
        return () => { alive = false }
    }, [refreshTick])

    if (score === null || !breakdown) return <Spin />

    const color = score >= 90 ? '#10b981' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444'
    const Icon = score >= 70 ? CheckCircleFilled : score >= 50 ? WarningFilled : CloseCircleFilled

    // circular progress
    const radius = 60
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - score / 100)

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartFilled style={{ color: '#ec4899' }} /> 健康度评分
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ position: 'relative', width: 144, height: 144, flexShrink: 0 }}>
                    <svg width="144" height="144" viewBox="0 0 144 144" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="72" cy="72" r={radius} fill="none" stroke="var(--ink-100)" strokeWidth="10" />
                        <circle
                            cx="72" cy="72" r={radius} fill="none"
                            stroke={color} strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: 'var(--font-sans)' }}>{score}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>/ 100</div>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Row color="#10b981" icon={<CheckCircleFilled />} label="正常" value={breakdown.ok} />
                    <Row color="#f59e0b" icon={<WarningFilled />} label="告警" value={breakdown.warn} />
                    <Row color="#ef4444" icon={<CloseCircleFilled />} label="故障" value={breakdown.bad} />
                    {breakdown.timeout > 0 && (
                        <Row color="#8b5cf6" icon="⏱" label="超时挂载" value={breakdown.timeout} />
                    )}
                </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon style={{ color }} /> 系统整体 {score >= 90 ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '需关注' : '高风险'}
            </div>
        </div>
    )
}

function Row({ color, icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color, fontSize: 12, display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-700)' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'var(--font-sans)' }}>{value}</span>
        </div>
    )
}

export default HealthScoreBento
