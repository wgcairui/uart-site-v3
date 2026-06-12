'use client'
import { LoadingOutlined } from "@ant-design/icons";
import { Avatar, Dropdown } from "antd";
import React, { useEffect } from "react";
import { userInfo } from "@/lib/api/fetch";
import { socketClient } from "@/lib/socket";
import { useNav } from "@/lib/hooks/useNav";
import { usePromise } from "@/lib/hooks/usePromise";
import { useUserStore } from "@/lib/store/userStore";
import { clearToken } from "@/lib/utils/token";


interface props {
    /**
     * 用户界面路由
     */
    userPage?: string
}

/**
 *
 * @returns
 */
export const UserDropDown: React.FC<props> = ({ userPage }) => {
    const nav = useNav()
    const exit = () => {
        clearToken()
        nav("/")
    }

    const { data, loading } = usePromise(async () => {
        const { data } = await userInfo()
        return data
    })

    // 用户数据加载完成后建立 Socket 连接，组件卸载时断开
    useEffect(() => {
        if (!data?.user) return
        useUserStore.getState().setUser(data)
        socketClient.connect(data.user)
        return () => socketClient.disConnect()
    }, [data?.user])

    return (
        loading ?
            <LoadingOutlined />
            :
            <Dropdown
            menu={{
                items: [
                    { key: "info", label: <a onClick={() => nav(userPage || "/main/userinfo", { user: data?.user })}>用户信息</a> },
                    { key: "exit", label: <a onClick={() => exit()}>退出</a> }
                ]
            }}
            arrow
            destroyOnHidden
            placement="bottomLeft"
        >
                <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
                    <Avatar src={data?.avanter || undefined} ></Avatar>
                </a>
            </Dropdown>
    )
}
