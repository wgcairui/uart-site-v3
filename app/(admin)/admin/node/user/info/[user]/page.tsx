'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePromise } from "@/lib/hooks/usePromise";
import { BindDev, getUser, simulateLogin } from "@/lib/api/fetchRoot"
import { Spin, Tabs, message } from "antd";
import { UserAlarmPage } from "@/components/data/UserAlarmPage";
import { UserLog } from "@/components/log/UserLog";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalAT } from "@/components/terminal/TerminalAT";
import { TerminalOprate } from "@/components/terminal/TerminalOprate";
import { AdminScheduledOpTab } from "@/components/terminal/AdminScheduledOpTab";
import { TerminalRunLog } from "@/components/terminal/TerminalRunLog";
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/data/devRealTimeLog";
import { SmsStatsChart } from "@/components/chart/SmsStatsChart";
import { MailStatsChart } from "@/components/chart/MailStatsChart";
import { LoginLogTab } from "@/components/log/LoginLogTab";
import { RequestLogTab } from "@/components/log/RequestLogTab";
import { MigrateUserResourcesModal } from "@/components/admin/MigrateUserResourcesModal";
import { UserOverview } from "@/components/user/UserOverview";
import { UserActions } from "@/components/user/UserActions";
import { BoundTerminalsStrip } from "@/components/user/BoundTerminalsStrip";

interface TerminalInfosProps {
    mac: string;
}

const TerminalInfos: React.FC<TerminalInfosProps> = ({ mac }) => {
    const { data, loading, setData, fecth } = usePromise(async () => {
        const { data } = await getTerminal(mac);
        return data;
    });

    const ter = useTerminalUpdate([mac]);

    useEffect(() => {
        if (ter.data) {
            setData(ter.data);
        }
    }, [ter.data]);

    return loading ? (
        <Spin />
    ) : !data ? (
        <div style={{ textAlign: "center", padding: 50 }}>找不到该终端的数据</div>
    ) : (
        <Tabs items={[
            { key: 'info', label: '设备信息', children: <div style={{ padding: 16, color: 'var(--ink-700)' }}>设备 {data.name || data.DevMac} · 详细管理见上方"绑定设备"区</div> },
            { key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
            { key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
            { key: 'scheduled-op', label: '定时操作', children: <AdminScheduledOpTab mac={data.DevMac} /> },
            { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
            { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac}></TerminalRunLog> },
            ...(data.mountDevs
                ? data.mountDevs.map((dev) => ({
                    key: dev.mountDev + dev.pid,
                    label: dev.mountDev + dev.pid,
                    children: <TerminalDevPage mac={data.DevMac} pid={dev.pid}></TerminalDevPage>,
                }))
                : []),
        ]} />
    );
};

function UserInfoInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const user = params.user as string;

    const [activeKey, setActiveKey] = useState(searchParams.get('tab') || 'alarm');
    const [migrateOpen, setMigrateOpen] = useState(false);

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

    // 监听 UserActions 派发的资源迁移事件
    useEffect(() => {
        const handler = () => setMigrateOpen(true)
        window.addEventListener('user-page:open-migrate', handler as EventListener)
        return () => window.removeEventListener('user-page:open-migrate', handler as EventListener)
    }, [])

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getUser(user)
        return data
    }, undefined, [user])

    const bindUts = usePromise(async () => {
        const { data } = await BindDev(user)
        return (data?.UTs || []) as any as Uart.Terminal[]
    }, [], [user])

    const refreshAll = useCallback(() => {
        bindUts.fecth && bindUts.fecth()
        fecth()
    }, [bindUts.fecth, fecth])

    const baseTabs = useMemo(() => {
        if (!data) return []
        return [
            { key: 'alarm', label: '告警设置', children: <UserAlarmPage user={data.user} /> },
            { key: 'log', label: '操作日志', children: <UserLog user={data.user} /> },
            { key: 'sms-stats', label: '短信消耗', children: <SmsStatsChart user={data.user} /> },
            { key: 'mail-stats', label: '邮件消耗', children: <MailStatsChart user={data.user} /> },
            { key: 'login-log', label: '登录日志', children: <LoginLogTab user={data.user} /> },
            { key: 'request-log', label: '请求日志', children: <RequestLogTab user={data.user} /> },
        ]
    }, [data?.user])

    const terminalTabs = useMemo(() => {
        return (bindUts.data || []).map(ter => ({
            key: ter.DevMac,
            label: ter.name || ter.DevMac,
            children: <TerminalInfos mac={ter.DevMac} />,
        }))
    }, [bindUts.data])

    const tabs = useMemo(() => [...baseTabs, ...terminalTabs], [baseTabs, terminalTabs])

    return (
        loading ? (
            <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
            </div>
        ) : !data ? (
            <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>
                找不到该用户的数据
            </div>
        ) : (
            <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
                {/* ─── 1. 薄导航条 (返回 + 面包屑, 标题让给 hero) ─── */}
                <nav
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 12, color: 'var(--ink-500)',
                        marginBottom: 12,
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    <a
                        onClick={() => router.back()}
                        style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
                    >
                        ← 返回
                    </a>
                    <span style={{ color: 'var(--ink-300)' }}>/</span>
                    <a
                        onClick={() => router.push('/admin')}
                        style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
                    >
                        首页
                    </a>
                    <span style={{ color: 'var(--ink-300)' }}>/</span>
                    <a
                        onClick={() => router.push('/admin/node/user')}
                        style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
                    >
                        用户
                    </a>
                    <span style={{ color: 'var(--ink-300)' }}>/</span>
                    <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>{data.user}</span>
                </nav>

                {/* ─── 2. user hero 紫渐变 (跟 terminal hero 视觉对齐) ─── */}
                <div
                    className="bento-card v3-user-hero"
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
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div
                            style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: data.avanter
                                    ? `url(${data.avanter}) center/cover`
                                    : 'linear-gradient(135deg, var(--accent-400) 0%, #f472b6 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 22, fontWeight: 600,
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                flexShrink: 0,
                            }}
                        >
                            {!data.avanter && (data.name || data.user || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3 }}>
                                {data.name || data.user}
                            </h2>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                                {data.user} · {data.userGroup || 'user'} · {data.mail || '-'} · {data.tel || '-'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {data.status !== false ? (
                                <span
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '5px 12px', borderRadius: 999,
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#86efac',
                                        fontSize: 12, fontWeight: 600,
                                    }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac', animation: 'pulse-dot 2s infinite' }} />
                                    正常
                                </span>
                            ) : (
                                <span
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '5px 12px', borderRadius: 999,
                                        background: 'rgba(244, 63, 94, 0.2)',
                                        border: '1px solid rgba(244, 63, 94, 0.3)',
                                        color: '#fda4af',
                                        fontSize: 12, fontWeight: 600,
                                    }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fda4af' }} />
                                    停用
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* v3 hybrid Page B · 8+4: UserOverview KV 17 (8 列) + UserActions 4 列 */}
                <div className="user-detail-grid">
                    <div style={{ minHeight: 360 }}>
                        <UserOverview user={data} onChange={fecth} />
                    </div>
                    <div style={{ minHeight: 360 }}>
                        <UserActions user={data} onChange={fecth} />
                    </div>
                </div>

                {/* 绑定设备 (替代原「挂载设备」tab) */}
                <div style={{ marginBottom: 20 }}>
                    <BoundTerminalsStrip user={data.user} onChange={refreshAll} />
                </div>

                <div className="bento-card" style={{ padding: 24 }}>
                    <Tabs
                        activeKey={activeKey}
                        onChange={handleTabChange}
                        items={tabs}
                    />
                </div>

                <MigrateUserResourcesModal
                    visible={migrateOpen}
                    fromUser={data.user}
                    onCancel={() => setMigrateOpen(false)}
                    onSuccess={() => {
                        fecth()
                    }}
                />
            </div>
        )
    )
}

export default function UserInfo() {
    return (
        <Suspense fallback={<Spin />}>
            <UserInfoInner />
        </Suspense>
    )
}
