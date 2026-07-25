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
    const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

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

            {/* Topbar — 2026-07-25: 锁 375px 宽, 跟 user-content-frame 对齐 (pear.us/cai mobile-first pattern)
                - BrandLogo 极简化: 只显示 U 方块 + "UART" 文字 (去掉 "IoT Management" 副标题, 节省宽度)
                - 3 个 nav item 永远隐藏 (走 hamburger drawer), 不再 desktop 显示 inline
                - "使用教程" link 也移到 drawer, 避免 topbar 文字被压成 2 行
                - 右侧: hamburger + UserDropDown (头像)
            */}
            <header className="app-topbar app-topbar-user">
                {/* BrandLogo 默认带 padding: 16px 24px (admin 端用), 这里 -24px 左右抵消对齐 topbar padding */}
                <div style={{ marginLeft: -24, marginRight: -16 }}>
                    <BrandLogo href="/main" showSubtitle={false} size={32} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        className="user-topbar-hamburger"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="菜单"
                    >
                        <IconFont type="icon-changjingguanli" />
                    </button>
                    <UserDropDown userPage="/main/userinfo" />
                </div>
            </header>

            {/* 移动端菜单抽屉 */}
            {mobileNavOpen && (
                <>
                    <div
                        className="user-mobile-drawer-mask"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div className="user-mobile-drawer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>菜单</span>
                            <button
                                onClick={() => setMobileNavOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-700)' }}
                            >×</button>
                        </div>
                        <Link
                            href="/main"
                            onClick={() => setMobileNavOpen(false)}
                            className={`app-topbar-menu-item ${pathname === '/main' ? 'active' : ''}`}
                            style={{ padding: '12px 14px' }}
                        >
                            <IconFont type="icon-changjingguanli" /> 所有设备
                        </Link>
                        <a
                            onClick={() => { setMobileNavOpen(false); nav('/main/alarm') }}
                            className={`app-topbar-menu-item ${pathname?.startsWith('/main/alarm') ? 'active' : ''}`}
                            style={{ padding: '12px 14px' }}
                        >
                            <IconFont type="icon-tixingshixin" /> 告警管理
                        </a>
                        <a
                            onClick={() => { setMobileNavOpen(false); nav('/main/userinfo') }}
                            className={`app-topbar-menu-item ${pathname?.startsWith('/main/userinfo') ? 'active' : ''}`}
                            style={{ padding: '12px 14px' }}
                        >
                            用户信息
                        </a>
                        {/* 2026-07-25: 使用教程从 topbar 移进 drawer, 节省 topbar 宽度 */}
                        <a
                            href="https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/docs/ladisuart/tutorial-v2.5.pdf"
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setMobileNavOpen(false)}
                            className="app-topbar-menu-item"
                            style={{ padding: '12px 14px' }}
                        >
                            📖 使用教程
                        </a>
                    </div>
                </>
            )}

            {/* 模拟登录提示 — 2026-07-25: 移进 user-content-frame, 跟主内容一起 375px 居中 */}
            {isSimulated && (
                <div className="user-content-frame" style={{ paddingTop: 12, paddingBottom: 0 }}>
                    <Alert
                        title="模拟登录模式 - 当前以管理员身份登录用户账号"
                        type="warning"
                        showIcon
                        closable
                        style={{ borderRadius: 12 }}
                        onClose={() => {
                            clearSimulateToken()
                            sessionStorage.removeItem('simulated')
                            useUserStore.getState().setSimulated(false)
                            router.push('/admin')
                        }}
                    />
                </div>
            )}

            {/* 主内容 - 375px 锁定宽度容器 (mobile-first, desktop 居中) */}
            <main className="scroll-area" style={{ flex: 1, position: 'relative' }}>
                <div className="user-content-frame">
                    <PageTransition>{children}</PageTransition>
                </div>
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