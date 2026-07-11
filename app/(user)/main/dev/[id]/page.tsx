'use client'

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { Empty, Dropdown, Button, Tabs, Spin } from "antd";
import { DownOutlined } from '@ant-design/icons'
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { UserScheduledOpTab } from "@/components/terminal/UserScheduledOpTab";
import { useNav } from "@/lib/hooks/useNav";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";

function DevInner() {
    const nav = useNav()
    const params = useParams()
    const searchParams = useSearchParams()
    const id = params.id as string

    const terminals = useUserStore(s => s.terminals)
    const user = useUserStore(s => s.user)

    const [terminal, setTerminal] = useState<Uart.Terminal>()
    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>()

    const [activeKey, setActiveKey] = useState<string>(
        () => searchParams.get('tab') || 'data'
    )

    useEffect(() => {
        const ter = terminals.find(el => RegExp("^" + el.DevMac).test(id || ''))
        if (ter) {
            setTerminal(ter)
            setMountDev(ter.mountDevs.find(el => ter.DevMac + el.pid === id))
        }
    }, [id, terminals])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab) setActiveKey(tab)
    }, [searchParams])

    const handleTabChange = (key: string) => {
        setActiveKey(key)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', key)
        window.history.pushState({}, '', url.toString())
    }

    return (
        (!terminal || !mountDev) ? <Empty />
            :
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
                            <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>{mountDev.mountDev}</h2>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
                                {terminal.DevMac} · 协议: {mountDev.protocol} · PID: {mountDev.pid}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', borderRadius: 999,
                                    background: terminal.online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                    border: `1px solid ${terminal.online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                    color: terminal.online ? '#86efac' : '#fda4af',
                                    fontSize: 13, fontWeight: 600,
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: terminal.online ? '#86efac' : '#fda4af', animation: 'pulse-dot 2s infinite' }} />
                                {terminal.online ? '实时连接' : '离线'}
                            </span>
                        </div>
                    </div>
                </div>
                <PageHeader
                    title={mountDev.mountDev}
                    extra={
                        <Dropdown menu={{
                            items: terminal.mountDevs.map(({ mountDev, pid }) => ({
                                key: String(pid),
                                label: <Button type="link" onClick={() => nav('/main/dev/' + terminal.DevMac + pid)}>{mountDev}</Button>
                            }))
                        }}>
                            <Button>
                                切换设备 <DownOutlined />
                            </Button>
                        </Dropdown>
                    }
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: terminal.name, href: `/main/terminal/${terminal.DevMac}` },
                    ]}
                />
                <PageSummary
                    items={[
                        { label: '设备ID', value: terminal.DevMac, variant: 'primary' },
                        { label: '挂载设备名', value: mountDev.mountDev, variant: 'info' },
                        { label: '协议', value: mountDev.protocol, variant: 'purple' },
                        {
                            label: '网关状态',
                            value: terminal.online ? '在线' : '离线',
                            variant: terminal.online ? 'success' : 'warning',
                        },
                    ]}
                />
                <Tabs
                    activeKey={activeKey}
                    onChange={handleTabChange}
                    items={[
                        {
                            key: 'data',
                            label: '设备数据',
                            children: (
                                <section style={{ padding: 16 }}>
                                    <TerminalDevPage mac={terminal.DevMac} pid={mountDev.pid} {...(user?.user ? { user: user.user } : {})}></TerminalDevPage>
                                </section>
                            ),
                        },
                        {
                            key: 'scheduled-op',
                            label: '定时操作',
                            children: (
                                <section style={{ padding: 16 }}>
                                    <UserScheduledOpTab mac={terminal.DevMac} pid={mountDev.pid} />
                                </section>
                            ),
                        },
                    ]}
                />
            </div>
    )
}

export default function Dev() {
    return (
        <Suspense fallback={<Spin />}>
            <DevInner />
        </Suspense>
    )
}
