'use client'

import { Empty, Spin, Tabs } from "antd";
import { FC, Suspense } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { useSearchParams } from "next/navigation";
import { getTerminalPidProtocol } from "@/lib/api/fetch";
import { ProtocolAlarmStatUser } from "@/components/protocol/ProtocolAlarmStatUser";
import { ProtocolShowTagUser } from "@/components/protocol/ProtocolShowTagUser";
import { ProtocolThresholdUser } from "@/components/protocol/ProtocolThresholdUser";
import { usePromise } from "@/lib/hooks/usePromise";
import { PageHeader } from "@/components/common/PageHeader";


const UserConstant: FC = () => {

    const user = useUserStore(s => s.user)
    /**
     *
     */
    const param = useSearchParams()

    const { data: mountDev, loading } = usePromise(async () => {
        const [mac, pid] = [param.get('mac'), param.get('pid')]
        if (!mac || !pid) throw new Error('param Error')
        const { data } = await getTerminalPidProtocol(mac, pid)
        return data
    })

    return (
        mountDev ?
            <div style={{padding:30}}>
                <PageHeader
                    title={mountDev.protocol}
                    breadcrumb={[{ title: '首页', href: '/main' }]}
                />
                <Tabs items={[
                    {
                        key: 'show',
                        label: '显示参数',
                        children: <ProtocolShowTagUser protocolName={mountDev.protocol} user={user.user!}></ProtocolShowTagUser>,
                    },
                    {
                        key: 'Threld',
                        label: '阈值配置',
                        children: <ProtocolThresholdUser protocolName={mountDev.protocol} user={user.user!} ></ProtocolThresholdUser>,
                    },
                    {
                        key: 'stat',
                        label: '状态配置',
                        children: <ProtocolAlarmStatUser protocolName={mountDev.protocol} user={user.user!}></ProtocolAlarmStatUser>,
                    },
                ]} />
            </div>
            :
            <Empty />
    )
}

export default function Page() {
    return (
        <Suspense fallback={<Spin />}>
            <UserConstant />
        </Suspense>
    )
}
