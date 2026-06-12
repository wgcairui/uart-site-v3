'use client'
import { Col, Divider, Form, Modal, Row, Switch } from "antd";
import React, { useMemo } from "react";
import { getProtocolSetup, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { sendOprateInstruct } from "@/lib/utils/util";
import { DevDataProps } from "./TerminalRunData";

interface ios {
    r: Uart.queryResultArgument,
    disable?: boolean,
    onChange?: (r: Uart.queryResultArgument, v: boolean) => void
}
const IoSwicth: React.FC<ios> = ({ r, disable, onChange }) => {
    return (
        <Switch
            checked={Boolean(Number(r.value))}
            size="default"
            {...(disable !== undefined ? { disabled: disable } : {})}
            checkedChildren={r.parseValue}
            unCheckedChildren={r.parseValue}
            onChange={v => onChange && onChange(r, v)}
        />
    )
}

interface result extends DevDataProps {
    result: Uart.queryResultArgument[]
}

/**
 * 设备操作指令
 * @param param0
 * @returns
 */
export const TerminalDevIO: React.FC<result> = ({ mac, pid, result }) => {

    const { data: Constant } = usePromise(async () => {
        const mountDev = await getTerminalPidProtocol(mac, pid)
        const constant = await getProtocolSetup<Uart.DevConstant_IO>(mountDev.data.protocol, 'Constant')
        return constant.data.sys as any as Uart.DevConstant_IO
    })

    const io = useMemo(() => {
        const io: Record<'in' | 'out', Uart.queryResultArgument[]> = {
            in: [],
            out: []
        }
        if (Constant && result) {
            const rMap = new Map(result.map(el => [el.name, el]))
            Constant.di.forEach(el => {
                io.in.push(rMap.get(el)!)
            })
            io.in = io.in.filter(el => el)
            Constant.do.forEach(el => {
                io.out.push(rMap.get(el)!)
            })
            io.out = io.out.filter(el => el)
        }
        return io
    }, [result, Constant])


    /**
     * 变更设备状态
     * @param item
     */
    const changeDo = async (item: Uart.queryResultArgument, v: boolean) => {
        const tag = Boolean(Number(item.value)) ? '断开' : '闭合'
        Modal.confirm({
            content: `确认操作${item.name} [${tag}]?`,
            onOk() {
                // 获取index
                const index = io.out.findIndex(el => el.name === item.name)
                sendOprateInstruct(mac, pid, tag, index + 1)
            }
        })
    }

    return (

        <Row>
            <Col span={12} md={24}>
                <Divider plain>DI</Divider>
                <Form layout="inline" style={{ justifyContent: "center" }}>
                    {
                        io.in.map(i => <Form.Item label={i.name} key={i.name}>
                            <IoSwicth r={i} disable></IoSwicth>
                        </Form.Item>)
                    }
                </Form>
            </Col>
            <Col span={12} md={24}>
                <Divider plain>DO</Divider>
                <Form layout="inline" style={{ justifyContent: "center" }}>
                    {
                        io.out.map(i => <Form.Item label={i.name} key={i.name}>
                            <IoSwicth r={i} onChange={changeDo}></IoSwicth>
                        </Form.Item>)
                    }
                </Form>
            </Col>
        </Row>
    )
}



/**
 * 展示空调页面
 * @param param0
 * @returns
 */
