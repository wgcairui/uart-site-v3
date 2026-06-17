'use client'

import { Card, Empty, Spin } from "antd";
import React, { Suspense, useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/terminal/TerminalMountDevNameLine";
import { PageHeader } from "@/components/common/PageHeader";

function DevLineInner({ params }: { params: { id: string } }) {

    const terminals = useUserStore(s => s.terminals)

    const [terminal, setTerminal] = useState<Uart.Terminal>()

    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>()

    /**
     * 设备id
     */
    const { id } = params

    useEffect(() => {
        const ter = terminals.find(el => RegExp("^" + el.DevMac).test(id || ''))
        if (ter) {
            setTerminal(ter)
            setMountDev(ter.mountDevs.find(el => ter.DevMac + el.pid === id))
        }
    }, [id, terminals])

    const search = useSearchParams()
    const dataName = search.get("name") || ''

    return (
        (!terminal || !mountDev) ? <Empty />
            : <>
                <PageHeader
                    title={dataName ? `${mountDev.mountDev} - ${dataName}` : mountDev.mountDev}
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: terminal.name, href: `/main/terminal/${terminal.DevMac}` },
                        { title: mountDev.mountDev, href: `/main/dev/${id}` },
                    ]}
                />
                <Card>
                    <TerminalMountDevNameLine mac={terminal.DevMac} pid={mountDev.pid} name={dataName}></TerminalMountDevNameLine>
                </Card>
            </>
    )
}

export default function DevLine(props: { params: { id: string } }) {
    return (
        <Suspense fallback={<Spin />}>
            <DevLineInner {...props} />
        </Suspense>
    )
}
