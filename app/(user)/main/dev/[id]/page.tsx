'use client'

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { Breadcrumb, Empty, Dropdown, Button, Menu } from "antd";
import { ApartmentOutlined, DownOutlined, HomeOutlined } from '@ant-design/icons';
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { useNav } from "@/lib/hooks/useNav";

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
                <Breadcrumb
                    items={[
                        { title: <HomeOutlined /> },
                        {
                            title: (
                                <Dropdown menu={{
                                    items: terminals.map(({ DevMac, name }) => ({
                                        key: DevMac,
                                        label: <Button type="link" onClick={() => nav('/main/terminal/' + DevMac)}>{name}</Button>
                                    }))
                                }}>
                                    <a onClick={e => e.preventDefault()}>
                                        <ApartmentOutlined style={{ marginRight: 12 }} />
                                        {terminal.name}
                                        <DownOutlined />
                                    </a>
                                </Dropdown>
                            )
                        },
                        {
                            title: (
                                <Dropdown menu={{
                                    items: terminal.mountDevs.map(({ mountDev, pid }) => ({
                                        key: pid,
                                        label: <Button type="link" onClick={() => nav('/main/dev/' + terminal.DevMac + pid)}>{mountDev}</Button>
                                    }))
                                }}>
                                    <a onClick={e => e.preventDefault()}>
                                        {mountDev?.mountDev}
                                        <DownOutlined />
                                    </a>
                                </Dropdown>
                            )
                        },
                    ]}
                />
                <section style={{ padding: 16 }}>
                    <TerminalDevPage mac={terminal.DevMac} pid={mountDev.pid} {...(user?.user ? { user: user.user } : {})}></TerminalDevPage>
                </section>

            </>
    )
}
