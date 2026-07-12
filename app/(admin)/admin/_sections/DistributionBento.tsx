'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getProtocolStats, getDevModelStats, getUserStats } from '@/lib/api/endpoints/admin/dashboard'

/**
 * 分布图 bento (v3 hybrid v4 扩展 · 决策 C)
 *
 * 4 联用: 协议 / 设备类型 / 用户类型 3 种分布共用一个 Bento 卡片, 紧凑布局
 * - 上方 3 个 tab 切换
 * - 下方水平 bar 列表 (label + 计数 + 进度条)
 *
 * 数据源:
 * - /api/v2/admin/dashboard/protocols/stats
 * - /api/v2/admin/dashboard/dev-models/stats
 * - /api/v2/admin/dashboard/users/stats
 */

type Tab = 'protocol' | 'devType' | 'userType'
const TAB_LABELS: Record<Tab, string> = { protocol: '协议', devType: '设备类型', userType: '用户类型' }
const TAB_ICONS: Record<Tab, string> = { protocol: '🔌', devType: '📦', userType: '👥' }
const TAB_COLORS: Record<Tab, string[]> = {
    protocol: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9'],
    devType: ['#f472b6', '#ec4899', '#db2777', '#f9a8d4', '#fb7185'],
    userType: ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8'],
}

export function DistributionBento({ refreshTick }: { refreshTick: number }) {
    const [tab, setTab] = useState<Tab>('protocol')
    const [data, setData] = useState<Record<Tab, Array<{ type: string; value: number }>>>({
        protocol: [], devType: [], userType: [],
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        Promise.all([getProtocolStats(), getDevModelStats(), getUserStats()])
            .then(([p, d, u]) => {
                if (!alive) return
                setData({
                    protocol: ((p.data as any) || []).sort((a: any, b: any) => b.value - a.value).slice(0, 6),
                    devType: ((d.data as any) || []).sort((a: any, b: any) => b.value - a.value).slice(0, 6),
                    userType: ((u.data as any) || []).sort((a: any, b: any) => b.value - a.value).slice(0, 6),
                })
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [refreshTick])

    if (loading) return <Spin />

    const list = data[tab]
    const total = list.reduce((s, x) => s + x.value, 0) || 1
    const colors = TAB_COLORS[tab]

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>分类分布</h3>
                <div style={{ display: 'flex', gap: 4, background: 'var(--ink-50)', borderRadius: 10, padding: 3 }}>
                    {(['protocol', 'devType', 'userType'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 500,
                                border: 'none',
                                borderRadius: 7,
                                cursor: 'pointer',
                                background: tab === t ? '#fff' : 'transparent',
                                color: tab === t ? 'var(--brand-600)' : 'var(--ink-500)',
                                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all .2s',
                            }}
                        >
                            {TAB_ICONS[t]} {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {list.length === 0 ? (
                    <div style={{ color: 'var(--ink-500)', fontSize: 12, textAlign: 'center', padding: 24 }}>暂无数据</div>
                ) : list.map((item, i) => {
                    const pct = Math.round((item.value / total) * 100)
                    return (
                        <div key={item.type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--ink-700)', fontWeight: 500 }}>{item.type}</span>
                                <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                                    {item.value} <span style={{ color: 'var(--ink-300)' }}>· {pct}%</span>
                                </span>
                            </div>
                            <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${pct}%`, height: '100%',
                                    background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
                                    borderRadius: 3,
                                    transition: 'width .4s ease',
                                }} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default DistributionBento
