'use client'

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Alert } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { IconFont, devTypeIcon } from "@/components/common/IconFont";
import { BindDev } from "@/lib/api/fetch";
import { useNav } from "@/lib/hooks/useNav";
import { subscribeEvent, unSubscribeEvent } from "@/lib/socket";
import { UserDropDown } from "@/components/common/UserDropdown";
import { useToken } from "@/lib/hooks/useToken";
import { clearSimulateToken } from "@/lib/utils/token";
import { AbsButton } from "@/components/layout/AbsButton";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageTransition } from "@/components/common/PageTransition";

function TokenSync() {
    useToken()
    return null
}

export default function UserLayout({ children }: { children: React.ReactNode }) {

    const nav = useNav()
    const router = useRouter()
    const pathname = usePathname()
    const isSimulated = useUserStore(s => s.isSimulated)

    useEffect(() => {
        if (sessionStorage.getItem('simulated') === 'true') {
            useUserStore.getState().setSimulated(true)
        }
    }, [])

    const [terminals, setTer] = useState<Uart.Terminal[]>([])

    const getBind = async (log?: string) => {
        console.log({ date: dayjs().format('H:m:s:sss'), log });
        const result = await BindDev()
        const uts = (result.data?.UTs || []) as Uart.Terminal[]
        setTer([...uts])
    }

    useEffect(() => {
        getBind()
    }, [])

    useEffect(() => {
        useUserStore.getState().setTerminals(terminals)
    }, [terminals])

    useEffect(() => {
        const lists: { event: string, pid: number }[] = []
        terminals.forEach(el => {
            const event = "MacUpdate" + el.DevMac
            const pid = subscribeEvent(event, () => getBind(`获取设备更新推送:${el.DevMac}`))
            lists.push({ event, pid })
        })
        return () => {
            lists.forEach(({ event, pid }) => {
                unSubscribeEvent(event, pid)
            })
        }
    }, [terminals])

    const uts = useMemo(() => {
        return terminals
            .map(el => (el.mountDevs || []).map(el2 => ({ ...el2, online: el.online, mac: el.DevMac, name: el.name }))).flat()
    }, [terminals])

    return (
        <ErrorBoundary>
        <main style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
<Suspense fallback={null}><TokenSync /></Suspense>

            {/* Topbar */}
            <header className="app-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                    <BrandLogo href="/main" />
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link
                            href="/main"
                            className={`app-topbar-menu-item ${pathname === '/main' ? 'active' : ''}`}
                        >
                            <IconFont type="icon-changjingguanli" /> 所有设备
                        </Link>
                        <a
                            onClick={() => nav('/main/alarm')}
                            className={`app-topbar-menu-item ${pathname?.startsWith('/main/alarm') ? 'active' : ''}`}
                        >
                            <IconFont type="icon-tixingshixin" /> 告警管理
                        </a>
                        <a
                            onClick={() => nav('/main/user')}
                            className={`app-topbar-menu-item ${pathname?.startsWith('/main/user') ? 'active' : ''}`}
                        >
                            用户信息
                        </a>
                    </nav>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserDropDown userPage="/main/user" />
                </div>
            </header>

            {/* 模拟登录提示 */}
            {isSimulated && (
                <Alert
                    title="模拟登录模式 - 当前以管理员身份登录用户账号"
                    type="warning"
                    showIcon
                    closable
                    style={{ margin: '12px 32px 0', borderRadius: 12 }}
                    onClose={() => {
                        clearSimulateToken()
                        sessionStorage.removeItem('simulated')
                        useUserStore.getState().setSimulated(false)
                        router.push('/admin')
                    }}
                />
            )}

            {/* 主内容 */}
            <main className="scroll-area" style={{ flex: 1, position: 'relative' }}>
                <PageTransition>{children}</PageTransition>
                <AbsButton>
                    <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                            我的设备
                        </div>
                        {uts.map((el, key) => (
                            <Link
                                key={key}
                                href={`/main/dev/${el.mac}${el.pid}`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px', borderRadius: 8, fontSize: 13,
                                    color: 'var(--ink-700)', textDecoration: 'none',
                                }}
                            >
                                {devTypeIcon[el.Type]}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {el.name}-{el.mountDev}-{el.pid}
                                </span>
                            </Link>
                        ))}
                    </div>
                </AbsButton>
            </main>
        </main>
        </ErrorBoundary>
    )
}