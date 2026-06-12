'use client'
import { Empty, Spin } from "antd";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/terminal/TerminalMountDevNameLine";

const RootDevLineInner: React.FC = () => {

    const search = useSearchParams()

    const [props] = useState<Record<'mac' | 'pid' | 'name', string | null>>({
        mac: search.get('mac'),
        pid: search.get('pid'),
        name: search.get("name") || ''
    })

    return (
        (!props.mac || !props.pid || !props.name) ? <Empty description="请求参数不完整"></Empty>
            :
            <TerminalMountDevNameLine {...props as any}></TerminalMountDevNameLine>
    )
}

export default function RootDevLine() {
    return (
        <Suspense fallback={<Spin />}>
            <RootDevLineInner />
        </Suspense>
    )
}
