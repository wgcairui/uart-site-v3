'use client'

import { Empty, Spin } from "antd";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/TerminalMountDevNameLine";
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

    console.log(props, token);

    return (
        (!token || !props.mac || !props.pid || !props.name) ? <Empty description="请求参数不完整"></Empty>
            :
            <div style={{ paddingTop: 12, paddingBottom: 32, paddingLeft: 18, paddingRight: 18 }}>
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
