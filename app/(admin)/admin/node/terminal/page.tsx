'use client'
import { Button, Col, Row, Spin, Tabs, Modal, Divider, Form, Input, Tag, message } from "antd";
import React, { useState, useMemo } from "react";
import {
    ApiOutlined, NodeIndexOutlined, AppstoreOutlined, DeploymentUnitOutlined,
} from '@ant-design/icons'
import { TerminalsTable } from "@/components/terminal/TerminalsTable";
import { getTerminalStats, addRegisterTerminal } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { ModalConfirm } from "@/lib/utils/util";
import { NodesSelects } from "@/components/node/NodesSelects";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";
import { StatusTag } from "@/components/common/StatusTag";

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
                await addRegisterTerminal(mac, node);
                message.success(`添加设备${mac}成功`);
            } else {
                await addRegisterTerminal(mac, node);
                message.success(`添加设备${mac}成功`);
            }
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

    const { data: stats, loading: statsLoading } = usePromise(async () => {
        const { data } = await getTerminalStats()
        const d = data as {
            onlines: {type: string, value: number}[],
            nodes: {type: string, value: number}[],
            pids: {type: string, value: number}[],
            devs: {type: string, value: number}[]
        }

        d.onlines?.sort((a, b) => b.value - a.value);
        d.nodes?.sort((a, b) => b.value - a.value);
        d.pids?.sort((a, b) => b.value - a.value);
        d.devs?.sort((a, b) => b.value - a.value);

        return d;
    }, undefined)

    const items = [
        {
            key: 'list',
            label: '终端列表',
            children: (
                <TerminalsTable
                    readyData={setterminals}
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
            children: stats ? (
                <Row gutter={[20, 20]}>
                    <Col xs={24} md={12} key="onlines">
                        <StatSection title="在线分布" icon={<ApiOutlined />} data={stats.onlines} color="#10b981" />
                    </Col>
                    <Col xs={24} md={12} key="nodes">
                        <StatSection title="节点分布" icon={<NodeIndexOutlined />} data={stats.nodes} color="#6366f1" />
                    </Col>
                    <Col xs={24} md={12} key="pids">
                        <StatSection title="PID 分布" icon={<AppstoreOutlined />} data={stats.pids} color="#a855f7" />
                    </Col>
                    <Col xs={24} md={12} key="devs">
                        <StatSection title="设备分布" icon={<DeploymentUnitOutlined />} data={stats.devs} color="#f59e0b" />
                    </Col>
                </Row>
            ) : statsLoading ? (
                <div className="bento-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Spin />
                </div>
            ) : (
                <div className="bento-card" style={{ textAlign: 'center', padding: 60, color: 'var(--ink-500)' }}>
                    暂无统计数据
                </div>
            )
        }
    ];

    // server `admin-dashboard.controller.ts getTerminalStats()` 用 $group by online 字段,
    // 返回 onlines: [{type: 'true', value: N}, {type: 'false', value: M}] —— type 是 online 字段值字符串
    const total = stats?.onlines?.reduce((s, x) => s + x.value, 0) ?? 0
    const onlines = stats?.onlines?.find(x => x.type === 'true')?.value ?? 0
    const offlines = stats?.onlines?.find(x => x.type === 'false')?.value ?? 0
    const nodes = stats?.nodes?.reduce((s, x) => s + x.value, 0) ?? 0

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
            <div style={{ marginBottom: 24 }}>
                <PageSummary
                    items={[
                        { label: '设备总数', value: total, variant: 'primary' },
                        { label: '在线', value: onlines, variant: 'success' },
                        { label: '离线', value: offlines, variant: 'warning' },
                        { label: '节点数', value: nodes, variant: 'info' },
                    ]}
                />
            </div>
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

/**
 * 统计子区: bento-card 包装 + 标题 + KV grid
 * 跟 user 页注册类型行视觉对齐 (stat-card 风格)
 */
const StatSection: React.FC<{
    title: string
    icon: React.ReactNode
    data: { type: string; value: number }[]
    color: string
}> = ({ title, icon, data, color }) => {
    const total = data.reduce((s, x) => s + x.value, 0)
    return (
        <div className="bento-card" style={{ padding: 20, height: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--ink-100)',
                }}
            >
                <span
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${color}1a`,
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                    }}
                >
                    {icon}
                </span>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{title}</h3>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>共 {total}</span>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                }}
            >
                {data.map(item => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                    return (
                        <div
                            key={item.type}
                            className="stat-card"
                            style={{
                                padding: 14,
                                background: `${color}08`,
                                border: `1px solid ${color}1a`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                                <span
                                    className="app-kv-label"
                                    style={{ fontFamily: 'ui-monospace, monospace', textTransform: 'none', letterSpacing: 0 }}
                                >
                                    {item.type}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: 'var(--ink-900)',
                                    fontVariantNumeric: 'tabular-nums',
                                    lineHeight: 1.1,
                                }}
                            >
                                {item.value}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{pct}%</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}