'use client'

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import { usePromise } from "@/lib/hooks/usePromise";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalInfo } from "@/components/TerminalInfo";
import { TerminalMountDevs } from "@/components/TerminalMountDevs";
import { TerminalAT } from "@/components/TerminalAT";
import { TerminalOprate } from "@/components/TerminalOprate";
import { TerminalRunLog } from "@/components/TerminalRunLog";
import { TerminalDevPage } from "@/components/TerminalDevPage";
import { LogTerminal } from "@/components/LogTerminal";
import { AlarmLogTab } from "@/components/AlarmLogTab";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/devRealTimeLog";
import { Tabs } from "antd";
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
        { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
        { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac} /> },
        { key: 'terminalLog', label: '设备通信日志', children: <LogTerminal mac={data.DevMac} /> },
        { key: 'alarm', label: '告警日志', children: <AlarmLogTab mac={data.DevMac} /> },
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
        <>
            <h2>{data.DevMac} / {data.name}</h2>
            <Tabs
                activeKey={activeKey}
                onChange={handleTabChange}
                items={[...baseTabs, ...mountDevTabs]}
            />
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
