'use client'

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Spin, Tabs } from "antd";
import { usePromise } from "@/lib/hooks/usePromise";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalInfo } from "@/components/terminal/TerminalInfo";
import { TerminalMountDevs } from "@/components/terminal/TerminalMountDevs";
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

function TerminalDetailPageInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const mac = params.mac as string;

    const [activeKey, setActiveKey] = useState(searchParams.get('tab') || 'info');

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

    if (loading) return <Spin />;
    if (!data) return <div style={{ textAlign: "center", padding: 50 }}>找不到该终端的数据</div>;

    const baseTabs = [
        { key: 'info', label: '详细信息', children: <TerminalInfo terminal={data} ex={true} showTitle={false} /> },
        { key: 'mountDevs', label: '挂载设备', children: <TerminalMountDevs terminal={data} ex={true} showTitle={false} InterValShow onChange={fecth} /> },
        { key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
        { key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
        { key: 'scheduled-op', label: '定时操作', children: <AdminScheduledOpTab mac={data.DevMac} /> },
        { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
        { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac} /> },
        { key: 'terminalLog', label: '设备通信日志', children: <LogTerminal mac={data.DevMac} /> },
        { key: 'alarm', label: '告警日志', children: <AlarmLogTab mac={data.DevMac} /> },
        { key: 'timeline', label: '时间线', children: <TerminalTimelineTab mac={data.DevMac} /> },
    ];

    const mountDevTabs = (data.mountDevs || []).map((dev: any) => ({
        key: String(dev.pid),
        label: `${dev.mountDev} (${dev.pid})`,
        children: <Tabs items={[
            { key: 'detail', label: '设备详情', children: <TerminalDevPage mac={data.DevMac} pid={dev.pid} /> },
            { key: 'cur', label: '当前数据', children: <TerminalCurData mac={data.DevMac} pid={dev.pid} /> },
            { key: 'his', label: '历史数据', children: <TerminalHistoryData mac={data.DevMac} pid={dev.pid} /> },
        ]} />,
    }));

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0, padding: '0 32px 32px' }}>
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
                <div
                    style={{
                        position: 'absolute', top: -80, right: -80,
                        width: 280, height: 280,
                        background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
                        opacity: 0.4, pointerEvents: 'none',
                    }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>{data.DevMac}</h2>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
                            {data.name} · 协议: {(data as any).protocol ?? '-'} · 节点: {(data as any).NodeName ?? '-'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 999,
                                background: data.online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                border: `1px solid ${data.online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                color: data.online ? '#86efac' : '#fda4af',
                                fontSize: 13, fontWeight: 600,
                            }}
                        >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: data.online ? '#86efac' : '#fda4af', animation: 'pulse-dot 2s infinite' }} />
                            {data.online ? '实时连接' : '离线'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="bento-card" style={{ padding: 24 }}>
                <Tabs
                    activeKey={activeKey}
                    onChange={handleTabChange}
                    items={[...baseTabs, ...mountDevTabs]}
                />
            </div>
        </div>
    );
}

export default function TerminalDetailPage() {
    return (
        <Suspense fallback={<Spin />}>
            <TerminalDetailPageInner />
        </Suspense>
    );
}
