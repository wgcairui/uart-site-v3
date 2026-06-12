'use client'
import { Affix, Button, Card, Collapse, Divider, InputNumber, Spin } from "antd";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs"
import { socketClient } from "@/lib/socket";
import { addListenMac, delListenMac } from "@/lib/api/fetchRoot";
import { JSONTree } from 'react-json-tree';
import "./devRealTimeLog.css"

interface props {
    terminal: Uart.Terminal
}

interface eventData {
    type: string,
    time: string,
    data: any
}
export const DevRealTimeLog: React.FC<props> = ({ terminal }) => {

    const [logs, setLogs] = useState<eventData[]>([])
    const [maxSum, setMaxSum] = useState(10)

    useEffect(() => {
        if(logs.length>0){
            subscribe()
        }
    }, [logs])

    const subscribe = ()=>{
        socketClient.io.once('mac_log', (data: eventData) => {
            if (!data.time) {
                data.time = dayjs().format('YYYY-MM-DD H:m:s')
            }
            const newLogs = [...logs, data]
            if (newLogs.length > maxSum) {
                newLogs.shift();
            }
            console.log(newLogs);

            setLogs(newLogs)
        })
    }

    const start = ()=>{
        addListenMac(terminal.DevMac);
        subscribe()
    }

    const stop = ()=>{
        delListenMac(terminal.DevMac)
    }

    return (
        <>
            <Divider plain>显示mac设备日志(需要等待一段时间才会有数据, 一般在n秒左右) </Divider>
            <Affix offsetTop={120} onChange={(affixed) => console.log(affixed)}>
                <Button type='primary' onClick={start}>listen start</Button>
                <Button type='primary' onClick={stop}>listen stop</Button>
                <InputNumber value={maxSum} onChange={(n)=>setMaxSum(n || maxSum)}></InputNumber>
            </Affix>
            {
                logs.length === 0 ? <div className="example">
                    <Spin />
                </div> : <div>
                    {
                        logs.map((log, i) => <Card title={log.type} key={i} style={{ marginBottom: 10 }}>
                            <p>time: {log.time}</p>
                            <p>data: </p>
                            <Collapse bordered={false} items={[{
                                key: "1",
                                label: JSON.stringify(log.data).slice(0, 100),
                                children: <JSONTree data={log.data} />,
                            }]} />
                        </Card>)
                    }
                </div>
            }

        </>
    )
}
