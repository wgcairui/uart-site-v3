'use client'

/**
 * 节点详情页 — uart-server token 鉴权改造适配版
 *
 * 改动:
 * 1. Descriptions 加 3 行:鉴权方式 / 最近 IP / 最后心跳
 * 2. 右上角加「重置 token」按钮(hasToken === true 才显示)
 */

import { Button, Card, Col, Descriptions, message, Modal, Row, Space, Statistic, Tag } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useParams, useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'

import { Log } from '@/components/log'
import { RotateTokenModal } from '@/components/Node/RotateTokenModal'
import { Nodes as getNodes, lognodes, rotateNodeToken } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const NodeDetail: React.FC = () => {
    const params = useParams()
    const router = useRouter()
    const nodeId = decodeURIComponent(params.nodeId as string)
    const [rotating, setRotating] = useState(false)
    const [tokenModal, setTokenModal] = useState<{
        open: boolean
        single?: { Name: string; plainToken: string } | null
    }>({ open: false })

    const { data: nodes } = usePromise<any[]>(async () => {
        const el = await getNodes()
        return el.data?.items || el.data || []
    }, [] as any[])

    const node = useMemo(
        () => (Array.isArray(nodes) ? nodes.find((n: any) => n.Name === nodeId) : null),
        [nodes, nodeId],
    )

    if (!node) return null

    const handleRotate = () => {
        Modal.confirm({
            title: '重置节点 Token',
            content: (
                <div>
                    <div>确定重置节点 <b>{nodeId}</b> 的鉴权 Token？</div>
                    <div style={{ color: '#e84545', marginTop: 8 }}>
                        旧 token 立即失效,对应 Node 会在下次重连时被拒。
                    </div>
                </div>
            ),
            okText: '确定重置',
            okButtonProps: { danger: true },
            onOk() {
                setRotating(true)
                return rotateNodeToken(nodeId)
                    .then((el) => {
                        if (el.code && el.data?.plainToken) {
                            setTokenModal({
                                open: true,
                                single: { Name: el.data.Name, plainToken: el.data.plainToken },
                            })
                        } else {
                            message.error(el.message || '重置失败')
                        }
                    })
                    .finally(() => setRotating(false))
            },
        })
    }

    const handleRestart = () => {
        Modal.confirm({
            content: `确定重启节点:${nodeId}??`,
            onOk() {
                message.success('重启指令已发送')
            },
        })
    }

    const lastSeenAbsolute = node.lastSeenAt
        ? dayjs(node.lastSeenAt).format('YYYY-MM-DD HH:mm:ss')
        : '—'
    const lastSeenRelative = node.lastSeenAt ? dayjs(node.lastSeenAt).fromNow() : '—'

    return (
        <div>
            <div
                style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                }}
            >
                <a onClick={() => router.back()} style={{ cursor: 'pointer' }}>
                    <ArrowLeftOutlined /> 返回列表
                </a>
                <Space>
                    {node.hasToken && (
                        <Button
                            type="primary"
                            danger
                            icon={<SafetyCertificateOutlined />}
                            loading={rotating}
                            onClick={handleRotate}
                        >
                            重置 Token
                        </Button>
                    )}
                    <Button icon={<ReloadOutlined />} onClick={handleRestart}>
                        重启节点
                    </Button>
                </Space>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="注册设备" value={node.count || 0} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="在线设备"
                            value={node.online || 0}
                            valueStyle={{ color: '#00b86b' }}
                        />
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
                            valueStyle={{
                                color:
                                    node.count && node.online / node.count > 0.5
                                        ? '#00b86b'
                                        : '#e84545',
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            <Descriptions
                bordered
                column={2}
                style={{ marginBottom: 24 }}
                title="节点信息"
            >
                <Descriptions.Item label="节点名称">
                    <Tag color="blue">{node.Name}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="节点 ID">{node._id}</Descriptions.Item>
                <Descriptions.Item label="节点 IP">{node.IP}</Descriptions.Item>
                <Descriptions.Item label="节点端口">{node.Port}</Descriptions.Item>
                <Descriptions.Item label="鉴权方式">
                    {node.hasToken ? (
                        <Tag color="success" icon={<SafetyCertificateOutlined />}>
                            Token 鉴权（已配置）
                        </Tag>
                    ) : (
                        <Tag>存量 IP 鉴权</Tag>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="最近 IP">
                    {node.lastSeenIp ? (
                        <code
                            style={{
                                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                                fontSize: 13,
                            }}
                        >
                            {node.lastSeenIp}
                        </code>
                    ) : (
                        <span style={{ color: '#b0b8c8' }}>—</span>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="最后心跳">
                    <Space direction="vertical" size={0}>
                        <span>{lastSeenAbsolute}</span>
                        {node.lastSeenAt && (
                            <span style={{ fontSize: 12, color: '#7c8aa0' }}>
                                {lastSeenRelative}
                            </span>
                        )}
                    </Space>
                </Descriptions.Item>
            </Descriptions>

            <Log
                lastDay={60}
                dataFun={lognodes}
                filterNode={nodeId}
                cPie={['type']}
                columns={[
                    {
                        dataIndex: 'type',
                        title: '事件',
                    },
                    {
                        dataIndex: 'ID',
                        title: 'socketId',
                    },
                ]}
            />

            <RotateTokenModal
                open={tokenModal.open}
                onClose={() => setTokenModal({ open: false })}
                single={tokenModal.single}
                source="rotate"
            />
        </div>
    )
}

export default NodeDetail
