'use client'
import { Col, Progress, Row, Switch } from "antd";
import React, { useMemo } from "react";
import { getProtocolSetup, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { DevDataProps } from "./TerminalRunData";

interface result extends DevDataProps {
    result: Uart.queryResultArgument[]
}

/**
 * 设备操作指令
 * @param param0
 * @returns
 */
export const TerminalDevTH: React.FC<result> = ({ mac, pid, result }) => {

    const { data: Constant } = usePromise(async () => {
        const mountDev = await getTerminalPidProtocol(mac, pid)
        const constant = await getProtocolSetup<Uart.DevConstant_TH>(mountDev.data.protocol, 'Constant')
        return constant.data.sys as any as Uart.DevConstant_TH
    })

    const th = useMemo(() => {
        const th = {
            t: 0,
            h: 0
        }
        if (Constant && result) {
            const rMap = new Map(result.map(el => [el.name, el]))
            th.t = Number(rMap.get(Constant.Temperature)?.parseValue) || 0
            th.h = Number(rMap.get(Constant.Humidity)?.parseValue) || 0
        }
        return th
    }, [result, Constant])

    return (
        <Row>
            <Col span={12} md={12} style={{textAlign: "center"}}>
                <Progress type="dashboard" percent={th.t} format={() => `温度:${th.t}℃`} width={150} />
            </Col>
            <Col span={12} md={12} style={{textAlign: "center"}}>
                <Progress type="dashboard" percent={th.h} format={() => `湿度:${th.h}%RH`} width={150} />
            </Col>
        </Row>
    )
}


interface ios {
    r: Uart.queryResultArgument,
    disable?: boolean,
    onChange?: (r: Uart.queryResultArgument, v: boolean) => void
}
const IoSwicth: React.FC<ios> = ({ r, disable, onChange }) => {

    return (
        <>
            <Switch
                checked={Boolean(Number(r.value))}
                size="default"
                {...(disable !== undefined ? { disabled: disable } : {})}
                checkedChildren={r.parseValue}
                unCheckedChildren={r.parseValue}
                onChange={v => onChange && onChange(r, v)}
            ></Switch>
        </>
    )
}


/**
 * 设备状态-IO
 * @returns
 */
