'use client'

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spin, Tabs } from "antd";
import { usePromise } from "@/lib/hooks/usePromise";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalAT } from "@/components/terminal/TerminalAT";
import { TerminalOprate } from "@/components/terminal/TerminalOprate";
import { TerminalRunLog } from "@/components/terminal/TerminalRunLog";
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { LogTerminal } from "@/components/log/LogTerminal";
import { AlarmLogTab } from "@/components/log/AlarmLogTab";
import { TerminalTimelineTab } from "@/components/log/TerminalTimelineTab";
import { AdminScheduledOpTab } from "@/components/terminal/AdminScheduledOpTab";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/data/devRealTimeLog";
import { TerminalCurData, TerminalHistoryData } from "./TerminalDataTab";
import { DeviceActions } from "@/components/common/DeviceActions";
import { TerminalOverview } from "@/components/terminal/TerminalOverview";
import { MountDevicesStrip } from "@/components/terminal/MountDevicesStrip";
import { BindUsersSection } from "@/components/terminal/BindUsersSection";

function TerminalDetailPageInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mac = params.mac as string;

    const [activeKey, setActiveKey] = useState(searchParams.get('tab') || 'at');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveKey(tab);
    }, [searchParams]);

    const handleTabChange = useCallback((key: string) => {
        setActiveKey(key);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.pushState({}, '', url.toString());
    }, []);

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getTerminal(mac);
        return data;
    }, undefined, [mac]);

    const ter = useTerminalUpdate([mac]);

    useEffect(() => {
        if (ter.data) fecth();
    }, [ter.data]);

    const baseTabs = data ? [
        { key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
        { key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
        { key: 'scheduled-op', label: '定时操作', children: <AdminScheduledOpTab mac={data.DevMac} /> },
        { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
        { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac} /> },
        { key: 'terminalLog', label: '设备通信日志', children: <LogTerminal mac={data.DevMac} /> },
        { key: 'alarm', label: '告警日志', children: <AlarmLogTab mac={data.DevMac} /> },
        { key: 'timeline', label: '时间线', children: <TerminalTimelineTab mac={data.DevMac} /> },
    ] : [];

    const mountDevTabs = data ? (data.mountDevs || []).map((dev: any) => ({
        key: String(dev.pid),
        label: `${dev.mountDev} (${dev.pid})`,
        children: <Tabs items={[
            { key: 'detail', label: '设备详情', children: <TerminalDevPage mac={data.DevMac} pid={dev.pid} /> },
            { key: 'cur', label: '当前数据', children: <TerminalCurData mac={data.DevMac} pid={dev.pid} /> },
            { key: 'his', label: '历史数据', children: <TerminalHistoryData mac={data.DevMac} pid={dev.pid} /> },
        ]} />,
    })) : [];

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
                    {/* 单个 ← 返回 link (面包屑由 layout AdminHeader 顶栏提供, 避免重复) */}
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

                    {/* ─── 2. device hero 紫渐变 (hybrid Page B 1:1) — 唯一标题源 ─── */}
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
                    {/* v3 hybrid Page B · 设备详情完整 4 区: device hero + overview + actions + mount strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
                        {/* Terminal Overview KV 12 (8 列) · 填掉空 LiveControls 留下的空白 */}
                        <div style={{ gridColumn: 'span 8', minHeight: 360 }}>
                            <TerminalOverview terminal={data} onChange={fecth} />
                        </div>
                        {/* Device Actions 玻璃卡 (4 列) */}
                        <div style={{ gridColumn: 'span 4', minHeight: 360 }}>
                            <DeviceActions mac={data.DevMac} />
                        </div>
                    </div>

                    {/* Mount Devices 完整管理 (含 image/add/delete/refresh/view) · 替代原「挂载设备」tab */}
                    <div style={{ marginBottom: 20 }}>
                        <MountDevicesStrip mac={data.DevMac} mountDevs={data.mountDevs || []} onChange={fecth} />
                    </div>

                    {/* Bind Users 表 · 替代原「绑定用户」tab */}
                    <div style={{ marginBottom: 20 }}>
                        <BindUsersSection
                            mac={data.DevMac}
                            share={!!data.share}
                            ownerId={(data as any)?.ownerId}
                            onChange={fecth}
                        />
                    </div>

                    <div className="bento-card" style={{ padding: 24 }}>
                        <Tabs
                            activeKey={activeKey}
                            onChange={handleTabChange}
                            items={[...baseTabs, ...mountDevTabs]}
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
