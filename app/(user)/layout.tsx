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
        <main style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
<Suspense fallback={null}><TokenSync /></Suspense>

            {/* Topbar — 2026-07-25 Control Room 主题
                - 深色背景 (--cr-bg) + 黄色 accent 边框
                - 右侧加 LIVE pulse 圆点 (签名元素) + hamburger + UserDropDown
                - BrandLogo 走 control-room 主题: 黄色方块 + 白色文字
            */}
            <header className="app-topbar-cr app-topbar-user">
                {/* BrandLogo 默认带 padding: 16px 24px (admin 端用), 这里 -24px 左右抵消对齐 topbar padding */}
                <div style={{ marginLeft: -24, marginRight: -16 }}>
                    <BrandLogo href="/main" showSubtitle={false} size={32} theme="control-room" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* 2026-07-25: 签名元素 — LIVE pulse 圆点 (整站唯一一处用 cr-pulse 动画) */}
                    <span
                        className="cr-live-indicator"
                        role="status"
                        aria-label="实时连接"
                    >
                        <span className="cr-live-dot" />
                        <span className="cr-live-text">LIVE</span>
                    </span>
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

            {/* 移动端菜单抽屉 — 2026-07-25 暗色版 */}
            {mobileNavOpen && (
                <>
                    <div
                        className="user-mobile-drawer-mask-cr"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div className="user-mobile-drawer-cr">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cr-text-1)' }}>菜单</span>
                            <button
                                onClick={() => setMobileNavOpen(false)}
                                style={{
                                    background: 'none', border: 'none', fontSize: 22,
                                    cursor: 'pointer', color: 'var(--cr-text-3)',
                                    lineHeight: 1, padding: 4,
                                }}
                                aria-label="关闭"
                            >×</button>
                        </div>
                        <Link
                            href="/main"
                            onClick={() => setMobileNavOpen(false)}
                            className={`user-mobile-drawer-cr-item ${pathname === '/main' ? 'active' : ''}`}
                        >
                            <IconFont type="icon-changjingguanli" /> 所有设备
                        </Link>
                        <a
                            onClick={() => { setMobileNavOpen(false); nav('/main/alarm') }}
                            className={`user-mobile-drawer-cr-item ${pathname?.startsWith('/main/alarm') ? 'active' : ''}`}
                        >
                            <IconFont type="icon-tixingshixin" /> 告警管理
                        </a>
                        <a
                            onClick={() => { setMobileNavOpen(false); nav('/main/userinfo') }}
                            className={`user-mobile-drawer-cr-item ${pathname?.startsWith('/main/userinfo') ? 'active' : ''}`}
                        >
                            用户信息
                        </a>
                        <a
                            href="https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/docs/ladisuart/tutorial-v2.5.pdf"
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setMobileNavOpen(false)}
                            className="user-mobile-drawer-cr-item"
                        >
                            📖 使用教程
                        </a>
                    </div>
                </>
            )}

            {/* 模拟登录提示 — 2026-07-25: 移进 user-content-frame, 走 control-room 暗色版 */}
            {isSimulated && (
                <div className="user-content-frame" style={{ paddingTop: 12, paddingBottom: 0 }}>
                    <Alert
                        title="模拟登录模式 - 当前以管理员身份登录用户账号"
                        type="warning"
                        showIcon
                        closable
                        className="v3-alert-cr"
                        style={{ borderRadius: 10 }}
                        onClose={() => {
                            clearSimulateToken()
                            sessionStorage.removeItem('simulated')
                            useUserStore.getState().setSimulated(false)
                            router.push('/admin')
                        }}
                    />
                </div>
            )}

            {/* 主内容 - 375px 锁定宽度容器 (mobile-first, desktop 居中)
                2026-07-25: 移除 PageTransition wrapper
                原因: page-in 200ms fade-in 动画在 iOS Safari 截图/快速 reload 时, main 区域
                会卡在 opacity:0 200ms+, 用户看到"下半部分空白". animation 'both' fill mode + 200ms
                duration 是理论上, 实际 iOS Safari 渲染时机不稳定.
                admin 端 PageTransition 仍保留 (desktop 不会有这个问题)
            */}
            <main className="scroll-area" style={{ flex: 1, position: 'relative' }}>
                <div className="user-content-frame">
                    {children}
                </div>
                <AbsButton theme="control-room">
                    <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--cr-text-3)', marginBottom: 8, fontFamily: 'var(--cr-font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            我的设备
                        </div>
                        {uts.map((el, key) => (
                            <Link
                                key={key}
                                href={`/main/dev/${el.mac}${el.pid}`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 'var(--cr-radius-btn)', fontSize: 13,
                                    color: 'var(--cr-text-2)', textDecoration: 'none',
                                    background: 'transparent',
                                    transition: 'background 150ms',
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