'use client'

import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import {
    TeamOutlined,
    ApiOutlined,
    CrownOutlined,
    UserOutlined,
} from '@ant-design/icons'
import { runingState } from '@/lib/api/fetchRoot'
import { getUserStats } from '@/lib/api/endpoints/admin/dashboard'

interface UserHeroProps {
    /** 当前页用户总数 (server pagination.total) */
    total: number
}

/**
 * Admin · User list 顶部 hero 卡 (v3 hybrid v4 设计语言)
 *
 * 跟 admin dashboard KpiHero + terminal detail hero 视觉对齐:
 * - 紫色 aurora 渐变 (#1e1b4b → #312e81 → #6d28d9)
 * - 右上角 radial glow (accent-400 粉)
 * - 大数字 (text-[64px] font-semibold)
 * - 底部 4 个 sub-metric (在线 / 普通用户 / 管理员 / 其他)
 *
 * 数据源 (server 端 0 改动):
 * - /api/v2/admin/dashboard/stats  runingState → User.all / User.online
 * - /api/v2/admin/dashboard/users/stats  getUserStats → [{type, value}] (按 userGroup 聚合)
 */
export function UserHero({ total }: UserHeroProps) {
    const [serverTotal, setServerTotal] = useState<number>(0)
    const [online, setOnline] = useState<number>(0)
    const [groupStats, setGroupStats] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        Promise.all([runingState(), getUserStats()])
            .then(([s, g]) => {
                if (!alive) return
                setServerTotal(s?.data?.User?.all ?? 0)
                setOnline(s?.data?.User?.online ?? 0)
                // getUserStats 返回 [{type: 'user', value: 50}, {type: 'root', value: 2}]
                const map: Record<string, number> = {}
                const list = (g.data as any[]) || []
                list.forEach((it: any) => {
                    map[it.type] = (map[it.type] ?? 0) + (it.value ?? 0)
                })
                setGroupStats(map)
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [])

    // 优先用 server 全局统计 (更准), fallback 到当前页 pagination.total
    const displayTotal = serverTotal || total
    const userCount = groupStats['user'] ?? 0
    const rootCount = groupStats['root'] ?? 0
    const adminCount = groupStats['admin'] ?? 0
    // 其他 (wx 测试号 / pesiv 试用 / 内部账号等) 兜底计算
    const otherCount = Math.max(displayTotal - userCount - rootCount - adminCount, 0)

    if (loading) {
        return (
            <div
                className="bento-card"
                style={{
                    padding: 32,
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%)',
                    border: 'none',
                }}
            >
                <Spin />
            </div>
        )
    }

    return (
        <div
            className="bento-card v3-user-hero"
            style={{
                marginBottom: 20,
                padding: '28px 32px',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
                color: '#fff',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* 右上角 radial glow */}
            <div
                style={{
                    position: 'absolute', top: -80, right: -80,
                    width: 260, height: 260,
                    background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
                    opacity: 0.4, pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute', bottom: -60, left: '20%',
                    width: 200, height: 200,
                    background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
                    opacity: 0.3, pointerEvents: 'none',
                }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* 上 label */}
                <div
                    style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {'// 用户总数 · USERS'}
                </div>

                {/* 大数字 */}
                <div
                    style={{
                        fontSize: 64,
                        fontWeight: 600,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        marginTop: 12,
                        fontFamily: 'var(--font-sans)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        flexWrap: 'wrap',
                    }}
                >
                    {displayTotal}
                    {online > 0 && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#86efac',
                                background: 'rgba(134, 239, 172, 0.15)',
                                padding: '6px 12px',
                                borderRadius: 8,
                                verticalAlign: 'middle',
                            }}
                        >
                            <span
                                style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: '#86efac',
                                    animation: 'pulse-dot 2s infinite',
                                }}
                            />
                            {online} 在线
                        </span>
                    )}
                </div>

                {/* 4 sub-metric */}
                <div
                    style={{
                        marginTop: 28,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        paddingTop: 24,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    className="user-hero-metrics"
                >
                    <SubMetric
                        icon={<TeamOutlined />}
                        label="普通用户"
                        value={userCount}
                        color="#86efac"
                    />
                    <SubMetric
                        icon={<CrownOutlined />}
                        label="管理员"
                        value={rootCount + adminCount}
                        color="#fde68a"
                    />
                    <SubMetric
                        icon={<ApiOutlined />}
                        label="在线"
                        value={online}
                        color="#67e8f9"
                    />
                    <SubMetric
                        icon={<UserOutlined />}
                        label="其他账号"
                        value={otherCount}
                        color="rgba(255,255,255,0.7)"
                    />
                </div>
            </div>
        </div>
    )
}

function SubMetric({
    icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div
            style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'var(--font-mono)',
                minWidth: 0,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color, display: 'inline-flex' }}>{icon}</span>
                {label}
            </div>
            <strong
                style={{
                    display: 'block',
                    fontSize: 20,
                    color: '#fff',
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </strong>
        </div>
    )
}

export default UserHero
