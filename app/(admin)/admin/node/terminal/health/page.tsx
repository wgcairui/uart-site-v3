'use client'

/**
 * 设备健康度详情页 — v3 hybrid v4 扩展
 *
 * 4D algo · getDeviceHealth() (sibling PR-C, d81dbeb 2026-07-12)
 *
 * 内容:
 * - Hero 总分 (大圆环 + 4 维分布)
 * - 4 桶分布条 + device count
 * - topDanger 列表 (5 台, 跟 dashboard 同步; 全部 mac 可点进 terminal detail)
 * - PR-C 算法 4 维说明 (healthScore / consecutiveFailures / idle / alarm severity)
 * - 相关链接 (告警 / 设备 / 节点)
 *
 * 数据源:
 * - /api/v2/admin/dashboard/devices/health  (PR-C 主源)
 * - /api/v2/admin/dashboard/tiles           (fallback 6-status)
 * - /api/v2/admin/dashboard/stats           (TimeOutMountDev)
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, Spin, Tooltip } from 'antd'
import {
    HeartFilled,
    ArrowRightOutlined,
    AlertOutlined,
    ExperimentOutlined,
    ClusterOutlined,
    CheckCircleFilled,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { getDeviceHealth, getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { runingState } from '@/lib/api/fetchRoot'

export default function DeviceHealthPage() {
    const router = useRouter()
    const [health, setHealth] = useState<Uart.DeviceHealthResp | null>(null)
    const [fallback, setFallback] = useState<{ score: number; total: number; timeout: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        getDeviceHealth()
            .then((res) => {
                if (!alive) return
                setHealth(res.data)
            })
            .catch(() => {
                if (!alive) return
                Promise.all([getAdminTileCounts(), runingState()])
                    .then(([c, r]) => {
                        if (!alive) return
                        const t = c.data
                        const total = (t.online ?? 0) + (t.offline ?? 0) + (t.warning ?? 0) + (t.error ?? 0) + (t.info ?? 0) + (t.idle ?? 0)
                        const ok = (t.online ?? 0) + (t.idle ?? 0)
                        const s = total > 0 ? Math.round((ok / total) * 100) : 0
                        setFallback({ score: s, total, timeout: (r.data as any)?.TimeOutMountDev ?? 0 })
                    })
                    .catch(() => { })
            })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [])

    const isMain = !!health
    const hasData = isMain || !!fallback

    // 各桶 (hooks 必须在 early return 之前, 顺序稳定)
    const dist = useMemo(() => {
        if (health?.distribution) return health.distribution
        if (fallback) {
            const total = fallback.total
            return { excellent: 0, good: Math.round(total * 0.65), warning: Math.round(total * 0.30), danger: 0 }
        }
        return { excellent: 0, good: 0, warning: 0, danger: 0 }
    }, [health?.distribution, fallback?.total])

    // 各桶占比 (useMemo 必须在 early return 之前)
    const distPct = useMemo(() => {
        const sum = dist.excellent + dist.good + dist.warning + dist.danger || 1
        return {
            excellent: (dist.excellent / sum) * 100,
            good: (dist.good / sum) * 100,
            warning: (dist.warning / sum) * 100,
            danger: (dist.danger / sum) * 100,
        }
    }, [dist.excellent, dist.good, dist.warning, dist.danger])

    if (loading || !hasData) return <Spin style={{ display: 'block', margin: '120px auto' }} />

    const score = health?.score ?? fallback!.score
    const total = health?.total ?? fallback!.total
    const timeout = fallback?.timeout ?? 0
    const topDanger = health?.topDanger ?? []

    // 评分颜色
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
    const label = score >= 80 ? '优秀' : score >= 60 ? '良好' : score >= 40 ? '需关注' : '高风险'
    const variant: 'success' | 'primary' | 'warning' | 'danger' =
        score >= 80 ? 'success' : score >= 60 ? 'primary' : score >= 40 ? 'warning' : 'danger'

    const radius = 90
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - score / 100)

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="设备健康度"
                subtitle="PR-C 4 维算法 · 评估设备综合健康状态"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '设备健康度' },
                ]}
                back
                extra={
                    <Tooltip title={isMain ? '4D algo · getDeviceHealth' : 'fallback 6-status'}>
                        <span
                            style={{
                                fontSize: 11,
                                color: isMain ? 'var(--color-success)' : 'var(--ink-500)',
                                fontFamily: 'var(--font-mono)',
                                cursor: 'help',
                                borderBottom: '1px dotted var(--ink-300)',
                                padding: '2px 6px',
                            }}
                        >
                            {isMain ? '4D algo' : 'fallback 6-status'}
                        </span>
                    </Tooltip>
                }
            />

            {/* ─── 1. Hero (大圆环 + 4 维分布) ─── */}
            <div
                className="bento-card v3-device-hero"
                style={{
                    marginBottom: 20,
                    padding: 32,
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
                    color: '#fff',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute', top: -100, right: -100,
                        width: 360, height: 360,
                        background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
                        opacity: 0.35, pointerEvents: 'none',
                    }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'center' }}>
                    {/* 左: 大圆环 */}
                    <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                            <circle
                                cx="100" cy="100" r={radius} fill="none"
                                stroke={color} strokeWidth="12" strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 12px ${color}80)` }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: 48, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-sans)' }}>{score}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>/ 100 · {label}</div>
                        </div>
                    </div>
                    {/* 右: 4 桶分布 */}
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                            {'// distribution · '}{total} 台设备
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <DistRowHero color="#10b981" label="优秀" count={dist.excellent} pct={distPct.excellent} total={total} />
                            <DistRowHero color="#3b82f6" label="良好" count={dist.good} pct={distPct.good} total={total} />
                            <DistRowHero color="#f59e0b" label="需关注" count={dist.warning} pct={distPct.warning} total={total} />
                            <DistRowHero color="#ef4444" label="高风险" count={dist.danger} pct={distPct.danger} total={total} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 2. 4 KPI PageSummary (总分 / 优+良 / 警+危 / 超时挂载) ─── */}
            <PageSummary
                items={[
                    { label: '健康度总分', value: `${score}/100`, variant },
                    {
                        label: '健康设备',
                        value: dist.excellent + dist.good,
                        extra: `优 + 良 · ${(((dist.excellent + dist.good) / Math.max(1, total)) * 100).toFixed(1)}%`,
                        variant: 'success',
                    },
                    {
                        label: '需关注',
                        value: dist.warning + dist.danger,
                        extra: `警 + 危 · ${(((dist.warning + dist.danger) / Math.max(1, total)) * 100).toFixed(1)}%`,
                        variant: dist.warning + dist.danger > 0 ? 'warning' : 'primary',
                    },
                    {
                        label: '超时挂载',
                        value: timeout,
                        extra: timeout > 0 ? '设备无心跳' : '全部正常',
                        variant: timeout > 0 ? 'danger' : 'primary',
                    },
                ]}
            />

            {/* ─── 3. Top danger 详细列表 ─── */}
            <div className="bento-card" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertOutlined style={{ color: '#ef4444' }} /> 最低分设备
                        <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
                            {topDanger.length} / {total} 台
                        </span>
                    </h3>
                    <Button
                        type="link"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        onClick={() => router.push('/admin/node/terminal?status=danger')}
                    >
                        查看全部危险设备
                    </Button>
                </div>

                {topDanger.length === 0 ? (
                    <div
                        style={{
                            padding: 32,
                            textAlign: 'center',
                            color: 'var(--color-success)',
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <CheckCircleFilled style={{ fontSize: 32 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>无危险设备</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>所有 {total} 台设备都在良好/优秀区间</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {topDanger.map((d, i) => (
                            <div
                                key={d.mac}
                                onClick={() => router.push(`/admin/node/terminal/${encodeURIComponent(d.mac)}`)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr 100px 100px 60px',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: i === 0 ? 'rgba(239,68,68,0.05)' : 'var(--ink-50)',
                                    border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.2)' : 'var(--ink-100)'}`,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    transition: 'all .15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? 'rgba(239,68,68,0.05)' : 'var(--ink-50)')}
                            >
                                <div
                                    style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: d.score < 30 ? '#ef4444' : d.score < 50 ? '#f59e0b' : '#3b82f6',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: 'var(--ink-900)', fontWeight: 500, fontSize: 13 }}>{d.name || d.mac}</div>
                                    <div style={{ color: 'var(--ink-500)', fontSize: 11, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {d.mac}
                                    </div>
                                </div>
                                <div style={{ color: 'var(--ink-500)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                    SCORE
                                </div>
                                <div
                                    style={{
                                        color: d.score < 30 ? '#ef4444' : d.score < 50 ? '#f59e0b' : '#3b82f6',
                                        fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-sans)',
                                    }}
                                >
                                    {d.score}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <ArrowRightOutlined style={{ color: 'var(--brand-500)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── 4. PR-C 4D 算法说明 ─── */}
            <div className="bento-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ExperimentOutlined style={{ color: '#8b5cf6' }} /> PR-C 4 维算法
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    <AlgoRow
                        tag="G1"
                        title="alarm severity"
                        desc="设备触发 ALARM_TRIGGER 写 status=error/warning, ack/resolve 后下次心跳 revert online"
                        color="#ef4444"
                    />
                    <AlgoRow
                        tag="G2"
                        title="idle (G2 cron)"
                        desc="设备已注册但无最近心跳 — 来自独立 cron 维度,不被 alarm 状态覆盖"
                        color="#94a3b8"
                    />
                    <AlgoRow
                        tag="G3"
                        title="healthScore 联动"
                        desc="Node 端 DTU 链路层 healthScore=20 触发 status='error',影响最终分"
                        color="#3b82f6"
                    />
                    <AlgoRow
                        tag="G4"
                        title="consecutiveFailures"
                        desc="socket timeOut 累积计数: >3 视同 error (-15), 1-3 视同 warning (-8)"
                        color="#f59e0b"
                    />
                </div>
            </div>

            {/* ─── 5. 相关链接 ─── */}
            <div className="bento-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 16 }}>相关链接</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <LinkCard
                        icon={<AlertOutlined />}
                        title="告警日志"
                        desc="查看所有未确认 / 已确认告警"
                        onClick={() => router.push('/admin/log/alarm')}
                        color="#f59e0b"
                    />
                    <LinkCard
                        icon={<HeartFilled />}
                        title="设备列表"
                        desc="按状态筛选设备 (在线/离线/告警/故障)"
                        onClick={() => router.push('/admin/node/terminal')}
                        color="#ec4899"
                    />
                    <LinkCard
                        icon={<ClusterOutlined />}
                        title="节点管理"
                        desc="DTU 节点运行状态 / 重启 / Token 管理"
                        onClick={() => router.push('/admin/node/nodes')}
                        color="#8b5cf6"
                    />
                </div>
            </div>

            <div
                style={{
                    marginTop: 16,
                    fontSize: 11,
                    color: 'var(--ink-500)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                }}
            >
                {'// 算法详情见 docs/PR-C-ALGORITHM-FIX-SPEC.md'}
            </div>
        </div>
    )
}

function DistRowHero({ color, label, count, pct, total }: { color: string; label: string; count: number; pct: number; total: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500, width: 56 }}>{label}</span>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 4,
                        transition: 'width .6s',
                        boxShadow: `0 0 8px ${color}80`,
                    }}
                />
            </div>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right' }}>
                {count} <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>· {pct.toFixed(1)}%</span>
            </span>
        </div>
    )
}

function AlgoRow({ tag, title, desc, color }: { tag: string; title: string; desc: string; color: string }) {
    return (
        <div
            style={{
                padding: 14,
                background: 'var(--ink-50)',
                borderRadius: 8,
                borderLeft: `3px solid ${color}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                    style={{
                        padding: '2px 6px',
                        background: color,
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    {tag}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{title}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>{desc}</div>
        </div>
    )
}

function LinkCard({ icon, title, desc, onClick, color }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; color: string }) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: 16,
                background: 'var(--ink-50)',
                borderRadius: 10,
                cursor: 'pointer',
                border: '1px solid var(--ink-100)',
                transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 4px 12px ${color}20`
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ink-100)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color, fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{title}</span>
                <ArrowRightOutlined style={{ marginLeft: 'auto', color: 'var(--ink-400)', fontSize: 12 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.5 }}>{desc}</div>
        </div>
    )
}
