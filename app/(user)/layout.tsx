'use client'

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Layout, Menu, Alert } from "antd";
import './usermain.css'
import Link from "next/link";
import { useUserStore } from "@/lib/store/userStore";
import { IconFont, devTypeIcon } from "@/components/IconFont";
import { BindDev } from "@/lib/api/fetch";
import { useNav } from "@/lib/hooks/useNav";
import { subscribeEvent, unSubscribeEvent } from "@/lib/socket";
import { UserDropDown } from "@/components/userDropDown";
import { useToken } from "@/lib/hooks/useToken";
import { AbsButton } from "@/components/absButton";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

function TokenSync() {
    useToken()
    return null
}

export default function UserLayout({ children }: { children: React.ReactNode }) {

    const nav = useNav()
    const router = useRouter()
    const isSimulated = useUserStore(s => s.isSimulated)

    // 页面刷新后从 sessionStorage 恢复模拟状态
    useEffect(() => {
        if (sessionStorage.getItem('simulated') === 'true') {
            useUserStore.getState().setSimulated(true)
        }
    }, [])

    const [terminals, setTer] = useState<Uart.Terminal[]>([])

    /**
     * 获取绑定设备
     * @returns
     */
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


    /**
     * 监听绑定设备变更
     */
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


    const menuItems = useMemo(() => {
        return [
            {
                key: "1",
                label: "所有设备",
                icon: <IconFont type="icon-changjingguanli" />,
                children: uts.map((el, key) => ({
                    key: '1-' + key,
                    icon: devTypeIcon[el.Type],
                    label: <Link href={"/main/dev/" + el.mac + el.pid}>{`${el.name}-${el.mountDev}-${el.pid}`}</Link>,
                })),
            },
            {
                key: "2",
                label: "告警管理",
                icon: <IconFont type="icon-tixingshixin" />,
                onClick: () => nav("/main/alarm"),
            },
            {
                key: "4",
                label: "languga",
                icon: <IconFont type="icon-zuzhiqunzu" />,
                children: [
                    { key: "4-1", label: "中文" },
                    { key: "4-2", label: "EN" },
                ],
            },
            {
                key: "info",
                label: "用户信息",
                onClick: () => nav('/main/user'),
            }
        ]
    }, [uts, nav])

    return (
        <main className="user-main">
            <Suspense fallback={null}><TokenSync /></Suspense>
            <Layout className="user-main">
                <Layout.Header className="user-header">
                    <Link href="/main">
                        {/* <Image src="http://admin.ladishb.com/upload/LADS_witdh.png" preview={false} height={20}></Image> */}
                        <span style={{ fontSize: 36, color: "#3a8ee6", fontFamily: "cursive" }}>百事服</span>
                    </Link>
                    <div className="user-header-menu">
                        <Menu theme="dark" mode="horizontal" className="menu-phone" items={menuItems} />
                        <UserDropDown userPage="/main/user"></UserDropDown>
                    </div>
                </Layout.Header>
                <Layout.Content style={{ padding: 9, height: "100%", backgroundColor: "#ffffff", position: "relative" }}>
                    {isSimulated && (
                        <Alert
                            title="模拟登录模式 - 当前以管理员身份登录用户账号"
                            type="warning"
                            showIcon
                            closable
                            style={{ marginBottom: 8 }}
                            onClose={() => {
                                sessionStorage.removeItem('simulated')
                                useUserStore.getState().setSimulated(false)
                                router.push('/admin')
                            }}
                        />
                    )}
                    <main>{children}</main>
                    <AbsButton>
                        <Menu mode="inline" openKeys={["1", "4"]} items={menuItems} />
                    </AbsButton>
                </Layout.Content>
            </Layout>

        </main>
    )
}
