'use client'
import { Button, Col, Progress, Row, Spin, Tabs, Modal, Divider, Form, Input, Tag, message } from "antd";
import React, { useState, useMemo } from "react";
import {
    ApiOutlined, NodeIndexOutlined, AppstoreOutlined, DeploymentUnitOutlined,
    ShareAltOutlined, PieChartOutlined, ClockCircleOutlined,
    CalculatorOutlined, DatabaseOutlined, StopOutlined, EnvironmentOutlined,
    ThunderboltOutlined, FieldTimeOutlined, DisconnectOutlined,
} from '@ant-design/icons'
import { TerminalsTable } from "@/components/terminal/TerminalsTable";
import { getTerminalStats, addRegisterTerminal, getTerminalDetailedStats } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { useDashboardStat } from "@/lib/hooks/useDashboardStat";
import { getDataFreshness } from "@/lib/api/admin-summary/client";
import { ModalConfirm } from "@/lib/utils/util";
import { NodesSelects } from "@/components/node/NodesSelects";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";
import { StatCardsRow } from "@/components/common/StatCardsRow";
import { StatCard } from "@/components/admin/StatCard";
import { StatSection } from "@/components/common/StatSection";
import { AnomalousDevicesCard } from "@/components/terminal/AnomalousDevicesCard";

const TerminalAddDTU: React.FC = () => {
    const [mac, setMac] = useState<string>("");
    const [node, setNode] = useState("");

    const macs = useMemo(() => {
        return mac.split(",");
    }, [mac]);

    const addRegisterTerminals = async () => {
        if (!node) {
            message.error(`请选择 node!!`);
            return;
        }
        for (const mac of macs) {
            if (mac.length !== 12) {
                const ok = await ModalConfirm(`[${mac}]长度为${mac.length},标准长度为12位,确认提交??`);
                if (!ok) continue;
            }
            await addRegisterTerminal(mac, node);
            message.success(`添加设备${mac}成功`);
        }
    };

    return (
        <>
            <Divider>批量添加设备</Divider>
            <Form>
                <Form.Item label="设备ID">
                    <Input placeholder="多个设备以(,)逗号分隔" onChange={(e) => setMac(e.target.value)}></Input>
                </Form.Item>
                <Form.Item label={"已选择ID / " + macs.length}>
                    {macs.map((el) => (
                        <Tag key={el}>{el}</Tag>
                    ))}
                </Form.Item>
                <Form.Item label="注册节点">
                    <NodesSelects onChange={(val) => setNode(val as string)} />
                </Form.Item>
                <Form.Item>
                    <Button onClick={() => addRegisterTerminals()}>提交</Button>
                </Form.Item>
            </Form>
        </>
    );
};

/**
 * 显示所有设备
 */
export default function Terminals() {
    const [registerModalOpen, setRegisterModalOpen] = useState(false)
    const [terminals, setterminals] = useState<Uart.Terminal[]>([])
    // W6 · stat card 联动 filter (在线/离线/停用 三档多选叠加)
    // 多选叠加语义: 点 'online' 只看在线, 'offline' 只看离线, 'disable' 只看停用.
    // 不同 key 间不互斥 (理论上不会同时点 online + offline, 但允许).
    // 通过 extraQuery.filters 桥接到 TerminalsTable 内部 pageReq.filters
    const [statFilter, setStatFilter] = useState<string[]>([])
    const toggleStatFilter = (key: string) => {
        setStatFilter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
    }

    /**
     * 终端统计双源: getTerminalStats (4 个 distribution) + getTerminalDetailedStats (9 维 scalar + 1 分布)
     * 合并到 serverStats 一份 state, 下面 PageSummary / 2nd row / stats tab / TerminalsTable 共享
     * - nodes 跟 pids 喂给 TerminalsTable 列头 funnel 多选
     * - onlines/nodes/pids/devs 喂给 stats tab 4 个 distribution section
     */
    const { data: serverStats, loading: statsLoading } = usePromise(async () => {
        const [{ data: stats }, { data: det }] = await Promise.all([
            getTerminalStats(),
            getTerminalDetailedStats()
        ])
        const s = stats as {
            onlines: { type: string; value: number }[],
            nodes: { type: string; value: number }[],
            pids: { type: string; value: number }[],
            devs: { type: string; value: number }[],
        } | undefined
        const d = det as Partial<Uart.TerminalDetailedStatsResp> | undefined

        // distribution 按 value desc
        s?.onlines?.sort((a, b) => b.value - a.value)
        s?.nodes?.sort((a, b) => b.value - a.value)
        s?.pids?.sort((a, b) => b.value - a.value)
        s?.devs?.sort((a, b) => b.value - a.value)

        return {
            // distribution (4 块)
            onlines: s?.onlines ?? [],
            nodes: s?.nodes ?? [],
            pids: s?.pids ?? [],
            devs: s?.devs ?? [],
            // detailed scalar (5 块)
            total: d?.total ?? 0,
            online: d?.online ?? 0,
            offline: d?.offline ?? 0,
            onlineRate: d?.onlineRate ?? 0,
            shared: d?.shared ?? 0,
            // === server PR #108 (2026-07-23 ship) 加 3 字段 ===
            disable: d?.disable ?? 0,
            atEnabled: d?.atEnabled ?? 0,
            withJw: d?.withJw ?? 0,
            timeoutMountDev: d?.timeoutMountDev ?? 0,
            avgMountDevs: d?.avgMountDevs ?? 0,
            totalMountDevs: d?.totalMountDevs ?? 0,
            pidDistribution: d?.pidDistribution ?? [],
        }
    }, {
        onlines: [], nodes: [], pids: [], devs: [],
        total: 0, online: 0, offline: 0, onlineRate: 0, shared: 0,
        disable: 0, atEnabled: 0, withJw: 0,
        timeoutMountDev: 0, avgMountDevs: 0, totalMountDevs: 0,
        pidDistribution: [],
    })

    // 喂给 TerminalsTable 列头 funnel 多选 (server-side filter, server 走 $or regex 子串匹配
    // 但 stats 喂的是真实 unique 值, select 选出来必精确)
    // 节点列: getTerminalStats().nodes (terminal.mountNode 唯一值)
    // 型号列: getTerminalDetailedStats().pidDistribution (terminal.PID 唯一值, top 10 排序)
    // ⚠️ 不能用 getTerminalStats().pids — 那是 mount device pid ($unwind mountDevs + group pid),
    //   跟 terminal.PID (DTU 型号, e.g. "M100") 完全错位
    const statsNodes = useMemo(() => serverStats.nodes.map(n => n.type).filter(Boolean), [serverStats.nodes])
    const statsPids = useMemo(
        () => serverStats.pidDistribution.map(p => p.label).filter(Boolean),
        [serverStats.pidDistribution]
    )
    // 2nd row 副指标: 节点数 (从 distribution 长度拿) + 总挂载 + 平均挂载 + 超时挂载
    const distinctNodeCount = statsNodes.length
    const distinctPidCount = statsPids.length

    // W6 · BFF dashboard/data/freshness — 4 档分桶 (fresh<5min / stale<30min / dead<60min / never)
    // 供 StatCard drilldown 展示
    // W3 useDashboardStat 类型签名跟 BFF 实际响应套壳不匹配, 用 as any 兼容 (待 W8 修)
    const { data: freshness } = useDashboardStat(
        () => getDataFreshness() as any,
        [],
        { fresh: 0, stale: 0, dead: 0, never: 0, total: 0 },
    )

    // W6 · statFilter → TerminalsTable server-side filter 桥
    // online/offline 走 boolean 字符串, disable 也走 boolean (server disable 字段)
    const extraQueryFilters = useMemo<Record<string, string[]>>(() => {
        const f: Record<string, string[]> = {}
        if (statFilter.includes('online')) f.online = ['true']
        if (statFilter.includes('offline')) f.online = ['false']
        if (statFilter.includes('disable')) f.disable = ['true']
        return f
    }, [statFilter])

    const items = [
        {
            key: 'list',
            label: '终端列表',
            children: (
                <TerminalsTable
                    readyData={setterminals}
                    statsNodes={statsNodes}
                    statsPids={statsPids}
                    extraQuery={statFilter.length > 0 ? { filters: extraQueryFilters } : {}}
                    extraActions={
                        <Button type="primary" size="small" onClick={() => setRegisterModalOpen(true)} className="btn-brand">
                            批量注册设备
                        </Button>
                    }
                />
            )
        },
        {
            key: 'stats',
            label: '终端统计',
            children: statsLoading ? (
                <div className="bento-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Spin />
                </div>
            ) : serverStats.total > 0 ? (
                <Row gutter={[20, 20]}>
                    <Col xs={24} md={12} key="onlines">
                        <StatSection title="在线分布" icon={<ApiOutlined />} data={serverStats.onlines} color="#10b981" />
                    </Col>
                    <Col xs={24} md={12} key="nodes">
                        <StatSection title="节点分布" icon={<NodeIndexOutlined />} data={serverStats.nodes} color="#6366f1" />
                    </Col>
                    <Col xs={24} md={12} key="pids">
                        <StatSection title="PID 分布" icon={<AppstoreOutlined />} data={serverStats.pids} color="#a855f7" />
                    </Col>
                    <Col xs={24} md={12} key="devs">
                        <StatSection title="设备分布" icon={<DeploymentUnitOutlined />} data={serverStats.devs} color="#f59e0b" />
                    </Col>
                </Row>
            ) : (
                <div className="bento-card" style={{ textAlign: 'center', padding: 60, color: 'var(--ink-500)' }}>
                    暂无统计数据
                </div>
            )
        }
    ];

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="终端管理"
                subtitle="管理所有 DTU 设备、节点、协议、注册"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '终端' },
                ]}
            />
            {/* W6 · StatCard 7 张 (主行 6 张 + 数据新鲜度 1 张) — filter + drilldown variant
                - 设备总数 (filter, primary)    — active=未过滤, 点击清空 statFilter
                - 在线 (filter, success)        — toggle 'online', 联动 server online=true
                - 离线 (filter, warning)        — toggle 'offline', 联动 server online=false
                - 共享数 (filter/info, passive)  — ops 关注度低, 不联动, 仅展示
                - 在继率 (filter, info)         — passive 展示
                - 停用 (filter, warning)        — toggle 'disable', 联动 server disable=true
                - 数据新鲜度 (drilldown, info)   — hover 4 档分布 sparkline
                PageSummary 6 张在下面作为静态镜像 (visual diff A/B 用, 后可弃). */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <StatCard
                    kind="filter"
                    label="设备总数"
                    value={serverStats.total}
                    variant="primary"
                    icon={<ApiOutlined />}
                    active={statFilter.length === 0}
                    onToggle={() => setStatFilter([])}
                />
                <StatCard
                    kind="filter"
                    label="在线"
                    value={serverStats.online}
                    variant="success"
                    icon={<ApiOutlined />}
                    extra={serverStats.total > 0 ? `${serverStats.online} / ${serverStats.total}` : '—'}
                    active={statFilter.includes('online')}
                    onToggle={() => toggleStatFilter('online')}
                />
                <StatCard
                    kind="filter"
                    label="离线"
                    value={serverStats.offline}
                    variant="warning"
                    icon={<DisconnectOutlined />}
                    extra={serverStats.total > 0 ? `${Math.round((serverStats.offline / serverStats.total) * 100)}% 离线率` : '—'}
                    active={statFilter.includes('offline')}
                    onToggle={() => toggleStatFilter('offline')}
                />
                <StatCard
                    kind="filter"
                    label="共享数"
                    value={serverStats.shared}
                    variant="info"
                    icon={<ShareAltOutlined />}
                    extra={serverStats.total > 0 ? `${Math.round((serverStats.shared / serverStats.total) * 100)}% 共享率` : '—'}
                    active={false}
                    onToggle={() => {/* 共享数 passive, 不联动 filter */}}
                />
                <StatCard
                    kind="filter"
                    label="在线率"
                    value={`${serverStats.onlineRate}%`}
                    variant="info"
                    icon={<PieChartOutlined />}
                    extra={serverStats.total > 0 ? `${serverStats.online} / ${serverStats.total}` : undefined}
                    active={false}
                    onToggle={() => {/* 在线率是公式指标, 不联动 filter */}}
                />
                <StatCard
                    kind="filter"
                    label="停用"
                    value={serverStats.disable}
                    variant="warning"
                    icon={<StopOutlined />}
                    extra={serverStats.total > 0 ? `${Math.round((serverStats.disable / serverStats.total) * 100)}% 停用率` : undefined}
                    active={statFilter.includes('disable')}
                    onToggle={() => toggleStatFilter('disable')}
                />
                <StatCard
                    kind="drilldown"
                    label="数据新鲜度"
                    value={freshness.fresh}
                    variant="success"
                    icon={<FieldTimeOutlined />}
                    data={freshness}
                    trigger="hover"
                    popoverContent={({ data: fr }) => (
                        <div style={{ minWidth: 260 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                                4 档分桶 (BFF /data/freshness) · 总设备 {(fr as any)?.total ?? 0}
                            </div>
                            {/* antd Progress 4 段离散显示 — 替代 MiniSparkline (4 scalar 喂 sparkline 错误) */}
                            <Progress
                                percent={100}
                                steps={4}
                                strokeColor={['#10b981', '#f59e0b', '#ef4444', '#7c8aa0']}
                                showInfo={false}
                                size="small"
                            />
                            {[
                                { k: 'fresh', label: '新鲜 (<5min)', color: '#10b981' },
                                { k: 'stale', label: '陈旧 (5-30min)', color: '#f59e0b' },
                                { k: 'dead', label: '失活 (30-60min)', color: '#ef4444' },
                                { k: 'never', label: '从未上报', color: '#7c8aa0' },
                            ].map(b => {
                                const v = (fr as any)?.[b.k] ?? 0
                                return (
                                    <div key={b.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
                                        <span style={{ color: b.color }}>● {b.label}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                />
            </div>
            {/* 2nd row 副卡 6 张: 节点数/总挂载/平均挂载/超时挂载/AT 启用/经纬度
                模板抽到 components/common/StatCardsRow.tsx (2026-07-23), 跟 user/page.tsx:308-340 共用
                AT 启用 + 经纬度 2 张是 server PR #108 (2026-07-23) 新加, 跟 1 张 PageSummary 新"停用"卡一起组成运维 3 件套 */}
            <StatCardsRow
                total={serverStats.total}
                style={{ marginBottom: 20 }}
                items={[
                    {
                        label: '节点数',
                        value: distinctNodeCount,
                        color: '#6366f1',
                        icon: <NodeIndexOutlined />,
                        extra: `${distinctPidCount} 种型号`,
                    },
                    {
                        label: '总挂载',
                        value: serverStats.totalMountDevs,
                        color: '#8b5cf6',
                        icon: <DatabaseOutlined />,
                        extra: serverStats.total > 0 ? `每台 ${serverStats.avgMountDevs} 个` : undefined,
                    },
                    {
                        label: '平均挂载',
                        value: serverStats.avgMountDevs,
                        color: '#06b6d4',
                        icon: <CalculatorOutlined />,
                        extra: serverStats.total > 0 ? `${serverStats.totalMountDevs} 总数` : undefined,
                    },
                    {
                        label: '超时挂载',
                        value: serverStats.timeoutMountDev,
                        color: '#f59e0b',
                        icon: <ClockCircleOutlined />,
                        extra: serverStats.totalMountDevs > 0
                            ? `${Math.round((serverStats.timeoutMountDev / serverStats.totalMountDevs) * 100)}% 超时率`
                            : undefined,
                    },
                    {
                        label: 'AT 启用',
                        value: serverStats.atEnabled,
                        color: '#ec4899',
                        icon: <ApiOutlined />,
                        extra: serverStats.total > 0 ? `${Math.round((serverStats.atEnabled / serverStats.total) * 100)}% 启用率` : undefined,
                    },
                    {
                        label: '经纬度',
                        value: serverStats.withJw,
                        color: '#10b981',
                        icon: <EnvironmentOutlined />,
                        extra: serverStats.total > 0 ? `${Math.round((serverStats.withJw / serverStats.total) * 100)}% 已配率` : undefined,
                    },
                ]}
            />
            {/* 问题设备卡片 — 2026-07-23 ship, 数据源 server GET /api/v2/admin/terminals/anomalies */}
            <AnomalousDevicesCard />
            <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
                <Tabs items={items} destroyOnHidden />
            </div>
            <Modal
                title="批量注册设备"
                open={registerModalOpen}
                onCancel={() => setRegisterModalOpen(false)}
                footer={null}
                width={600}
            >
                <TerminalAddDTU />
            </Modal>
        </div>
    );
}
