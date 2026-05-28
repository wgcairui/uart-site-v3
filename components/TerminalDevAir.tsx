'use client'
import { Col, Image, Modal, Row, Switch } from "antd";
import React, { useMemo } from "react";
import { getProtocolSetup, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { sendOprateInstruct } from "@/lib/utils/util";
import { devAir } from "@/lib/utils/devImgSource";
import { IconFontSpin } from "./IconFont";
import { DevDataProps } from "./TerminalRunData";

interface result extends DevDataProps {
    result: Uart.queryResultArgument[]
}

/**
 * 设备操作指令
 * @param param0
 * @returns
 */
export const TerminalDevAir: React.FC<result> = ({ mac, pid, result }) => {

    const { data: Constant } = usePromise(async () => {
        const mountDev = await getTerminalPidProtocol(mac, pid)
        const constant = await getProtocolSetup<Uart.DevConstant_Air>(mountDev.data.protocol, 'Constant')
        return constant.data.sys as any as Uart.DevConstant_Air
    })

    const air = useMemo(() => {
        const stat: Record<keyof Uart.DevConstant_Air, string> = {
            Switch: '',
            WorkMode: '',
            ColdChannelHumidity: '0',
            ColdChannelTemperature: '0',
            HeatChannelHumidity: '0',
            HeatChannelTemperature: '0',
            RefrigerationHumidity: '0',
            RefrigerationTemperature: '0',
            Speed: '0'
        }

        if (Constant && result.length > 0) {
            const rMap = new Map(result.map(el => [el.name, el]))
            for (const key in stat) {
                const value = rMap.get(Constant[key as keyof Uart.DevConstant_Air])
                if (value) {
                    stat[key as keyof Uart.DevConstant_Air] = value.parseValue
                }
            }
        }
        return stat
    }, [result, Constant])

    /**
     * 开关机
     * @param val
     */
    const OnOff = (val: boolean) => {
        Modal.confirm({
            content: `确定${!val ? '关闭' : '打开'}空调??`,
            onOk: () => {
                sendOprateInstruct(mac, pid, !val ? '关机' : '开机')
            }
        })
    }

    return (
        <Row style={{ padding: 12 }}>
            <Col span={24} md={12} style={{ backgroundColor: "black", padding: 12 }}>
                <Image src={devAir} preview={false} />
            </Col>
            <Col span={24} md={12}>
                <Row>
                    <Col span={24} md={12}>
                        <Row>
                            <Col span={12} >
                                <Switch
                                    checked={air.Switch === '运行'}
                                    checkedChildren={air.Switch}
                                    unCheckedChildren={air.Switch}
                                    onChange={OnOff}
                                ></Switch>
                            </Col>

                            <Col span={12}>


                            </Col>

                        </Row>
                    </Col>
                    <Col span={24} md={12} style={{ height: "100%" }}>
                        <Row gutter={32} style={{ height: "100%" }}>
                            <Col span={8}>
                                <section style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span>送风</span>
                                    {
                                        air.WorkMode.includes('风') ?
                                            <IconFontSpin type="icon-a-28tongfengfengshan" animationDuration="4s" color="#1296db" />
                                            : <IconFontSpin type="icon-a-28tongfengfengshan" />
                                    }
                                </section>
                            </Col>
                            <Col span={8}>
                                <section style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span>制热</span>
                                    {
                                        air.WorkMode.includes('制热') ?
                                            <IconFontSpin type="icon-zhire" animationDuration="4s" color="#d4237a" />
                                            : <IconFontSpin type="icon-zhire" />
                                    }
                                </section>
                            </Col>
                            <Col span={8}>
                                <section style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span>制冷</span>
                                    {
                                        air.WorkMode.includes('制冷') ?
                                            <IconFontSpin type="icon-kongdiao" animationDuration="4s" color="#1296db" />
                                            : <IconFontSpin type="icon-kongdiao" />

                                    }
                                </section>
                            </Col>
                            <Col span={8}>
                                <section style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span>除湿</span>
                                    {
                                        air.WorkMode.includes('除湿') ?
                                            <IconFontSpin type="icon-chushi" color="#1296db" />
                                            : <IconFontSpin type="icon-chushi" />
                                    }
                                </section>
                            </Col>
                            <Col span={8}>
                                <section style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span>加湿</span>
                                    {
                                        air.WorkMode.includes('加湿') ?
                                            <IconFontSpin type="icon-jiashi" color="#1296db" />
                                            : <IconFontSpin type="icon-jiashi" />
                                    }
                                </section>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Col>
        </Row>
    )
}



/**
 * 展示ups页面
 * @param param0
 * @returns
 */
