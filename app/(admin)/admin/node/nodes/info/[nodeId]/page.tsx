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

import { Button, message, Modal, Progress, Space } from 'antd'
import { confirm, success, info, error, warning } from '@/lib/utils/modal'
import {
    ReloadOutlined,
    SafetyCertificateOutlined,
    ClusterOutlined,
    AlertOutlined,
    BugOutlined,
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
import { StatCard } from '@/components/admin/StatCard'
import { MiniSparkline } from '@/components/common/MiniSparkline'
import { StatusTag } from '@/components/common/StatusTag'
import { LiveControls } from '@/components/common/LiveControls'
import { Nodes as getNodes, lognodes, nodeRestart, rotateNodeToken } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'
import { useDashboardStat } from '@/lib/hooks/useDashboardStat'
import { getAlarmTrend, getDataFreshness } from '@/lib/api/admin-summary/client'
import type { AlarmTrendResp, DataFreshnessResp } from '@/types/admin-summary'

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

    // W6 · 详情页 KPI: 30d 告警 trend + 数据新鲜度
    // ⚠️ hooks 必须放在 if (!node) return null 之前, 否则 react-hooks/rules-of-hooks 报
    // "called conditionally" (跟现有 usePromise / useMemo 同位置)
    // trial mode 时 BFF 403, useDashboardStat catch + initValue 兜底,
    // 30d trend 返空数组 → MiniSparkline 显示 "暂无数据" 而非图表错误
    const { data: alarmTrend } = useDashboardStat<AlarmTrendResp>(
        () => getAlarmTrend(720, 'day'),
        [],
        [],
    )
    const { data: freshness } = useDashboardStat<DataFreshnessResp>(
        () => getDataFreshness(),
        [],
        { fresh: 0, stale: 0, dead: 0, never: 0, total: 0 },
    )

    const node = useMemo(
        () => (Array.isArray(nodes) ? nodes.find((n) => n.Name === nodeId) : null),
        [nodes, nodeId],
    )

    // W6 review fix · 详情页客户端 filter (BFF /alarms/trend 暂时不支持 nodeName param)
    // 短期方案: page 端用 .filter(d => d.nodeName === node.Name) 客户端过滤,
    //          值/popover 都走过滤后 data
    // 长期方案: BE 给 getAlarmTrend / getDataFreshness 加 nodeName param (单独 PR)
    // ⚠️ 当前 BFF 响应 AlarmTrendBucket { bucket, critical, warning, info, total } 无 nodeName 字段,
    //    过滤后 = []. 详情页 trend 值 = 0, popover MiniSparkline 走 "暂无数据" 兜底.
    //    BE 加 nodeName param 后, 过滤会从 [] 变为实际 per-node buckets, 全链路自动正确.
    const nodeFilteredAlarmTrend = useMemo(
        () => (Array.isArray(alarmTrend) && node
            ? alarmTrend.filter((b: any) => b.nodeName === node.Name)
            : []),
        [alarmTrend, node],
    )
    const totalAlarms30d = useMemo(
        () => (Array.isArray(nodeFilteredAlarmTrend) ? nodeFilteredAlarmTrend.reduce((acc, b) => acc + (b.total || 0), 0) : 0),
        [nodeFilteredAlarmTrend],
    )
    const totalCritical30d = useMemo(
        () => (Array.isArray(nodeFilteredAlarmTrend) ? nodeFilteredAlarmTrend.reduce((acc, b) => acc + (b.critical || 0), 0) : 0),
        [nodeFilteredAlarmTrend],
    )

    if (!node) return null

    // 节点是否在线: 后端不返回 `online` 字段 (Uart.NodeClient type 也没声明),
    // 改用 lastSeenAt 派生 — 60s 内有心跳算在线 (Token 鉴权每次握手刷新)
    const nodeAny = node as any
    const isOnline = !!node.lastSeenAt && dayjs().diff(dayjs(node.lastSeenAt), 'second') <= 60
    const regCount = Number(nodeAny.count ?? 0)
    // online 字段后端不一定返回, undefined 时显示 '—'
    const onlineCount: number | string = nodeAny.online != null ? Number(nodeAny.online) : '—'
    const maxConn = Number(node.MaxConnections ?? 0)
    const onlineRate = regCount > 0 && typeof onlineCount === 'number'
        ? Math.round((onlineCount / regCount) * 100)
        : 0

    // LiveControls 6 tile 实时数据需要的 mac/pid — node 实体没 mac/pid, 用 _id 当 mac, 默认 0 当 pid
    const tileMac = String((node as any).mac ?? node._id ?? node.Name)
    const tilePid = Number((node as any).pid ?? 0)

    const handleRotate = () => {
        const isInit = !(node.hasToken ?? false)
        confirm({
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
        confirm({
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

            {/* ─── 2. 顶部操作条 (返回 / 重置 token / 重启) · 标题/breadcrumb 让给 hero + 顶栏 ─── */}
            <PageHeader
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

            {/* ─── 3. 6 KPI 顶部汇总 (注册设备 / 在线设备 / 最大连接 / 在线率 / 30d 告警 / 30d 错误) ───
                W6 · 4 张基础 + 2 张 drilldown (告警 + 数据新鲜度)
                30d 告警: hover 显示 30d trend sparkline
                数据新鲜度: hover 显示 4 档分桶 + sparkline (复用 common/MiniSparkline) */}
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
                    label="注册设备"
                    value={regCount}
                    variant="primary"
                    active={false}
                    onToggle={() => {/* passive, 仅展示 */}}
                />
                <StatCard
                    kind="filter"
                    label="在线设备"
                    value={(
                        <Space size={6}>
                            {onlineCount}
                            <StatusTag
                                variant={isOnline ? 'online' : 'offline'}
                                size="sm"
                                pulse={isOnline}
                            />
                        </Space>
                    )}
                    variant="success"
                    active={false}
                    onToggle={() => {/* passive, 仅展示 */}}
                />
                <StatCard
                    kind="filter"
                    label="最大连接数"
                    value={maxConn}
                    variant="info"
                    active={false}
                    onToggle={() => {/* passive, 仅展示 */}}
                />
                <StatCard
                    kind="filter"
                    label="在线率"
                    value={`${onlineRate}%`}
                    variant={onlineRate >= 50 ? 'success' : 'danger'}
                    active={false}
                    onToggle={() => {/* 公式指标, 不联动 filter */}}
                />
                <StatCard
                    kind="drilldown"
                    label="30d 告警"
                    value={totalAlarms30d}
                    variant="warning"
                    icon={<AlertOutlined />}
                    data={nodeFilteredAlarmTrend}
                    trigger="hover"
                    popoverContent={({ data: trend }) => (
                        <div style={{ minWidth: 280 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                                30d 告警 trend (BFF /alarms/trend 720h day)
                            </div>
                            <MiniSparkline
                                data={(trend as AlarmTrendResp) ?? []}
                                color="#f59e0b"
                                height={60}
                                width={260}
                            />
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ink-100)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-500)' }}>
                                <span>critical {totalCritical30d}</span>
                                <span>30d 合计 {totalAlarms30d}</span>
                            </div>
                        </div>
                    )}
                />
                <StatCard
                    kind="drilldown"
                    label="数据新鲜度"
                    value={freshness.fresh}
                    variant="success"
                    icon={<BugOutlined />}
                    data={freshness}
                    trigger="hover"
                    popoverContent={({ data: fr }) => (
                        <div style={{ minWidth: 260 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                                4 档分桶 (BFF /data/freshness) · 总设备 {(fr as DataFreshnessResp)?.total ?? 0}
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
                                const v = (fr as DataFreshnessResp)?.[b.k as keyof DataFreshnessResp] ?? 0
                                return (
                                    <div key={b.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
                                        <span style={{ color: b.color }}>● {b.label}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>{String(v)}</span>
                                    </div>
                                )
                            })}
                            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-500)', fontStyle: 'italic' }}>
                                全系统数据 · per-node filter 待 BE 支持
                            </div>
                        </div>
                    )}
                />
            </div>

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
