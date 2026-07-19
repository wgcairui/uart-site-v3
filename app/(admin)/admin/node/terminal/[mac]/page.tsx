'use client'

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spin, Tabs } from "antd";
import { usePromise } from "@/lib/hooks/usePromise";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { TerminalCurData, TerminalHistoryData } from "./TerminalDataTab";
import { DeviceActions } from "@/components/common/DeviceActions";
import { TerminalOverview } from "@/components/terminal/TerminalOverview";
import { MountDevicesStrip } from "@/components/terminal/MountDevicesStrip";
import { BindUsersSection } from "@/components/terminal/BindUsersSection";
import { DeviceLiveStream } from "@/components/common/DeviceLiveStream";
import { DebugConsole } from "@/components/terminal/DebugConsole";
import { MonitorCenter } from "@/components/log/MonitorCenter";
import { AutomationCenter } from "@/components/terminal/AutomationCenter";

function TerminalDetailPageInner() {
    const params = useParams();
    const router = useRouter();
    const mac = params.mac as string;

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getTerminal(mac);
        return data;
    }, undefined, [mac]);

    const ter = useTerminalUpdate([mac]);

    useEffect(() => {
        if (ter.data) fecth();
    }, [ter.data]);

    // mount device sub-tabs (设备详情/当前数据/历史数据)
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

                    {/* ─── device hero 紫渐变 ─── */}
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

                    {/* ─── 2. Overview + Actions ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
                        <div style={{ gridColumn: 'span 8', minHeight: 360 }}>
                            <TerminalOverview terminal={data} onChange={fecth} />
                        </div>
                        <div style={{ gridColumn: 'span 4', minHeight: 360 }}>
                            <DeviceActions terminal={data} onChange={fecth} />
                        </div>
                    </div>

                    {/* Mount Devices + Bind Users (保持不变) */}
                    <div style={{ marginBottom: 20 }}>
                        <MountDevicesStrip mac={data.DevMac} mountDevs={data.mountDevs || []} onChange={fecth} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <BindUsersSection
                            mac={data.DevMac}
                            share={!!data.share}
                            ownerId={(data as any)?.ownerId}
                            onChange={fecth}
                        />
                    </div>

                    {/* ─── 3. 实时回包流 (sticky 顶部, 共享所有操作) ─── */}
                    <DeviceLiveStream key={data.DevMac} mac={data.DevMac} />

                    {/* ─── 4. 调试中心 (AT + 指令) ─── */}
                    <div style={{ marginBottom: 20 }}>
                        <DebugConsole mac={data.DevMac} />
                    </div>

                    {/* ─── 5. 监控中心 (告警 + 通信 + 时间线 + 日志) ─── */}
                    <div style={{ marginBottom: 20 }}>
                        <MonitorCenter mac={data.DevMac} />
                    </div>

                    {/* ─── 6. 自动化中心 (定时操作) ─── */}
                    <div style={{ marginBottom: 20 }}>
                        <AutomationCenter mac={data.DevMac} />
                    </div>

                    {/* ─── 7. Mount Device Tabs (设备详情/当前数据/历史数据) ─── */}
                    {mountDevTabs.length > 0 && (
                        <div className="bento-card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--ink-700)' }}>
                                挂载设备详情
                            </div>
                            <Tabs items={mountDevTabs} />
                        </div>
                    )}
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
