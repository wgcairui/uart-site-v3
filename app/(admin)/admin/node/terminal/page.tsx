'use client'
import { Button, Col, Row, Descriptions, Spin, Tabs, Modal, Divider, Form, Input, Tag, message } from "antd";
import React, { useState, useMemo } from "react";
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
                        <Button type="primary" size="small" onClick={() => setRegisterModalOpen(true)}>
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
                <Row gutter={36}>
                    <Col span={12} key="onlines">
                        <Descriptions title="在线分布" bordered column={1} size="small">
                            {stats.onlines.map(item => (
                                <Descriptions.Item key={item.type} label={item.type}>{item.value}</Descriptions.Item>
                            ))}
                        </Descriptions>
                    </Col>
                    <Col span={12} key="nodes">
                        <Descriptions title="节点分布" bordered column={1} size="small">
                            {stats.nodes.map(item => (
                                <Descriptions.Item key={item.type} label={item.type}>{item.value}</Descriptions.Item>
                            ))}
                        </Descriptions>
                    </Col>
                    <Col span={12} key="pids">
                        <Descriptions title="PID分布" bordered column={1} size="small">
                            {stats.pids.map(item => (
                                <Descriptions.Item key={item.type} label={item.type}>{item.value}</Descriptions.Item>
                            ))}
                        </Descriptions>
                    </Col>
                    <Col span={12} key="devs">
                        <Descriptions title="设备分布" bordered column={1} size="small">
                            {stats.devs.map(item => (
                                <Descriptions.Item key={item.type} label={item.type}>{item.value}</Descriptions.Item>
                            ))}
                        </Descriptions>
                    </Col>
                </Row>
            ) : statsLoading ? <Spin /> : <div style={{ color: '#999' }}>暂无统计数据</div>
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
            <PageHeader title="终端管理" subtitle="管理所有 DTU 设备、节点、协议、注册" />
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