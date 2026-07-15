'use client'
import { useEffect, useMemo, useState } from 'react'
import { Spin, Button, Tooltip, Row, Col } from 'antd'
import { ReloadOutlined, ApiOutlined, AlertOutlined, ClusterOutlined, ExperimentOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { runingState } from '@/lib/api/fetchRoot'
import { getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { LiveControls } from '@/components/common/LiveControls'
import { TrendChartBento } from './_sections/TrendChartBento'
import { NodeStatusBento } from './_sections/NodeStatusBento'
import { DevicesBento } from './_sections/DevicesBento'
import { ServerStatusTable } from './_sections/ServerStatusTable'
import { HealthScoreBento } from './_sections/HealthScoreBento'
import { DistributionBento } from './_sections/DistributionBento'
import { AlarmTrendBento } from './_sections/AlarmTrendBento'
import { QuickStatsBento } from './_sections/QuickStatsBento'
import { TrafficSparkBento } from './_sections/TrafficSparkBento'

/**
 * admin 首页 — 系统仪表盘 (v3 hybrid v4 大重构 · 决策 C, 2026-07-12)
 *
 * 响应式布局: 12-col design × 2 (antd 24-col grid)
 * ─────────────────────────────────────────────────────────────────
 * Row 1  │ KPI Hero (10)  │ KPI 1 在线 (6)  │ KPI 2 离线 (4)  │ KPI 3 告警 (4) │  10+6+4+4 = 24
 * Row 2  │ LiveControls 6 variant (16)              │ 节点状态分布 (8)         │  16+8 = 24
 * Row 3  │ 7-day 趋势图 (16)                        │ 健康度评分 (8)           │  16+8 = 24
 * Row 4  │ 设备类型 / 协议 / 用户 分布 tab (16)      │ 系统总览 (8)             │  16+8 = 24
 * Row 5  │ 主服务运行状态 (24 全宽)                                          │  24
 * Row 6  │ 24h 告警趋势 (12)                        │ 设备快速列表 (12)        │  12+12 = 24
 * ─────────────────────────────────────────────────────────────────
 * 移动端 (<768px) 全部 xs=24 → 单列竖排
 * 桌面端 (≥768px)  antd Col md=N (N×2 凑 24)
 *
 * 数据源 (server 端 0 改动, 全部复用现有 endpoint):
 * - /api/v2/admin/dashboard/tiles  6 status enum
 * - /api/v2/admin/dashboard/tiles/:name/history  24h trend
 * - /api/v2/admin/dashboard/stats  runingState (User/Node/Protocol/Terminal)
 * - /api/v2/admin/dashboard/nodes/stats  NodeInfo 列表
 * - /api/v2/admin/dashboard/protocols/stats / dev-models/stats / users/stats
 * - /api/v2/admin/terminal/list  设备列表
 *
 * 视觉: bg-bento-canvas (紫粉极光晕染) + 玻璃 BentoCard + 12 列 grid
 * 30s 刷新一次 (setInterval)
 */
export default function AdminDashboardPage() {
    const [refreshTick, setRefreshTick] = useState(0)
    const [serverInfo, setServerInfo] = useState<any>(null)
    const [counts, setCounts] = useState<Uart.AdminStatusCounts | null>(null)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

    useEffect(() => {
        const t = setInterval(() => {
            setRefreshTick((v) => v + 1)
            setLastRefresh(new Date())
        }, 30000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        let alive = true
        Promise.all([runingState(), getAdminTileCounts()])
            .then(([s, c]) => {
                if (!alive) return
                setServerInfo(s?.data)
                setCounts(c.data)
                setLastRefresh(new Date())
            })
            .catch(() => { })
        return () => { alive = false }
    }, [refreshTick])

    const hero = useMemo(() => {
        const total = (counts?.online ?? 0) + (counts?.offline ?? 0) + (counts?.warning ?? 0) + (counts?.error ?? 0) + (counts?.info ?? 0) + (counts?.idle ?? 0)
        return {
            total,
            // 修 A2/A3/A4: 用 serverInfo 实际字段, 不是 SysInfo.userCount (不存在)
            nodes: serverInfo?.Node?.all ?? 0,
            protocols: serverInfo?.Protocol ?? 0,
            users: serverInfo?.User?.all ?? 0,
        }
    }, [counts, serverInfo])

    if (!counts) return <Spin style={{ display: 'block', margin: '120px auto' }} />

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="系统仪表盘"
                subtitle="实时查看设备、用户、告警、协议运行状况"
                extra={
                    <Tooltip title="手动刷新">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => setRefreshTick((v) => v + 1)}
                            shape="circle"
                        />
                    </Tooltip>
                }
            />

            <Row gutter={[20, 20]}>
                {/* ───────── Row 1: KPI Hero + 3 KPI (12-col design × 2 for antd 24-col) ───────── */}
                <Col xs={24} md={10}>
                    <div
                        className="bento-card kpi-hero"
                        style={{
                            padding: 32,
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%)',
                            color: '#fff',
                            border: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                            minHeight: 200,
                        }}
                    >
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)', opacity: 0.5, pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            // 设备总数 · TOTAL
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 16, fontFamily: 'var(--font-sans)', color: '#fff' }}>
                            {hero.total}
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, marginTop: 16, color: '#86efac', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(134, 239, 172, 0.15)', padding: '6px 12px', borderRadius: 8, fontWeight: 500 }}>
                            ↑ 实时统计
                        </div>
                        <div style={{ position: 'relative', zIndex: 1, marginTop: 32, display: 'flex', gap: 24, paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.1)', flexWrap: 'wrap' }}>
                            <HeroItem label="DTU 节点" value={hero.nodes} />
                            <HeroItem label="协议数" value={hero.protocols} />
                            <HeroItem label="用户数" value={hero.users} />
                        </div>
                    </div>
                </Col>

                <Col xs={24} md={6}>
                    <KpiCard icon={<ApiOutlined />} label="在线" value={counts.online} trend={`${hero.total > 0 ? Math.round((counts.online / hero.total) * 100) : 0}% 在线率`} trendColor="var(--color-success)" />
                </Col>
                <Col xs={24} md={4}>
                    <KpiCard icon={null} label="离线" value={counts.offline} trend={`${hero.total > 0 ? Math.round((counts.offline / hero.total) * 100) : 0}%`} trendColor="var(--color-danger)" />
                </Col>
                <Col xs={24} md={4}>
                    <KpiCard icon={<AlertOutlined />} label="告警" value={(counts.warning ?? 0) + (counts.error ?? 0)} trend={`${counts.warning ?? 0} 告警 · ${counts.error ?? 0} 故障 · 24h trend`} trendColor="var(--color-warning)" />
                </Col>

                {/* ───────── Row 2: LiveControls + 节点状态 (8/4 in 12-col design × 2 = 16/8 in 24-col) ───────── */}
                <Col xs={24} md={16}>
                    <LiveControls variant="admin" title="实时状态 · 6 variant" />
                </Col>
                <Col xs={24} md={8}>
                    <div className="bento-card status-bento" style={{ padding: 24 }}>
                        <NodeStatusBento refreshTick={refreshTick} />
                    </div>
                </Col>

                {/* ───────── Row 3: 7-day 趋势 + 健康度评分 (8/4 × 2 = 16/8) ───────── */}
                <Col xs={24} md={16}>
                    <div className="bento-card chart-bento" style={{ padding: 24 }}>
                        <TrendChartBento refreshTick={refreshTick} />
                    </div>
                </Col>
                <Col xs={24} md={8}>
                    <HealthScoreBento refreshTick={refreshTick} />
                </Col>

                {/* ───────── Row 3.5: 实时流量 sparkline (PR-A, 全宽) ───────── */}
                <Col xs={24} md={24}>
                    <TrafficSparkBento refreshTick={refreshTick} />
                </Col>

                {/* ───────── Row 4: 分类分布 + 系统总览 (8/4 × 2 = 16/8) ───────── */}
                <Col xs={24} md={16}>
                    <DistributionBento refreshTick={refreshTick} />
                </Col>
                <Col xs={24} md={8}>
                    <QuickStatsBento refreshTick={refreshTick} />
                </Col>

                {/* ───────── Row 5: 主服务运行状态 (全宽) ───────── */}
                <Col xs={24} md={24}>
                    <div className="bento-card" style={{ padding: 24 }}>
                        <ServerStatusTable refreshTick={refreshTick} />
                    </div>
                </Col>

                {/* ───────── Row 6: 24h 告警趋势 + 设备快速列表 (6/6 × 2 = 12/12) ───────── */}
                <Col xs={24} md={12}>
                    <AlarmTrendBento refreshTick={refreshTick} />
                </Col>
                <Col xs={24} md={12}>
                    <div className="bento-card devices-bento" style={{ padding: 0, overflow: 'hidden' }}>
                        <DevicesBento />
                    </div>
                </Col>
            </Row>

            {/* 底部: 刷新状态 */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                <span>// v3 hybrid v4 · 12 section Bento · 30s refresh</span>
                <span>last refresh: {lastRefresh.toLocaleTimeString('zh-CN', { hour12: false })}</span>
            </div>
        </div>
    )
}

function HeroItem({ label, value }: { label: string; value: number | string }) {
    return (
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-mono)' }}>
            {label}<strong style={{ display: 'block', fontSize: 18, color: '#fff', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-sans)' }}>{value}</strong>
        </div>
    )
}

function KpiCard({ icon, label, value, trend, trendColor }: { icon: React.ReactNode; label: string; value: number; trend: string; trendColor: string }) {
    return (
        <div className="bento-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 180 }}>
            <div style={{ color: 'var(--brand-500)', fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon} // {label}
            </div>
            <div style={{ color: 'var(--ink-900)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 8 }}>
                {value}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, fontWeight: 500, color: trendColor }}>
                {trend}
            </div>
        </div>
    )
}
