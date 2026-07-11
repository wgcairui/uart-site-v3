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
            <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
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
