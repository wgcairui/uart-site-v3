'use client'

import React, { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { wxlogin } from "@/lib/api/fetch"
import { useNav } from "@/lib/hooks/useNav"
import { setToken } from "@/lib/utils/token"
import { Spin } from "antd"

/**
 * 微信登录跳转页面内容（需在 Suspense 中使用 useSearchParams）
 */
const LoginWxContent: React.FC = () => {
    const nav = useNav()
    const param = useSearchParams()

    useEffect(() => {
        (async () => {
            const [code, state] = [param.get("code"), param.get("state")]
            if (!code || !state) {
                nav("/login")
                return
            }
            const { data } = await wxlogin(code, state) as any
            console.log(data)
            setToken(data.token)
            nav("/login")
        })()
    }, [])

    return <Spin />
}

/**
 * 微信登录跳转页面
 */
const LoginWx: React.FC = () => {
    return (
        <Suspense fallback={<Spin />}>
            <LoginWxContent />
        </Suspense>
    )
}

export default LoginWx
