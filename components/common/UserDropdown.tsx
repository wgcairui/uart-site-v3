'use client'
import { Dropdown } from "antd";
import React, { useEffect } from "react";
import { userInfo } from "@/lib/api/fetch";
import { socketClient } from "@/lib/socket";
import { useNav } from "@/lib/hooks/useNav";
import { usePromise } from "@/lib/hooks/usePromise";
import { useUserStore } from "@/lib/store/userStore";
import { clearAllTokens } from "@/lib/utils/token";

interface props {
    /** 用户界面路由 */
    userPage?: string
}

/**
 * 用户下拉菜单
 *
 * 视觉：头像用 brand gradient 圆形，菜单项用品牌色 hover
 */
export const UserDropDown: React.FC<props> = ({ userPage }) => {
    const nav = useNav()
    const exit = () => {
        clearAllTokens()
        nav("/")
    }

    const { data, loading } = usePromise(async () => {
        const { data } = await userInfo()
        return data
    })

    useEffect(() => {
        if (!data?.user) return
        useUserStore.getState().setUser(data)
        socketClient.connect(data.user)
        return () => socketClient.disConnect()
    }, [data?.user])

    const initial = (data?.user?.[0] || 'U').toUpperCase()

    return (
        loading ?
            <span style={{ color: 'var(--ink-300)' }}>...</span>
            :
            <Dropdown
                menu={{
                    items: [
                        { key: "info", label: <a onClick={() => nav(userPage || "/main/userinfo", { user: data?.user })}>用户信息</a> },
                        { key: "tutorial", label: <a href="https://besiv-uart.oss-cn-hangzhou.aliyuncs.com/docs/ladisuart/tutorial-v2.5.pdf" title="小程序使用教程 PDF">📖 使用教程</a> },
                        { key: "exit", label: <a onClick={() => exit()}>退出</a> }
                    ]
                }}
                arrow
                destroyOnHidden
                placement="bottomRight"
            >
                <a
                    className="ant-dropdown-link"
                    onClick={e => e.preventDefault()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                    {data?.avanter ? (
                        <img
                            src={data.avanter}
                            alt={data.user}
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <span
                            className="shadow-avatar"
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)',
                                color: '#fff', fontWeight: 600, fontSize: 13,
                            }}
                        >
                            {initial}
                        </span>
                    )}
                </a>
            </Dropdown>
    )
}