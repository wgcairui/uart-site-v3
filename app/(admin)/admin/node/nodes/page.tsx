'use client'

/**
 * 节点管理页 — uart-server token 鉴权改造适配版
 *
 * 改动要点:
 * 1. 表格新增「鉴权状态」「最近 IP」两列
 * 2. 操作列加「重置 token / 配 token」按钮(所有节点都显示) — 每个节点独立支持重建/首次配 token
 * 3. AddNode 弹窗提交后,新建场景下展示明文 token(RotateTokenModal 复用)
 * 4. 端点全部切到 /api/v2/admin/dashboard/nodes(顺带修复旧端点无效 bug)
 *
 * 设计取舍:不做「批量迁移老节点」按钮 — 老节点走单节点「配 token」入口,hasToken=false 时按钮文案显示「配 token」。
 */

import { Button, Card, Divider, Form, Input, message, Modal, Space, Table, Tag } from 'antd'
import { StatusTag } from '@/components/common/StatusTag'
import { DeleteFilled, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import {
    Nodes as getNodes,
    deleteNode,
    nodeRestart,
    rotateNodeToken,
    setNode,
    type NodeTokenPlain,
} from '@/lib/api/fetchRoot'
import { RotateTokenModal } from '@/components/node/RotateTokenModal'
import { usePromise } from '@/lib/hooks/usePromise'
import { generateTableKey, tableConfig } from '@/lib/utils/tableCommon'
import { PaginationReq } from '@/types'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// ─── AddNode 弹窗(创建/编辑共用) ──────────────────────────────────────────────

interface AddNodeProps {
    ok?: () => void
    visible: boolean
    onCancel: () => void
    initialValue?: Uart.NodeClient | null
    /** 创建成功后的回调,用于在新建场景展示 plainToken */
    onCreated?: (result: { Name: string; plainToken?: string }) => void
}

const AddNode: React.FC<AddNodeProps> = ({ ok, visible, onCancel, initialValue, onCreated }) => {
    const [name, setName] = useState('')
    const [ip, setIp] = useState('')
    const [port, setPort] = useState(9000)
    const [count, setCount] = useState(20000)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (visible) {
            if (initialValue) {
                setName(initialValue.Name)
                setIp(initialValue.IP)
                setPort(initialValue.Port)
                setCount(initialValue.MaxConnections || 20000)
            } else {
                setName('')
                setIp('')
                setPort(9000)
                setCount(20000)
            }
        }
    }, [visible, initialValue])

    const submit = async () => {
        setSubmitting(true)
        try {
            const res = await setNode(name, ip, port, count)
            if (res.code) {
                message.success(initialValue ? '保存节点成功' : '添加节点成功')
                onCancel()
                ok?.()
                // 新建且后端返回了 plainToken → 通知父组件弹展示
                if (!initialValue && onCreated && res.data?.plainToken) {
                    onCreated({ Name: name, plainToken: res.data.plainToken })
                }
            } else {
                message.error(res.message || '保存失败')
            }
        } catch (e: any) {
            message.error(e?.message || '保存失败')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            title={initialValue ? '编辑节点' : '添加节点'}
            open={visible}
            onCancel={onCancel}
            onOk={submit}
            confirmLoading={submitting}
            destroyOnHidden
            okText={submitting ? '提交中…' : '确定'}
        >
            <Form labelCol={{ span: 5 }} disabled={submitting}>
                <Form.Item label="节点名称" required>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!!initialValue}
                    />
                </Form.Item>
                <Form.Item label="节点 IP" required>
                    <Input value={ip} onChange={(e) => setIp(e.target.value)} />
                </Form.Item>
                <Form.Item label="节点 Port">
                    <Input
                        value={port}
                        type="number"
                        onChange={(e) => setPort(Number(e.target.value))}
                    />
                </Form.Item>
                <Form.Item label="最大连接数">
                    <Input
                        value={count}
                        type="number"
                        onChange={(e) => setCount(Number(e.target.value))}
                    />
                </Form.Item>
                {!initialValue && (
                    <Form.Item>
                        <div style={{ color: '#7c8aa0', fontSize: 12 }}>
                            新建节点后端会自动生成 token,提交成功后会单独弹出展示,只有那一次机会看到。
                        </div>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    )
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export const Nodes: React.FC = () => {
    const [visible, setVisible] = useState(false)
    const [editingItem, setEditingItem] = useState<Uart.NodeClient | null>(null)
    const [rotating, setRotating] = useState<string | null>(null)
    const [tokenModal, setTokenModal] = useState<{
        single?: { Name: string; plainToken: string } | null
        list?: NodeTokenPlain[] | null
        source: 'rotate' | 'create' | 'init'
    } | null>(null)
    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true })

    // 移动端 detection: < 768px 走 cards 视图, 桌面走 Table
    // matchMedia hook 避免 SSR 报错 (window 仅 client 存在)
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    const router = useRouter()

    const { data: nodesData, fecth: refetch } = usePromise<Uart.NodeClient[]>(async () => {
        const el = await getNodes()
        // 后端实际返回数组（不是 V2ListResponse），做防御性 ?? 兜底
        return Array.isArray(el.data) ? el.data : []
    }, [] as Uart.NodeClient[], [])

    const nodes = nodesData ?? []

    // 顶部 status cards — 后端 nodes 列表不带 count/online 字段，用 MaxConnections 兜底
    const status = useMemo(
        () => nodes.map((el: any) => ({ type: el.Name, value: el.MaxConnections || 0 })),
        [nodes],
    )

    const handleDelete = (node: string) => {
        Modal.confirm({
            content: `确定删除节点 "${node}" 吗？`,
            onOk() {
                return deleteNode(node).then((el) => {
                    if (el.code) {
                        message.success('删除成功')
                        refetch()
                    } else {
                        Modal.warn({
                            content: `${el.data} 等设备挂载在节点上，无法直接删除`,
                        })
                    }
                })
            },
        })
    }

    const handleRestart = (node: string) => {
        Modal.confirm({
            content: `确定重启节点:${node}??`,
            onOk() {
                return nodeRestart(node).then(() => {
                    message.success('重启指令已发送')
                })
            },
        })
    }

    const handleRotate = (node: string, hasToken: boolean) => {
        const isInit = !hasToken
        Modal.confirm({
            title: isInit ? '为节点生成 Token' : '重置节点 Token',
            content: (
                <div>
                    <div>
                        确定要为节点 <b>{node}</b> {isInit ? '生成' : '重置'}鉴权 Token？
                    </div>
                    <div style={{ color: '#e84545', marginTop: 8 }}>
                        {isInit
                            ? '生成后该节点将启用 Token 鉴权,IP 鉴权回退路径立即失效。需准备好立即更新 Node 部署配置(环境变量 NODE_TOKEN)。'
                            : '旧 token 立即失效,对应 Node 会在下次重连时被拒。请准备好立即更新部署配置。'}
                    </div>
                </div>
            ),
            okText: isInit ? '确定生成' : '确定重置',
            okButtonProps: { danger: true },
            onOk() {
                setRotating(node)
                return rotateNodeToken(node)
                    .then((el) => {
                        if (el.code && el.data?.plainToken) {
                            setTokenModal({
                                single: { Name: el.data.Name, plainToken: el.data.plainToken },
                                source: isInit ? 'init' : 'rotate',
                            })
                        } else {
                            message.error(el.message || (isInit ? '生成失败' : '重置失败'))
                        }
                    })
                    .finally(() => setRotating(null))
            },
        })
    }

    const renderAuthBadge = (n: Uart.NodeClient) => {
        if (n.hasToken) {
            return (
                <Tag color="success" icon={<SafetyCertificateOutlined />}>
                    Token 鉴权
                </Tag>
            )
        }
        return <Tag>存量 IP 鉴权</Tag>
    }

    const renderLastSeen = (n: Uart.NodeClient) => {
        if (!n.lastSeenAt) return <span style={{ color: '#b0b8c8' }}>—</span>
        const d = dayjs(n.lastSeenAt)
        return (
            <span title={d.format('YYYY-MM-DD HH:mm:ss')}>
                {d.fromNow?.() || d.format('MM-DD HH:mm')}
            </span>
        )
    }

    // 移动端 action handler 集 (与桌面 Table 操作列共享同一回调)
    const editNode = (n: Uart.NodeClient) => {
        setEditingItem(n)
        setVisible(true)
    }
    const viewLogs = (n: Uart.NodeClient) => {
        router.push(`/admin/node/nodes/info/${encodeURIComponent(n.Name)}`)
    }
    const restartNode = (n: Uart.NodeClient) => handleRestart(n.Name)
    const rotateOrInit = (n: Uart.NodeClient) => handleRotate(n.Name, n.hasToken ?? false)
    const deleteNodeAction = (n: Uart.NodeClient) => handleDelete(n.Name)

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <Divider plain>节点信息</Divider>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    margin: '16px 0',
                }}
            >
                {status.map((item) => (
                    <Card size="small" key={item.type}>
                        <div>
                            {item.type}: {item.value}
                        </div>
                    </Card>
                ))}
            </div>

            <div
                style={{
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                }}
            >
                <Button type="primary" onClick={() => {
                    setEditingItem(null)
                    setVisible(true)
                }}>
                    添加节点
                </Button>
            </div>

            <AddNode
                visible={visible}
                onCancel={() => setVisible(false)}
                initialValue={editingItem}
                ok={refetch}
                onCreated={({ Name, plainToken }) => {
                    if (plainToken) {
                        setTokenModal({
                            single: { Name, plainToken },
                            source: 'create',
                        })
                    }
                }}
            />

            {tokenModal && (
                <RotateTokenModal
                    open={!!tokenModal}
                    onClose={() => setTokenModal(null)}
                    single={tokenModal.single}
                    list={tokenModal.list}
                    source={tokenModal.source}
                />
            )}

            {isMobile ? (
                <div className="nodes-mobile-cards" data-testid="nodes-mobile-cards">
                    {generateTableKey(nodes, '_id').map((n: any) => (
                        <div key={n._id ?? n.Name} className="node-mobile-card">
                            <div className="node-mobile-card-header">
                                <span className="node-name">{n.Name}</span>
                                <StatusTag
                                    variant={n.online ? 'online' : 'offline'}
                                    size="sm"
                                />
                            </div>
                            <div className="node-mobile-card-body">
                                <div className="kv">
                                    <span>节点 IP</span>
                                    <span>{n.IP || '—'}</span>
                                </div>
                                <div className="kv">
                                    <span>节点端口</span>
                                    <span>{n.Port ?? '—'}</span>
                                </div>
                                <div className="kv">
                                    <span>最大连接</span>
                                    <span>{n.MaxConnections ?? '—'}</span>
                                </div>
                                <div className="kv">
                                    <span>注册设备</span>
                                    <span>{n.count ?? '—'}</span>
                                </div>
                                <div className="kv">
                                    <span>在线设备</span>
                                    <span>
                                        <StatusTag
                                            variant={n.online ? 'online' : 'offline'}
                                            size="sm"
                                        />
                                    </span>
                                </div>
                                <div className="kv">
                                    <span>鉴权状态</span>
                                    <span>
                                        {renderAuthBadge(n)}
                                        {n.hasToken && n.lastSeenAt && (
                                            <span style={{ fontSize: 11, color: '#7c8aa0', marginLeft: 6 }}>
                                                {renderLastSeen(n)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="kv">
                                    <span>最近 IP</span>
                                    <span>
                                        {n.lastSeenIp ? (
                                            <code
                                                style={{
                                                    fontFamily:
                                                        "'JetBrains Mono', ui-monospace, monospace",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {n.lastSeenIp}
                                            </code>
                                        ) : (
                                            <span style={{ color: '#b0b8c8' }}>—</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="node-mobile-card-actions">
                                <Button
                                    size="small"
                                    onClick={() => editNode(n)}
                                >
                                    编辑
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => viewLogs(n)}
                                >
                                    查看日志
                                </Button>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => restartNode(n)}
                                >
                                    重启
                                </Button>
                                <Button
                                    size="small"
                                    loading={rotating === n.Name}
                                    onClick={() => rotateOrInit(n)}
                                >
                                    {n.hasToken ? '重置 token' : '配 token'}
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteFilled />}
                                    onClick={() => deleteNodeAction(n)}
                                />
                            </div>
                        </div>
                    ))}
                    {nodes.length === 0 && (
                        <div className="node-mobile-empty">暂无节点</div>
                    )}
                </div>
            ) : (
                <Table className="v3-table"                 dataSource={generateTableKey(nodes, '_id')}
                    {...tableConfig}
                    pagination={{
                        current: query.page ?? 1,
                        pageSize: query.pageSize ?? 20,
                        total: nodes.length,
                        showTotal: t => `共 ${t} 个节点`,
                        showSizeChanger: true,
                    }}
                    onChange={pag => {
                        setQuery(prev => ({
                            ...prev,
                            page: pag.current ?? prev.page ?? 1,
                            pageSize: pag.pageSize ?? prev.pageSize ?? 20,
                        }))
                    }}
                >
                    <Table.Column dataIndex="Name" title="节点名称" />
                    <Table.Column dataIndex="IP" title="节点 IP" />
                    <Table.Column dataIndex="Port" title="节点端口" />
                    <Table.Column
                        dataIndex="MaxConnections"
                        title="最大连接数"
                    />
                    <Table.Column
                        dataIndex="count"
                        title="注册设备"
                        render={(v) => v ?? <span style={{ color: '#b0b8c8' }}>—</span>}
                    />
                    <Table.Column
                        dataIndex="online"
                        title="在线设备"
                        render={(v) => v ? <StatusTag variant="online" /> : <StatusTag variant="offline" />}
                    />
                    <Table.Column
                        key="auth"
                        title="鉴权状态"
                        render={(_, r: Uart.NodeClient) => (
                            <Space orientation="vertical" size={2}>
                                {renderAuthBadge(r)}
                                {r.hasToken && r.lastSeenAt && (
                                    <span style={{ fontSize: 12, color: '#7c8aa0' }}>
                                        {renderLastSeen(r)}
                                    </span>
                                )}
                            </Space>
                        )}
                    />
                    <Table.Column
                        key="lastSeenIp"
                        title="最近 IP"
                        render={(_, r: Uart.NodeClient) =>
                            r.lastSeenIp ? (
                                <code
                                    style={{
                                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                                        fontSize: 12,
                                    }}
                                >
                                    {r.lastSeenIp}
                                </code>
                            ) : (
                                <span style={{ color: '#b0b8c8' }}>—</span>
                            )
                        }
                    />
                    <Table.Column
                        key="op"
                        title="操作"
                        render={(_, r: Uart.NodeClient) => (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                        setEditingItem(r)
                                        setVisible(true)
                                    }}
                                >
                                    编辑
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() =>
                                        router.push(`/admin/node/nodes/info/${encodeURIComponent(r.Name)}`)
                                    }
                                >
                                    查看日志
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => handleRestart(r.Name)}
                                >
                                    重启
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    loading={rotating === r.Name}
                                    onClick={() => handleRotate(r.Name, r.hasToken ?? false)}
                                >
                                    {r.hasToken ? '重置 token' : '配 token'}
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    danger
                                    icon={<DeleteFilled />}
                                    onClick={() => handleDelete(r.Name)}
                                />
                            </div>
                        )}
                    />
                </Table>
            )}
        </div>
    )
}

export default Nodes
