'use client'
import { Button, Col, Row, Space, Spin } from "antd";
import React, { useMemo, useState } from "react";
import { getTerminalPidProtocol } from "@/lib/api/fetch";
import { useNav } from "@/lib/hooks/useNav";
import { usePromise } from "@/lib/hooks/usePromise";
import { DevDataProps, TerminalRunData } from "./TerminalRunData";
import { TerminalDevOprate } from "./TerminalDevOprate";
import { TerminalDevTH } from "./TerminalDevTH";
import { TerminalDevIO } from "./TerminalDevIO";
import { TerminalDevAir } from "./TerminalDevAir";
import { TerminalDevUps } from "./TerminalDevUps";
import { TerminalRunDataThresoldLine } from "./TerminalRunDataThresoldLine";
export const TerminalDevPage: React.FC<DevDataProps> = ({ mac, pid, user }) => {

    const nav = useNav()
    /**
     * 数据运行参数
     */
    const [result, setResult] = useState<Uart.queryResultArgument[]>([])

    /**
     * 设备运行数据 U result
     */
    const [data, setData] = useState<Uart.queryResultSave>()

    const { data: mountDev, loading } = usePromise(async () => {
        const { data } = await getTerminalPidProtocol(mac, pid)
        return data
    }, undefined, [mac, pid])

    const updateData = (results: Uart.queryResultArgument[], data?: Uart.queryResultSave) => {
        setResult([...results])
        setData(data)
    }

    const devType = useMemo(() => {
        return mountDev?.Type || ''
    }, [mountDev])

    return (
        <Space orientation="vertical">
            {
                !devType && <Spin />
            }
            {
                devType === '温湿度' && <TerminalDevTH mac={mac} pid={pid} {...(user !== undefined ? { user } : {})} result={result} key="th" />
            }
            {
                devType === 'IO' && <TerminalDevIO mac={mac} pid={pid} {...(user !== undefined ? { user } : {})} result={result} key="io" />
            }
            {
                devType === '空调' && <TerminalDevAir mac={mac} pid={pid} {...(user !== undefined ? { user } : {})} result={result} key="air" />
            }
            {
                devType === 'UPS' && <TerminalDevUps mac={mac} pid={pid} {...(user !== undefined ? { user } : {})} result={result} key="ups" />
            }
            <div>
                <span style={{ float: "right" }}>
                    <TerminalDevOprate mac={mac} pid={pid} result={[]} />
                    <Button type='link' onClick={() => nav("/main/constant", {mac, pid: String(pid)})}>告警配置</Button>
                </span>
            </div>

            <Row gutter={22}>
                <Col span={24} md={8}>
                    <TerminalRunData mac={mac} pid={pid} {...(user !== undefined ? { user } : {})} OnUpdate={updateData} />
                </Col>
                <Col span={24} md={16} xs={0}>
                    <TerminalRunDataThresoldLine mac={mac} pid={pid} {...(data?.time !== undefined ? { time: data.time } : {})}></TerminalRunDataThresoldLine>
                </Col>
            </Row>
        </Space>
    )
}


