'use client'

import { Empty, Spin } from "antd";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/terminal/TerminalMountDevNameLine";
import { useToken } from "@/lib/hooks/useToken";

/**
 * 微信小程序专用line
 * @returns
 */
const WxLine: React.FC = () => {

    const token = useToken()

    const search = useSearchParams()

    const props = {
        mac: search.get('mac'),
        pid: search.get('pid'),
        name: search.get("name") || ''
    }

    // 移动端 detection: < 768px 缩小容器内边距 (小程序内嵌通常窄屏)
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
        (!token || !props.mac || !props.pid || !props.name)
            ? <div className="bg-cr-canvas"><Empty className="v3-empty-cr" description="请求参数不完整"></Empty></div>
            :
            <div
                className="bg-cr-canvas"
                style={{
                    paddingTop: 12,
                    paddingBottom: 32,
                    paddingLeft: isMobile ? 8 : 18,
                    paddingRight: isMobile ? 8 : 18,
                }}
            >
                <TerminalMountDevNameLine {...props as any}></TerminalMountDevNameLine>
            </div>
    )
}


export default function Page() {
    return (
        <Suspense fallback={<Spin />}>
            <WxLine />
        </Suspense>
    )
}
