'use client'
import { Divider, Card, Alert } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { logDevUseTime } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { MyDatePickerRange } from "./myDatePickerRange";


interface props {
    /**
     * mac or terminal
     */
    terminal: Uart.Terminal
}


interface d {
    pid: number;
    name: string;
    data: {
        value: number
        time: string
        category: string
    }[];
}
/**
 * 设备耗时统计
 * @deprecated server 端无对应实现，数据始终为空
 */
export const DevUseTime: React.FC<props> = ({ terminal }) => {

    const [date, setDate] = useState([dayjs().subtract(1, 'day'), dayjs()])

    const { data, loading } = usePromise<d[]>(async () => {
        const { data } = await logDevUseTime(terminal.DevMac, date[0]?.format() || "", date[1]?.format() || "") as { data: { items: Array<{ pid: number; useTime: number; Interval: number; timeStamp: string }> } };
        const mountDevMap = new Map<number, d>((terminal?.mountDevs || []).map(({ pid, mountDev }) => [pid, { pid, name: mountDev, data: [] }]));
        data.items.forEach(({ pid, useTime, Interval, timeStamp }) => {
            const dev = mountDevMap.get(pid)
            if (dev) {
                const time = dayjs(timeStamp).format("H:m:s")
                dev.data.push({value:useTime,time,category:'耗时'})
                dev.data.push({value:Interval,time,category:'间隔'})
            }
        })
        return [...mountDevMap.values()]
    }, [], date)

    return (
        <>
            <Alert type="warning" title="此功能已废弃，server 端无对应数据源" style={{ marginBottom: 12 }} />
            <Divider plain>统计设备每天查询的间隔和查询耗时</Divider>
            <MyDatePickerRange onChange={setDate}>
            </MyDatePickerRange>
            {
                data.map(({ name, pid, data }) => <>
                    <Divider plain>{name + pid}</Divider>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {data.map((item, i) => (
                            <Card size="small" key={i}>
                                <div>{item.category}: {item.value}</div>
                                <div style={{fontSize: 12, color: '#888'}}>{item.time}</div>
                            </Card>
                        ))}
                    </div>
                </>)
            }
        </>
    )
}
