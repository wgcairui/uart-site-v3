'use client'

/**
 * 节点详情页 — v3 hybrid (Page B · 1:1)
 *
 * 视觉: device hero 紫渐变 + LiveControls 6 tile + bento-card 节点信息 + Log 60d
 * 兼容: 复用 PageHeader / PageSummary / StatusTag / LiveControls / Log / RotateTokenModal
 * 节点实体: Uart.NodeClient (字段: Name/_id/IP/Port/MaxConnections/count/online/hasToken/lastSeenAt/lastSeenIp)
 *
 * 关键决定:
 * - mac / pid 字段在 node 上没有, 用 clientId (即 _id) 当 mac, pid 兜底 0, 不阻塞
 * - 鉴权方式用 StatusTag: hasToken → online (绿), IP 回退 → idle (灰)
 * - bento-card 用现成 .glass-card + .bento-card 玻璃感, 6 项 KV grid
 */

import { Button, message, Modal, Space } from 'antd'
import {
    ReloadOutlined,
    SafetyCertificateOutlined,
    ClusterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useParams } from 'next/navigation'
import React, { useMemo, useState } from 'react'

import { Log } from '@/components/log/log'
import { RotateTokenModal } from '@/components/node/RotateTokenModal'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { LiveControls } from '@/components/common/LiveControls'
import { Nodes as getNodes, lognodes, nodeRestart, rotateNodeToken } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const NodeDetail: React.FC = () => {
    const params = useParams()
    const nodeId = decodeURIComponent(params.nodeId as string)
    const [rotating, setRotating] = useState(false)
    const [restarting, setRestarting] = useState(false)
    const [tokenModal, setTokenModal] = useState<{
        open: boolean
        single?: { Name: string; plainToken: string } | null
        source?: 'rotate' | 'init'
    }>({ open: false })

    const { data: nodes } = usePromise<Uart.NodeClient[]>(async () => {
        const el = await getNodes()
        return Array.isArray(el.data) ? el.data : []
    }, [] as Uart.NodeClient[])

    const node = useMemo(
        () => (Array.isArray(nodes) ? nodes.find((n) => n.Name === nodeId) : null),
        [nodes, nodeId],
    )

    if (!node) return null

    // online 字段在 Uart.NodeClient 类型里没声明, 但后端实际返回 (sibling nodes/page.tsx 也是 any 取)
    const nodeAny = node as any
    const isOnline = Number(nodeAny.online ?? 0) > 0
    const regCount = Number(nodeAny.count ?? 0)
    const onlineCount = Number(nodeAny.online ?? 0)
    const maxConn = Number(node.MaxConnections ?? 0)
    const onlineRate = regCount > 0 ? Math.round((onlineCount / regCount) * 100) : 0

    // LiveControls 6 tile 实时数据需要的 mac/pid — node 实体没 mac/pid, 用 _id 当 mac, 默认 0 当 pid
    const tileMac = String((node as any).mac ?? node._id ?? node.Name)
    const tilePid = Number((node as any).pid ?? 0)

    const handleRotate = () => {
        const isInit = !(node.hasToken ?? false)
        Modal.confirm({
            title: isInit ? '为节点生成 Token' : '重置节点 Token',
            content: (
                <div>
                    <div>确定要为节点 <b>{nodeId}</b> {isInit ? '生成' : '重置'}鉴权 Token？</div>
                    <div style={{ color: '#e84545', marginTop: 8 }}>
                        {isInit
                            ? '生成后该节点将启用 Token 鉴权,IP 鉴权回退路径立即失效。需准备好立即更新 Node 部署配置(环境变量 NODE_TOKEN)。'
                            : '旧 token 立即失效,对应 Node 会在下次重连时被拒。'}
                    </div>
                </div>
            ),
            okText: isInit ? '确定生成' : '确定重置',
            okButtonProps: { danger: true },
            onOk() {
                setRotating(true)
                return rotateNodeToken(nodeId)
                    .then((el) => {
                        if (el.code && el.data?.plainToken) {
                            setTokenModal({
                                open: true,
                                single: { Name: el.data.Name, plainToken: el.data.plainToken },
                                source: isInit ? 'init' : 'rotate',
                            })
                        } else {
                            message.error(el.message || (isInit ? '生成失败' : '重置失败'))
                        }
                    })
                    .finally(() => setRotating(false))
            },
        })
    }

    const handleRestart = () => {
        Modal.confirm({
            content: `确定重启节点:${nodeId}?`,
            onOk() {
                setRestarting(true)
                return nodeRestart(nodeId)
                    .then(() => message.success('重启指令已发送'))
                    .catch((err: any) => message.error(err?.message || '重启失败'))
                    .finally(() => setRestarting(false))
            },
        })
    }

    const lastSeenAbsolute = node.lastSeenAt
        ? dayjs(node.lastSeenAt).format('YYYY-MM-DD HH:mm:ss')
        : '—'
    const lastSeenRelative = node.lastSeenAt ? dayjs(node.lastSeenAt).fromNow() : '—'

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            {/* ─── 1. device hero 紫渐变 (hybrid Page B · .device-hero 1:1) ─── */}
            <div
                className="bento-card v3-device-hero"
                style={{
                    marginBottom: 20,
                    padding: '24px 32px',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
                    color: '#fff',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* 装饰光晕 (右上) */}
                <div
                    style={{
                        position: 'absolute', top: -80, right: -80,
                        width: 280, height: 280,
                        background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
                        opacity: 0.4, pointerEvents: 'none',
                    }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                    {/* 左: 设备 icon + 名称 + IP/协议 + tag 列表 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 16,
                                color: '#fff',
                            }}
                        >
                            <ClusterOutlined style={{ fontSize: 28 }} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>
                            {node.Name}
                        </h2>
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13, color: 'rgba(255,255,255,0.7)',
                                marginTop: 6,
                            }}
                        >
                            {node.IP} · protocol: modbus · pid: {tilePid}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    padding: '5px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                                }}
                            >
                                智能电表
                            </span>
                            <span
                                style={{
                                    padding: '5px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                                }}
                            >
                                485 总线
                            </span>
                            <span
                                style={{
                                    padding: '5px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                                }}
                            >
                                三相
                            </span>
                            <span
                                style={{
                                    padding: '5px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                                }}
                            >
                                {node.lastSeenAt
                                    ? `${dayjs(node.lastSeenAt).format('YYYY-MM')} 激活`
                                    : '待激活'}
                            </span>
                        </div>
                    </div>
                    {/* 右: 实时连接 indicator + 最后上报时间 */}
                    <div style={{ textAlign: 'right' }}>
                        <span
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 999,
                                background: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                color: isOnline ? '#86efac' : '#fda4af',
                                fontSize: 13, fontWeight: 600,
                                marginBottom: 12,
                            }}
                        >
                            <span
                                style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: isOnline ? '#86efac' : '#fda4af',
                                    animation: 'pulse-dot 2s infinite',
                                }}
                            />
                            {isOnline ? '实时连接' : '离线'}
                        </span>
                        <div
                            style={{
                                fontSize: 12, color: 'rgba(255,255,255,0.5)',
                                fontFamily: 'var(--font-mono)',
                                lineHeight: 1.6,
                            }}
                        >
                            最后上报 · {lastSeenAbsolute}
                            <br />
                            延迟 {isOnline ? '< 100ms' : '—'} · 信号 {isOnline ? '强' : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 2. PageHeader (返回 / 重置 token / 重启) ─── */}
            <PageHeader
                title={node.Name}
                subtitle={`节点 ID: ${node._id} · 端口 ${node.Port} · 最大连接 ${maxConn}`}
                breadcrumb={[
                    { title: '节点管理', href: '/admin/node/nodes' },
                ]}
                back
                extra={
                    <Space>
                        <Button
                            type="primary"
                            danger
                            icon={<SafetyCertificateOutlined />}
                            loading={rotating}
                            onClick={handleRotate}
                        >
                            {node.hasToken ? '重置 Token' : '配 Token'}
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            loading={restarting}
                            onClick={handleRestart}
                        >
                            重启节点
                        </Button>
                    </Space>
                }
            />

            {/* ─── 3. 4 KPI PageSummary (注册设备 / 在线设备 / 最大连接 / 在线率) ─── */}
            <PageSummary
                items={[
                    {
                        label: '注册设备',
                        value: regCount,
                        variant: 'primary',
                    },
                    {
                        label: '在线设备',
                        value: (
                            <Space size={6}>
                                {onlineCount}
                                <StatusTag
                                    variant={isOnline ? 'online' : 'offline'}
                                    size="sm"
                                    pulse={isOnline}
                                />
                            </Space>
                        ),
                        variant: 'success',
                    },
                    {
                        label: '最大连接数',
                        value: maxConn,
                        variant: 'info',
                    },
                    {
                        label: '在线率',
                        value: `${onlineRate}%`,
                        variant: onlineRate >= 50 ? 'success' : 'danger',
                    },
                ]}
            />

            {/* ─── 4. LiveControls 6 tile (实时数据 · 3s refresh) ─── */}
            <div style={{ marginBottom: 20 }}>
                <LiveControls
                    variant="device"
                    mac={tileMac}
                    pid={tilePid}
                    title="实时数据"
                />
            </div>

            {/* ─── 5. 节点信息 bento-card (6 项 KV grid) ─── */}
            <div
                className="bento-card"
                style={{ marginBottom: 20, padding: 24 }}
            >
                <h3
                    style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--ink-900)',
                        margin: '0 0 16px',
                    }}
                >
                    节点信息
                </h3>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '16px 24px',
                    }}
                >
                    <div className="kv-cell">
                        <div className="kv-label">节点名称</div>
                        <div className="kv-value">
                            <code
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 13,
                                    color: 'var(--ink-900)',
                                }}
                            >
                                {node.Name}
                            </code>
                        </div>
                    </div>
                    <div className="kv-cell">
                        <div className="kv-label">节点 ID</div>
                        <div className="kv-value">
                            <code
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12,
                                    color: 'var(--ink-700)',
                                }}
                            >
                                {node._id}
                            </code>
                        </div>
                    </div>
                    <div className="kv-cell">
                        <div className="kv-label">节点 IP</div>
                        <div className="kv-value">
                            <code
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 13,
                                    color: 'var(--ink-900)',
                                }}
                            >
                                {node.IP}
                            </code>
                        </div>
                    </div>
                    <div className="kv-cell">
                        <div className="kv-label">节点端口</div>
                        <div className="kv-value">
                            <code
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 13,
                                    color: 'var(--ink-900)',
                                }}
                            >
                                {node.Port}
                            </code>
                        </div>
                    </div>
                    <div className="kv-cell">
                        <div className="kv-label">鉴权方式</div>
                        <div className="kv-value">
                            {node.hasToken ? (
                                <StatusTag
                                    variant="online"
                                    text="Token 鉴权"
                                    size="sm"
                                    pulse
                                />
                            ) : (
                                <StatusTag
                                    variant="idle"
                                    text="IP 鉴权（回退）"
                                    size="sm"
                                />
                            )}
                        </div>
                    </div>
                    <div className="kv-cell">
                        <div className="kv-label">最近 IP</div>
                        <div className="kv-value">
                            {node.lastSeenIp ? (
                                <code
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 13,
                                        color: 'var(--ink-900)',
                                    }}
                                >
                                    {node.lastSeenIp}
                                </code>
                            ) : (
                                <span style={{ color: 'var(--ink-500)' }}>—</span>
                            )}
                        </div>
                    </div>
                    <div className="kv-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="kv-label">最后心跳</div>
                        <div className="kv-value">
                            <Space orientation="vertical" size={2}>
                                <span style={{ color: 'var(--ink-900)' }}>{lastSeenAbsolute}</span>
                                {node.lastSeenAt && (
                                    <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                                        {lastSeenRelative}
                                    </span>
                                )}
                            </Space>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 6. Log 组件 (60 days · 保持原样) ─── */}
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
                source={tokenModal.source}
            />

            {/* kv-cell 局部样式 — inline 写在 bento-card 区域内, 不污染全局 */}
            <style jsx>{`
                .kv-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .kv-label {
                    font-size: 11px;
                    color: var(--ink-500);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-family: var(--font-mono);
                    font-weight: 500;
                }
                .kv-value {
                    font-size: 14px;
                    color: var(--ink-900);
                    font-weight: 500;
                }
            `}</style>
        </div>
    )
}

export default NodeDetail
