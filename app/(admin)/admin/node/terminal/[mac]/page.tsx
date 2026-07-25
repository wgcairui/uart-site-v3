'use client'

import { Suspense, useEffect, useCallback, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Progress, Spin, Tabs } from "antd";
import {
  ThunderboltOutlined,
  AlertOutlined,
  ScheduleOutlined,
  FieldTimeOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { usePromise } from "@/lib/hooks/usePromise";
import { useDashboardStat } from "@/lib/hooks/useDashboardStat";
import { getTerminal } from "@/lib/api/fetch";
import { getAlarmTrend, getDataFreshness } from "@/lib/api/admin-summary/client";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DeviceActions } from "@/components/common/DeviceActions";
import { TerminalOverview } from "@/components/terminal/TerminalOverview";
import { RelatedAssetsSection } from "@/components/terminal/RelatedAssetsSection";
import { DebugConsole } from "@/components/terminal/DebugConsole";
import { MonitorCenter } from "@/components/log/MonitorCenter";
import { AutomationCenter } from "@/components/terminal/AutomationCenter";
import { HeartbeatPanel } from "@/components/terminal/HeartbeatPanel";
import { StatCard } from "@/components/admin/StatCard";
import { MiniSparkline } from "@/components/common/MiniSparkline";
import type { AlarmTrendResp, DataFreshnessResp } from "@/types/admin-summary";

type TabKey = 'debug' | 'monitor' | 'automation'

function TerminalDetailPageInner() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const mac = params.mac as string;

    // 兼容老 URL
    const initTab = (() => {
        const t = searchParams.get('tab')
        if (t === 'monitor' || t === 'alarm' || t === 'terminalLog' || t === 'log' || t === 'timeline') return 'monitor'
        if (t === 'scheduled-op') return 'automation'
        return 'debug'
    })()
    const [tab, setTab] = useState<TabKey>(initTab as TabKey)

    useEffect(() => {
        const t = searchParams.get('tab')
        if (!t) return
        const mapped: TabKey =
            t === 'monitor' || t === 'alarm' || t === 'terminalLog' || t === 'log' || t === 'timeline' ? 'monitor'
            : t === 'scheduled-op' ? 'automation'
            : 'debug'
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTab(mapped)
    }, [searchParams])

    const handleTabChange = useCallback((key: string) => {
        setTab(key as TabKey)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', key)
        window.history.pushState({}, '', url.toString())
    }, [])

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getTerminal(mac);
        return data;
    }, undefined, [mac]);

    const ter = useTerminalUpdate([mac]);

    // W6 · 详情页 KPI 3 张: 7d 告警 / 7d 指令 / 数据新鲜度
    // trial mode 403 → useDashboardStat catch + initValue 兜底,
    // 7d trend 空数组 → MiniSparkline "暂无数据" 兜底
    // W3 fix: useDashboardStat 签名改单层 universalResult, 直接调 BFF client 即可, 无 wrapper.
    const { data: alarmTrend7d } = useDashboardStat<AlarmTrendResp>(
        () => getAlarmTrend(168, 'hour'),
        [],
        [],
    )
    const { data: freshness } = useDashboardStat<DataFreshnessResp>(
        () => getDataFreshness(),
        [],
        { fresh: 0, stale: 0, dead: 0, never: 0, total: 0 },
    )
    // W6 review fix · 详情页客户端 filter (BFF /alarms/trend 暂时不支持 mac param)
    // 短期方案: page 端用 .filter(d => d.mac === mac) 客户端过滤, 值/popover 都走过滤后 data
    // 长期方案: BE 给 getAlarmTrend / getDataFreshness 加 mac param (单独 PR, 不在本 PR 范围)
    // ⚠️ 当前 BFF 响应 AlarmTrendBucket { bucket, critical, warning, info, total } 无 mac 字段,
    //    过滤后 = []. 详情页 trend 值 = 0, popover MiniSparkline 走 "暂无数据" 兜底.
    //    BE 加 mac param 后, 过滤会从 [] 变为实际 per-mac buckets, 全链路自动正确.
    const macFilteredAlarmTrend = useMemo(
        () => (Array.isArray(alarmTrend7d)
            ? alarmTrend7d.filter((b: any) => b.mac === mac)
            : []),
        [alarmTrend7d, mac],
    )
    const totalAlarms7d = useMemo(
        () => (Array.isArray(macFilteredAlarmTrend) ? macFilteredAlarmTrend.reduce((acc, b) => acc + (b.total || 0), 0) : 0),
        [macFilteredAlarmTrend],
    )
    const totalCritical7d = useMemo(
        () => (Array.isArray(macFilteredAlarmTrend) ? macFilteredAlarmTrend.reduce((acc, b) => acc + (b.critical || 0), 0) : 0),
        [macFilteredAlarmTrend],
    )

    useEffect(() => {
        if (ter.data) fecth();
    }, [ter.data]);

    return (
        <>
            {loading ? (
                <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
                    <Spin size="large" />
                </div>
            ) : !data ? (
                <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>
                    找不到该终端的数据
                </div>
            ) : (
                <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
                    {/* ← 返回 */}
                    <a
                        onClick={() => router.back()}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: 'var(--ink-500)',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: 12, cursor: 'pointer',
                        }}
                    >
                        ← 返回
                    </a>

                    {/* §1 device hero 紫渐变 */}
                    <div
                        className="bento-card v3-device-hero"
                        style={{
                            marginBottom: 20,
                            padding: '20px 28px',
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
                            color: '#fff',
                            border: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute', top: -80, right: -80,
                                width: 240, height: 240,
                                background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
                                opacity: 0.4, pointerEvents: 'none',
                            }}
                        />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3 }}>{data.DevMac}</h2>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                                    {data.name} · 协议: {(data as any).protocol ?? '-'} · 节点: {(data as any).NodeName ?? '-'}
                                </div>
                            </div>
                            <span
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '5px 12px', borderRadius: 999,
                                    background: data.online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                    border: `1px solid ${data.online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                    color: data.online ? '#86efac' : '#fda4af',
                                    fontSize: 12, fontWeight: 600,
                                    flexShrink: 0,
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: data.online ? '#86efac' : '#fda4af', animation: 'pulse-dot 2s infinite' }} />
                                {data.online ? '实时连接' : '离线'}
                            </span>
                        </div>
                    </div>

                    {/* §2 Heartbeat 3 层 (实时 / 状态历史 / 长期心跳) — feat/terminal-heartbeat-ui 2026-07-21 ship */}
                    <div style={{ marginBottom: 20 }}>
                        <HeartbeatPanel mac={data.DevMac} />
                    </div>

                    {/* W6 · 详情页 KPI 3 张: 7d 告警 / 7d 指令 / 数据新鲜度
                        插在 HeartbeatPanel 之后, Overview + Actions 之前
                        - 7d 告警 (drilldown, warning) — hover 显示 7d hourly trend sparkline
                        - 7d 指令 (navigate, info)     — 跳到 monitor tab (?tab=monitor) 看命令历史
                        - 数据新鲜度 (drilldown, success) — hover 显示 4 档分桶 sparkline */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 16,
                            marginBottom: 20,
                        }}
                    >
                        <StatCard
                            kind="drilldown"
                            label="7d 告警"
                            value={totalAlarms7d}
                            variant="warning"
                            icon={<AlertOutlined />}
                            data={macFilteredAlarmTrend}
                            trigger="hover"
                            popoverContent={({ data: trend }) => (
                                <div style={{ minWidth: 280 }}>
                                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                                        7d 告警 trend (BFF /alarms/trend 168h hour)
                                    </div>
                                    <MiniSparkline
                                        data={(trend as AlarmTrendResp) ?? []}
                                        color="#f59e0b"
                                        height={60}
                                        width={260}
                                    />
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ink-100)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-500)' }}>
                                        <span>critical {totalCritical7d}</span>
                                        <span>7d 合计 {totalAlarms7d}</span>
                                    </div>
                                </div>
                            )}
                        />
                        <StatCard
                            kind="navigate"
                            label="7d 指令"
                            value="查看"
                            variant="info"
                            icon={<SendOutlined />}
                            extra="跳监控 tab 看命令历史"
                            href={`/admin/node/terminal/${encodeURIComponent(mac)}?tab=monitor`}
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
                                        全系统数据 · per-mac filter 待 BE 支持
                                    </div>
                                </div>
                            )}
                        />
                    </div>

                    {/* §3 Overview + Actions (12-col grid) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
                        <div style={{ gridColumn: 'span 8', minHeight: 360 }}>
                            <TerminalOverview terminal={data} onChange={fecth} />
                        </div>
                        <div style={{ gridColumn: 'span 4', minHeight: 360 }}>
                            <DeviceActions terminal={data} onChange={fecth} />
                        </div>
                    </div>

                    {/* §4 关联资产 (合并挂载设备 + 绑定用户, 6+6 col) */}
                    <div style={{ marginBottom: 20 }}>
                        <RelatedAssetsSection
                            mac={data.DevMac}
                            share={!!data.share}
                            ownerId={(data as any)?.ownerId}
                            mountDevs={data.mountDevs || []}
                            onChange={fecth}
                        />
                    </div>

                    {/* §5 Tabs: 调试 (默认) / 监控 / 自动化 */}
                    <div className="bento-card" style={{ padding: 24, marginBottom: 20 }}>
                        <Tabs
                            activeKey={tab}
                            onChange={handleTabChange}
                            items={[
                                {
                                    key: 'debug',
                                    label: <span><ThunderboltOutlined /> 调试</span>,
                                    children: <DebugConsole mac={data.DevMac} />,
                                },
                                {
                                    key: 'monitor',
                                    label: <span><AlertOutlined /> 监控</span>,
                                    children: <MonitorCenter mac={data.DevMac} />,
                                },
                                {
                                    key: 'automation',
                                    label: <span><ScheduleOutlined /> 自动化</span>,
                                    children: <AutomationCenter mac={data.DevMac} />,
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

export default function TerminalDetailPage() {
    return (
        <Suspense fallback={<Spin />}>
            <TerminalDetailPageInner />
        </Suspense>
    );
}
