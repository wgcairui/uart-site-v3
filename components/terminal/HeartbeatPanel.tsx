'use client'

/**
 * HeartbeatPanel · 设备心跳 3 层数据 (commit 7e073b7aa + 0de2b13da, 2026-07-21 ship)
 *
 * 三层架构 (server 端 src/module/terminal/controller/admin-terminal.controller.ts:138-191):
 *  1. redis `heartbeat:<mac>` SET ... EX 300 NX   → realtime 实时在线 (5min TTL)
 *  2. log.terminalEvents TERMINAL_CONNECT/OFFLINE → transitions 状态翻转 (30d)
 *  3. log.heartbeats 5min 降频采样                → samples 长期心跳 (7d)
 *
 * 设计要点:
 * - realtime 区域 5s 自动 poll, TTL 倒计时每秒重算 (client 端 useEffect 倒计时)
 * - transitions / samples 30s poll (翻转 / 采样都低频, 不浪费请求)
 * - samples 简单 SVG sparkline (不引 recharts, 最多 20 个点足够)
 * - 失联设备 (TTL 归零) 用红色 pulse 强提示
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Spin, Tag, Tooltip, Typography } from 'antd'
import {
    HeartOutlined,
    HistoryOutlined,
    LineChartOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { getTerminalHeartbeat } from '@/lib/api/endpoints/admin/terminals'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

interface Props {
    mac: string
}

interface HeartbeatData {
    realtime: Uart.HeartbeatRealtime
    transitions: Uart.HeartbeatTransition[]
    samples: Uart.HeartbeatSample[]
}

// transitions 摘要 (server payload schema: TERMINAL_CONNECT 含 protocol/pid/mountDev;
// TERMINAL_OFFLINE 含 lastSeen + reason)
function summarizeTransition(t: Uart.HeartbeatTransition): string {
    const p = t.payload as Record<string, unknown>
    if (t.kind === 'TERMINAL_CONNECT') {
        const parts = [p.protocol, p.pid, p.mountDev].filter(Boolean)
        return parts.length ? parts.join(' · ') : '设备握手成功'
    }
    if (t.kind === 'TERMINAL_OFFLINE') {
        const lastSeen = typeof p.lastSeen === 'number' ? dayjs(p.lastSeen).format('HH:mm:ss') : '?'
        const reason = p.reason ? String(p.reason) : 'unknown'
        return `lastSeen=${lastSeen}  reason=${reason}`
    }
    return ''
}

// 倒计时 hook: 实时返回当前距离 epoch 的相对秒数, 每秒更新
function useTickingNow(intervalMs = 1000): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(t)
    }, [intervalMs])
    return now
}

export function HeartbeatPanel({ mac }: Props) {
    const [data, setData] = useState<HeartbeatData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const tickNow = useTickingNow(1000) // TTL 倒计时每秒刷
    const reqIdRef = useRef(0)

    const fetchData = async (showLoading = false) => {
        const myReq = ++reqIdRef.current
        if (showLoading) setLoading(true)
        try {
            const res = await getTerminalHeartbeat(mac)
            if (myReq !== reqIdRef.current) return // 过期请求丢弃
            if (res.code === 200 && res.data) {
                setData(res.data as HeartbeatData)
                setError(null)
            } else {
                setError(res.message || `code=${res.code}`)
            }
        } catch (e) {
            if (myReq !== reqIdRef.current) return
            setError(e instanceof Error ? e.message : '网络错误')
        } finally {
            if (myReq === reqIdRef.current && showLoading) setLoading(false)
        }
    }

    // 初次 + realtime 5s poll + transitions/samples 30s poll
    useEffect(() => {
        let cancelled = false
        const initial = async () => {
            await fetchData(true)
            if (cancelled) return
        }
        initial()
        const fast = setInterval(() => fetchData(false), 5000)
        const slow = setInterval(() => fetchData(false), 30000)
        return () => {
            cancelled = true
            clearInterval(fast)
            clearInterval(slow)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mac])

    // realtime 衍生
    const realtime = data?.realtime
    const online = !!realtime?.online
    const ttlRemain = realtime && realtime.lastHeartbeatAt
        ? Math.max(0, realtime.ttlSeconds - Math.floor((tickNow - realtime.lastHeartbeatAt) / 1000))
        : 0
    const lastBeatRel = realtime?.lastHeartbeatAt
        ? dayjs(realtime.lastHeartbeatAt).fromNow()
        : '—'
    const lastBeatAbs = realtime?.lastHeartbeatAt
        ? dayjs(realtime.lastHeartbeatAt).format('HH:mm:ss')
        : '—'
    const ttlColor = !online ? '#ef4444' : ttlRemain < 60 ? '#f59e0b' : '#10b981'

    // 设备协议: 从 transitions 最新一条 TERMINAL_CONNECT 的 payload.protocol 推断
    // (server 端 mongo log.terminalEvents.kind=TERMINAL_CONNECT 注入 protocol 字段)
    // - "reline"     → DTU 直连 (走 socket/HTTP 到 mid, 不触发 PESIV 5min heartbeat 通道)
    // - "Pesiv卡"    → PESIV 网设备 (5min heartbeat 通道触发)
    // - 其他/无      → 协议未知 (展示为默认 PESIV 网语义, 等 server 补字段)
    const lastProtocol = useMemo<string | null>(() => {
        if (!data?.transitions?.length) return null
        for (const t of data.transitions) {
            if (t.kind === 'TERMINAL_CONNECT' && t.payload) {
                const p = (t.payload as Record<string, unknown>).protocol
                if (typeof p === 'string' && p) return p
            }
        }
        return null
    }, [data?.transitions])

    // protocol badge 渲染配置: 文案 / 颜色 / tooltip
    const protocolBadge = useMemo(() => {
        if (lastProtocol === 'reline') {
            return {
                text: 'DTU 直连',
                color: 'blue',
                tooltip:
                    '设备通过 DTU 直连协议 (reline) 上发数据,经节点 socket 转发到 mid。\n' +
                    '此通道**不触发** PESIV 5min heartbeat sampler,所以"实时连接"字段始终为离线。\n' +
                    '设备实际在线情况请参考 §2 状态历史 (CONNECT 记录) 与设备数据上报。',
            }
        }
        if (lastProtocol === 'Pesiv卡' || lastProtocol === 'pesiv') {
            return {
                text: 'PESIV 卡',
                color: 'green',
                tooltip:
                    '设备通过 PESIV 网卡 (UDP heartbeat) 上发,5min 周期触发 sampler 写 redis key + log.heartbeats。\n' +
                    '"实时连接"字段反映 PESIV 心跳是否在 5min TTL 内。',
            }
        }
        if (lastProtocol) {
            return {
                text: lastProtocol,
                color: 'default',
                tooltip: `设备协议 ${lastProtocol} (非 reline / 非 PESIV 卡,见 §2 CONNECT 记录详情)`,
            }
        }
        return null
    }, [lastProtocol])

    // samples 衍生: 距今秒数 (越小越新)
    const samplesSorted = useMemo(() => {
        if (!data?.samples) return []
        return [...data.samples].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    }, [data])

    return (
        <div
            className="bento-card"
            style={{
                padding: 20,
                background: 'rgba(255, 255, 255, 0.78)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: 'var(--shadow-bento)',
                borderRadius: 'var(--radius-2xl)',
            }}
        >
            {/* 标题行 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                    style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 16,
                    }}
                >
                    <HeartOutlined />
                </div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>心跳监测</h3>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                        Redis · 状态翻转 · 5min 降频采样
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-500)' }}>
                    {error ? (
                        <Text type="danger" style={{ fontSize: 11 }}>⚠ {error}</Text>
                    ) : loading ? (
                        <Spin size="small" />
                    ) : (
                        <span style={{ fontFamily: 'var(--font-mono)' }}>5s 自动刷新</span>
                    )}
                </div>
            </div>

            {/* row1: realtime 4 col + transitions 8 col (12-col design × 2 for antd 24-col grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginBottom: 16 }}>
                {/* §1 realtime 实时区 (span 4) */}
                <div style={{ gridColumn: 'span 4', minWidth: 0 }}>
                    <div
                        style={{
                            padding: 16, borderRadius: 12,
                            background: online
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)'
                                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
                            border: `1px solid ${online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.25)'}`,
                            height: '100%',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <ClockCircleOutlined style={{ fontSize: 12, color: 'var(--ink-500)' }} />
                            <span style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Realtime · Redis
                            </span>
                            {protocolBadge && (
                                <Tooltip
                                    title={<div style={{ whiteSpace: 'pre-line', lineHeight: 1.55 }}>{protocolBadge.tooltip}</div>}
                                    placement="bottomLeft"
                                >
                                    <Tag
                                        color={protocolBadge.color}
                                        style={{
                                            margin: 0, marginLeft: 4, fontSize: 10,
                                            padding: '0 6px', lineHeight: '18px',
                                            cursor: 'help',
                                        }}
                                    >
                                        {protocolBadge.text}
                                    </Tag>
                                </Tooltip>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span
                                style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: online ? '#10b981' : '#ef4444',
                                    boxShadow: online ? '0 0 0 4px rgba(16,185,129,0.18)' : '0 0 0 4px rgba(239,68,68,0.18)',
                                    animation: online ? 'pulse-dot 2s infinite' : 'none',
                                }}
                            />
                            <span style={{ fontSize: 18, fontWeight: 700, color: online ? '#10b981' : '#ef4444' }}>
                                {online ? '在线' : '离线'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'var(--ink-500)' }}>
                            <div>
                                <div style={{ marginBottom: 2 }}>上次心跳</div>
                                <div style={{ color: 'var(--ink-900)', fontSize: 13, fontWeight: 600 }}>
                                    {lastBeatAbs}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>{lastBeatRel}</div>
                            </div>
                            <div>
                                <div style={{ marginBottom: 2 }}>TTL 倒计时</div>
                                <div style={{ color: ttlColor, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                    {online ? `${ttlRemain}s` : '已过期'}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>
                                    {online ? 'redis EX 300' : '—'}
                                </div>
                            </div>
                        </div>
                        {/* 空状态说明: redis 无 heartbeat key 时, 按 protocol 区分文案 */}
                        {!online && !realtime?.lastHeartbeatAt && (
                            <div style={{
                                marginTop: 10,
                                padding: '8px 10px',
                                borderRadius: 8,
                                background: 'rgba(100, 116, 139, 0.08)',
                                border: '1px solid rgba(100, 116, 139, 0.15)',
                                fontSize: 11,
                                color: 'var(--ink-500)',
                                lineHeight: 1.5,
                            }}>
                                {lastProtocol === 'reline' ? (
                                    <>
                                        DTU 直连设备不走 PESIV 5min heartbeat 通道,
                                        <code style={{ fontSize: 10 }}>heartbeat:{mac}</code> 永不存在 (预期行为)。
                                        设备实际在线情况请看 §2 状态历史 + 设备数据上报。
                                    </>
                                ) : lastProtocol === 'Pesiv卡' || lastProtocol === 'pesiv' ? (
                                    <>
                                        PESIV 设备未上 PESIV 网,redis 无 <code style={{ fontSize: 10 }}>heartbeat:{mac}</code> key。
                                        检查设备网卡 / SIM 卡 / PESIV 节点覆盖。
                                    </>
                                ) : (
                                    <>
                                        设备未上 PESIV 网,无实时心跳 (redis 无 <code style={{ fontSize: 10 }}>heartbeat:{mac}</code> key)
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* §2 transitions 状态历史 (span 8) */}
                <div style={{ gridColumn: 'span 8', minWidth: 0 }}>
                    <div
                        style={{
                            padding: 16, borderRadius: 12,
                            background: 'rgba(248, 250, 252, 0.7)',
                            border: '1px solid var(--ink-100)',
                            height: '100%',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <HistoryOutlined style={{ fontSize: 12, color: 'var(--ink-500)' }} />
                            <span style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Status History · log.terminalEvents (近 20 条 / 30d)
                            </span>
                        </div>
                        {!data ? (
                            <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                <Spin size="small" /> <span style={{ fontSize: 11, color: 'var(--ink-500)', marginLeft: 8 }}>加载状态历史...</span>
                            </div>
                        ) : data.transitions.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期无状态翻转" style={{ margin: '12px 0' }} />
                        ) : (
                            <div style={{ maxHeight: 200, overflowY: 'auto', margin: '0 -4px' }}>
                                {data?.transitions.map((t, idx) => {
                                    const isConnect = t.kind === 'TERMINAL_CONNECT'
                                    const color = isConnect ? '#10b981' : '#ef4444'
                                    return (
                                        <div
                                            key={`${t.at}-${idx}`}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                                padding: '6px 4px',
                                                borderBottom: idx < (data.transitions.length - 1) ? '1px solid var(--ink-100)' : 'none',
                                            }}
                                        >
                                            {isConnect ? (
                                                <CheckCircleFilled style={{ color, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                                            ) : (
                                                <CloseCircleFilled style={{ color, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                                            )}
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Tag color={isConnect ? 'green' : 'red'} style={{ margin: 0, fontSize: 10, padding: '0 6px', lineHeight: '18px' }}>
                                                        {isConnect ? 'CONNECT' : 'OFFLINE'}
                                                    </Tag>
                                                    <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--ink-700)' }}>
                                                        {dayjs(t.at).format('MM-DD HH:mm:ss')}
                                                    </span>
                                                    {t.nodeName && (
                                                        <span style={{ fontSize: 10, color: 'var(--ink-500)' }}>
                                                            · {t.nodeName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {summarizeTransition(t) || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* row2: samples 全宽 (12 col design) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
                <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
                    <div
                        style={{
                            padding: 16, borderRadius: 12,
                            background: 'rgba(248, 250, 252, 0.7)',
                            border: '1px solid var(--ink-100)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <LineChartOutlined style={{ fontSize: 12, color: 'var(--ink-500)' }} />
                            <span style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Long-term Heartbeat · log.heartbeats (近 20 条 / 5min 颗粒度 / 7d)
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-500)' }}>
                                {samplesSorted.length > 0 && (
                                    <Tooltip title="X: 5min 采样点时间 · Y: 该采样距当前的秒数 (越小=心跳越近)">
                                        <span>{samplesSorted.length} 个采样点</span>
                                    </Tooltip>
                                )}
                            </span>
                        </div>
                        {!data ? (
                            <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                <Spin size="small" /> <span style={{ fontSize: 11, color: 'var(--ink-500)', marginLeft: 8 }}>加载降频采样...</span>
                            </div>
                        ) : data.samples.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近 7d 无降频采样 (设备未上 PESIV 网)" style={{ margin: '12px 0' }} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
                                <Sparkline
                                    samples={samplesSorted.map(s => ({
                                        at: new Date(s.at).getTime(),
                                        // y = 该采样距 tickNow 的秒数 (越小=心跳越新)
                                        y: Math.max(0, Math.floor((tickNow - new Date(s.at).getTime()) / 1000)),
                                    }))}
                                />
                                <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                                    {data?.samples.slice(0, 8).map((s, idx) => {
                                        const ageSec = Math.floor((tickNow - new Date(s.at).getTime()) / 1000)
                                        return (
                                            <div
                                                key={`${s.at}-${idx}`}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', gap: 8,
                                                    fontSize: 11, padding: '3px 0',
                                                    borderBottom: idx < 7 ? '1px solid var(--ink-100)' : 'none',
                                                }}
                                            >
                                                <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--ink-700)' }}>
                                                    {dayjs(s.at).format('MM-DD HH:mm')}
                                                </span>
                                                <span style={{ color: ageSec < 60 ? '#10b981' : ageSec < 300 ? '#f59e0b' : 'var(--ink-500)', fontFamily: 'ui-monospace, monospace' }}>
                                                    {ageSec < 60 ? '刚刚' : `${Math.floor(ageSec / 60)}m 前`}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// 轻量 sparkline SVG (不引 recharts) — 折线 + 圆点 + 渐变填充
interface SparkPoint { at: number; y: number }
function Sparkline({ samples }: { samples: SparkPoint[] }) {
    if (samples.length === 0) return null
    const W = 600
    const H = 120
    const padX = 8
    const padY = 12
    const xs = samples.map(s => s.at)
    const ys = samples.map(s => s.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const xRange = xMax - xMin || 1
    const yMax = Math.max(...ys, 1)
    const yMin = 0
    const yRange = yMax - yMin || 1
    const toX = (t: number) => padX + ((t - xMin) / xRange) * (W - 2 * padX)
    const toY = (v: number) => padY + (1 - (v - yMin) / yRange) * (H - 2 * padY)
    const linePath = samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.at).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L${toX(xMax).toFixed(1)},${H - padY} L${toX(xMin).toFixed(1)},${H - padY} Z`
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
            <defs>
                <linearGradient id="hbArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#hbArea)" />
            <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {samples.map((p, i) => (
                <circle key={i} cx={toX(p.at)} cy={toY(p.y)} r="3" fill="#8b5cf6" />
            ))}
        </svg>
    )
}

export default HeartbeatPanel
