'use client'
import { Empty, Spin } from "antd";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TerminalMountDevNameLine } from "@/components/terminal/TerminalMountDevNameLine";
import { PageHeader } from "@/components/common/PageHeader";

const RootDevLineInner: React.FC = () => {

    const search = useSearchParams()

    const [props] = useState<Record<'mac' | 'pid' | 'name', string | null>>({
        mac: search.get('mac'),
        pid: search.get('pid'),
        name: search.get("name") || ''
    })

    return (
        <>
            <PageHeader
                title="挂载设备数据行"
                subtitle={props.name ? `设备: ${props.name} (mac: ${props.mac} · pid: ${props.pid})` : '设备数据行'}
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '终端', href: '/admin/node/terminal' },
                    { title: '挂载设备行' },
                ]}
                back
                onBack={() => history.back()}
            />
            {(!props.mac || !props.pid || !props.name) ? (
                <div className="bg-bento-canvas" style={{ padding: 80 }}>
                    <Empty description="请求参数不完整 (缺 mac/pid/name)" />
                </div>
            ) : (
                <div className="bg-bento-canvas" style={{ padding: 24 }}>
                    <TerminalMountDevNameLine {...props as any} />
                </div>
            )}
        </>
    )
}

export default function RootDevLine() {
    return (
        <Suspense fallback={<Spin />}>
            <RootDevLineInner />
        </Suspense>
    )
}
