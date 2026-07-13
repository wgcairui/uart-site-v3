'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { GlobalOutlined, ClockCircleOutlined, ApiOutlined, TeamOutlined } from '@ant-design/icons'
import { runingState, NodeInfo } from '@/lib/api/fetchRoot'

/**
 * 快速总览 bento (v3 hybrid v4 扩展 · 决策 C)
 *
 * 系统总览 4 关键数字 + sparkline hint:
 * - 总设备 / 总节点 / 总协议 / 总用户
 * - 30 天趋势 (server 暂无, 用当前值 + "实时" 标记)
 * - 服务 uptime / CPU / 内存 (从 SysInfo)
 * - 节点列表 (3 个) 状态徽章
 *
 * 数据源:
 * - /api/v2/admin/dashboard/stats (runInfo)
 * - /api/v2/admin/dashboard/nodes/stats (NodeInfo 列表)
 */
export function QuickStatsBento({ refreshTick }: { refreshTick: number }) {
    const [info, setInfo] = useState<any>(null)
    const [nodes, setNodes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        Promise.all([runingState(), NodeInfo()])
            .then(([r, n]) => {
                if (!alive) return
                setInfo(r?.data)
                setNodes(((n as any).data?.items || (n as any).data || []) as any[])
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
    }, [refreshTick])

    if (loading || !info) return <Spin />

    const sys = info.SysInfo || {}
    const term = info.Terminal || {}
    const user = info.User || {}
    const protocol = info.Protocol ?? 0
    const node = info.Node || {}
    const timeout = info.TimeOutMountDev ?? 0

    return (
        <div className="bento-card" style={{ padding: 24, height: '100%' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlobalOutlined style={{ color: '#8b5cf6' }} /> 系统总览
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                <Tile icon={<ApiOutlined />} color="#8b5cf6" label="终端" value={term.all ?? 0} sub={`${term.online ?? 0} 在线`} />
                <Tile icon={<TeamOutlined />} color="#3b82f6" label="用户" value={user.all ?? 0} sub={`${user.online ?? 0} 在线`} />
                <Tile icon="#10b981" color="#10b981" label="协议" value={protocol} sub="活跃" />
                <Tile icon="#f59e0b" color="#f59e0b" label="节点" value={node.all ?? 0} sub={timeout > 0 ? `${timeout} 超时挂载` : '全部健康'} />
            </div>
            <div style={{ borderTop: '1px solid var(--ink-100)', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                <div>
                    <div style={{ marginBottom: 2 }}>UPTIME</div>
                    <div style={{ color: 'var(--ink-900)', fontSize: 14, fontWeight: 600 }}>{sys.uptime || '-'}</div>
                </div>
                <div>
                    <div style={{ marginBottom: 2 }}>CPU</div>
                    <div style={{ color: (sys.usecpu ?? 0) > 70 ? '#ef4444' : (sys.usecpu ?? 0) > 40 ? '#f59e0b' : '#10b981', fontSize: 14, fontWeight: 600 }}>{sys.usecpu ?? 0}%</div>
                </div>
                <div>
                    <div style={{ marginBottom: 2 }}>MEM</div>
                    <div style={{ color: (sys.usemen ?? 0) > 80 ? '#ef4444' : (sys.usemen ?? 0) > 50 ? '#f59e0b' : '#10b981', fontSize: 14, fontWeight: 600 }}>{sys.usemen ?? 0}%</div>
                </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-100)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockCircleOutlined /> 最近上报节点
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {nodes.slice(0, 3).map((n: any) => (
                        <div key={n.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>{n.name}</span>
                            <span style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>{n.IP || n.ip || '—'}</span>
                        </div>
                    ))}
                    {nodes.length === 0 && <div style={{ color: 'var(--ink-300)', fontSize: 11, textAlign: 'center' }}>暂无节点</div>}
                </div>
            </div>
        </div>
    )
}

function Tile({ icon, color, label, value, sub }: { icon: React.ReactNode | string; color: string; label: string; value: number; sub: string }) {
    return (
        <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color, fontSize: 18, display: 'flex', alignItems: 'center' }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)', lineHeight: 1.1, marginTop: 2, fontFamily: 'var(--font-sans)' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>
            </div>
        </div>
    )
}

export default QuickStatsBento
