'use client'

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { Empty, Dropdown, Button } from "antd";
import { DownOutlined } from '@ant-design/icons'
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { useNav } from "@/lib/hooks/useNav";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";

export default function Dev() {

    const nav = useNav()
    const params = useParams()
    const id = params.id as string

    const terminals = useUserStore(s => s.terminals)
    const user = useUserStore(s => s.user)

    const [terminal, setTerminal] = useState<Uart.Terminal>()

    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>()

    useEffect(() => {
        const ter = terminals.find(el => RegExp("^" + el.DevMac).test(id || ''))
        if (ter) {
            setTerminal(ter)
            setMountDev(ter.mountDevs.find(el => ter.DevMac + el.pid === id))
        }
    }, [id, terminals])

    return (
        (!terminal || !mountDev) ? <Empty />
            :
            <>
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
                <section style={{ padding: 16 }}>
                    <TerminalDevPage mac={terminal.DevMac} pid={mountDev.pid} {...(user?.user ? { user: user.user } : {})}></TerminalDevPage>
                </section>

            </>
    )
}
