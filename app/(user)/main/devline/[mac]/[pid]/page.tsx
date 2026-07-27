'use client'

import { Empty, Spin } from "antd";
import React, { Suspense, useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { useParams, useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/terminal/TerminalMountDevNameLine";
import { PageHeader } from "@/components/common/PageHeader";
import { BentoCard } from "@/components/common/BentoCard";

function DevLineInner() {

    const terminals = useUserStore(s => s.terminals)

    const [terminal, setTerminal] = useState<Uart.Terminal>()

    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>()

    // Next.js 16: params 改成 Promise，用 useParams() 同步取
    const params = useParams<{ mac: string; pid: string }>()
    const { mac, pid } = params

    useEffect(() => {
        const ter = terminals.find(el => el.DevMac === mac)
        if (ter) {
            setTerminal(ter)
            setMountDev(ter.mountDevs.find(el => el.pid === Number(pid)))
        }
    }, [mac, pid, terminals])

    const search = useSearchParams()
    const dataName = search.get("name") || ''

    // 移动端 detection: < 768px 缩小 BentoCard 内边距 + PageHeader 缩字号（globals.css 已处理 header）
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    return (
        (!terminal || !mountDev)
            ? <div className="bg-cr-canvas"><Empty className="v3-empty-cr" /></div>
            : <div className="bg-cr-canvas">
                <PageHeader
                    theme="control-room"
                    title={dataName ? `${mountDev.mountDev} - ${dataName}` : mountDev.mountDev}
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: terminal.name, href: `/main/terminal/${terminal.DevMac}` },
                        // dev 页面仍是旧 [id] 格式（独立处理，不在此处 refactor）
                        { title: mountDev.mountDev, href: `/main/dev/${mac}${pid}` },
                    ]}
                />
                <BentoCard
                    theme="control-room"
                    style={{ marginTop: 16, padding: isMobile ? 12 : undefined }}
                    padding="sm"
                >
                    <TerminalMountDevNameLine mac={terminal.DevMac} pid={mountDev.pid} name={dataName}></TerminalMountDevNameLine>
                </BentoCard>
            </div>
    )
}

export default function DevLine() {
    return (
        <Suspense fallback={<Spin />}>
            <DevLineInner />
        </Suspense>
    )
}
