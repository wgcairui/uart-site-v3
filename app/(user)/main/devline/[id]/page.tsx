'use client'

import { ApartmentOutlined, HomeOutlined } from "@ant-design/icons";
import { Breadcrumb, Card, Empty, Spin } from "antd";
import React, { Suspense, useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { useSearchParams } from "next/navigation";
import { devTypeIcon } from "@/components/IconFont";
import { TerminalMountDevNameLine } from "@/components/TerminalMountDevNameLine";

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

    return (
        (!terminal || !mountDev) ? <Empty />
            : <>
                <Breadcrumb>
                    <Breadcrumb.Item href="/">
                        <HomeOutlined />
                    </Breadcrumb.Item>
                    <Breadcrumb.Item href={'/main/terminal/' + terminal?.DevMac}>
                        <ApartmentOutlined />
                        <span>{terminal?.name}</span>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item href={'/main/dev/' + id}>
                        {mountDev ? devTypeIcon[mountDev!.Type] : <Spin />}
                        <span>{mountDev?.mountDev || ''}</span>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        {search.get("name") || ''}
                    </Breadcrumb.Item>
                </Breadcrumb>
                <Card>
                    <TerminalMountDevNameLine mac={terminal.DevMac} pid={mountDev.pid} name={search.get("name") || ''}></TerminalMountDevNameLine>
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
