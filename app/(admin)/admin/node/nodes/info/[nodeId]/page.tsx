'use client'
import { Descriptions, Statistic, Card, Row, Col, Table, Tag } from "antd"
import React, { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Nodes as getNodes, lognodes } from "@/lib/api/fetchRoot"
import { Log } from "@/components/log"
import { usePromise } from "@/lib/hooks/usePromise"
import { generateTableKey } from "@/lib/utils/tableCommon"
import { ArrowLeftOutlined } from "@ant-design/icons"

export const NodeDetail: React.FC = () => {
    const params = useParams()
    const router = useRouter()
    const nodeId = decodeURIComponent(params.nodeId as string)

    const { data: nodes } = usePromise<any[]>(async () => {
        const el = await getNodes()
        return el.data.items || el.data as any
    }, [] as any[])

    const node = useMemo(() =>
        Array.isArray(nodes) ? nodes.find((n: any) => n.Name === nodeId) : null
    , [nodes, nodeId])

    if (!node) return null

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <a onClick={() => router.back()} style={{ cursor: 'pointer' }}>
                    <ArrowLeftOutlined /> 返回列表
                </a>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="注册设备" value={node.count || 0} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="在线设备" value={node.online || 0} valueStyle={{ color: '#3f8600' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="最大连接数" value={node.MaxConnections || 0} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="在线率"
                            value={node.count ? Math.round((node.online / node.count) * 100) : 0}
                            suffix="%"
                            valueStyle={{ color: node.count && (node.online / node.count) > 0.5 ? '#3f8600' : '#cf1322' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="节点名称">
                    <Tag color="blue">{node.Name}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="节点IP">{node.IP}</Descriptions.Item>
                <Descriptions.Item label="节点端口">{node.Port}</Descriptions.Item>
                <Descriptions.Item label="节点ID">{node._id}</Descriptions.Item>
            </Descriptions>

            <Log lastDay={60} dataFun={lognodes}
                filterNode={nodeId}
                cPie={['type']}
                columns={[
                    {
                        dataIndex: 'type',
                        title: '事件',
                    },
                    {
                        dataIndex: 'ID',
                        title: 'socketId'
                    }
                ]}
            />
        </div>
    )
}

export default NodeDetail