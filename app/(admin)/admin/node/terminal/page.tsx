'use client'
import { Button, Col, Row, Spin, Tabs, Modal, Divider, Form, Input, Tag, message } from "antd";
import React, { useState, useMemo } from "react";
import {
    ApiOutlined, NodeIndexOutlined, AppstoreOutlined, DeploymentUnitOutlined,
    ShareAltOutlined, PieChartOutlined, ClockCircleOutlined,
    CalculatorOutlined, DatabaseOutlined, StopOutlined, EnvironmentOutlined,
} from '@ant-design/icons'
import { TerminalsTable } from "@/components/terminal/TerminalsTable";
import { getTerminalStats, addRegisterTerminal, getTerminalDetailedStats } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { ModalConfirm } from "@/lib/utils/util";
import { NodesSelects } from "@/components/node/NodesSelects";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";
import { StatSection } from "@/components/common/StatSection";
import { StatCardsRow } from "@/components/common/StatCardsRow";
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

    const items = [
        {
            key: 'list',
            label: '终端列表',
            children: (
                <TerminalsTable
                    readyData={setterminals}
                    statsNodes={statsNodes}
                    statsPids={statsPids}
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
            {/* PageSummary 主卡 6 张: 总数/在线/离线/共享数/在线率/停用 (server PR #108 加 停用, warning variant) */}
            <div style={{ marginBottom: 24 }}>
                <PageSummary
                    items={[
                        { label: '设备总数', value: serverStats.total, variant: 'primary' },
                        { label: '在线', value: serverStats.online, variant: 'success' },
                        { label: '离线', value: serverStats.offline, variant: 'warning' },
                        {
                            label: '共享数',
                            value: serverStats.shared,
                            variant: 'info',
                            icon: <ShareAltOutlined />,
                        },
                        {
                            label: '在线率',
                            value: `${serverStats.onlineRate}%`,
                            variant: 'info',
                            icon: <PieChartOutlined />,
                            extra: serverStats.total > 0 ? `${serverStats.online} / ${serverStats.total}` : undefined,
                        },
                        {
                            label: '停用',
                            value: serverStats.disable,
                            variant: 'warning',
                            icon: <StopOutlined />,
                            extra: serverStats.total > 0 ? `${Math.round((serverStats.disable / serverStats.total) * 100)}% 停用率` : undefined,
                        },
                    ]}
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
