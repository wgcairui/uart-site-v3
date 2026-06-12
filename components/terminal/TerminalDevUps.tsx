'use client'
import { Col, Descriptions, Image, Modal, Progress, Row, Switch, Tabs } from "antd";
import React, { useMemo } from "react";
import { getProtocolSetup, getTerminalPidProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { sendOprateInstruct } from "@/lib/utils/util";
import { devUpsStat } from "@/lib/utils/devImgSource";
import { DevDataProps } from "./TerminalRunData";
interface result extends DevDataProps {
    result: Uart.queryResultArgument[]
}

/**
 * 设备操作指令
 * @param param0
 * @returns
 */
export const TerminalDevUps: React.FC<result> = ({ mac, pid, result }) => {

    const { data: Constant } = usePromise(async () => {
        const mountDev = await getTerminalPidProtocol(mac, pid)
        const constant = await getProtocolSetup<Uart.DevConstant_Ups>(mountDev.data.protocol, 'Constant')
        return constant.data.sys as any as Uart.DevConstant_Ups
    })

    const ups = useMemo(() => {
        const stat: Record<keyof Uart.DevConstant_Ups, string | Uart.queryResultArgument[]> = {
            Switch: '',
            WorkMode: '',
            UpsStat: [],
            BettyStat: [],
            InputStat: [],
            OutStat: []

        }

        if (Constant && result.length > 0) {
            const rMap = new Map(result.map(el => [el.name, el]))
            stat.Switch = rMap.get(Constant.Switch)?.parseValue || ''
            stat.WorkMode = rMap.get(Constant.WorkMode)?.parseValue || ''
            stat.UpsStat = result.filter(el => Constant.UpsStat?.includes(el.name))
            stat.BettyStat = result.filter(el => Constant.BettyStat?.includes(el.name))
            stat.InputStat = result.filter(el => Constant.InputStat?.includes(el.name))
            stat.OutStat = result.filter(el => Constant.OutStat?.includes(el.name))
        }
        return stat
    }, [result, Constant])

    const workPic = useMemo(() => {
        switch (ups.WorkMode) {
            case "在线模式":
                return devUpsStat[3]
            case "旁路模式":
                return devUpsStat[2]
            case "电池模式":
                return devUpsStat[1]
            default:
                return devUpsStat[0]
        }
    }, [ups.WorkMode])


    /**
     * 开关机
     * @param val
     */
    const OnOff = (val: boolean) => {
        Modal.confirm({
            content: `确定${!val ? '关闭' : '打开'}UPS??`,
            onOk: () => {
                sendOprateInstruct(mac, pid, !val ? '关机' : '开机')
            }
        })
    }

    const tabItems = [
        {
            key: 'upsStat',
            label: 'ups状态',
            children: (
                <Descriptions>
                    {
                        (ups.UpsStat as Uart.queryResultArgument[]).map(el =>
                            <Descriptions.Item label={el.name} key={el.name}>
                                {el.parseValue}
                            </Descriptions.Item>)
                    }
                </Descriptions>
            )
        },
        {
            key: 'betty',
            label: '电池信息',
            children: (
                <section className="upsTabStat">
                    {
                        (ups.BettyStat as Uart.queryResultArgument[]).map(el =>
                            <div key={el.name}>
                                <span>{el.name}</span>
                                <Progress
                                    percent={Number(el.parseValue)}
                                    format={_ => el.parseValue + el.unit}
                                    key={el.name}
                                    size="small"
                                >
                                </Progress>
                            </div>
                        )
                    }
                </section>
            )
        },
        {
            key: 'input',
            label: '输入状态',
            children: (
                <section className="upsTabStat">
                    {
                        (ups.InputStat as Uart.queryResultArgument[]).map(el =>
                            <div key={el.name}>
                                <span>{el.name}</span>
                                <Progress
                                    percent={Number(el.parseValue) * 100 / (Number(el.parseValue) < 300 ? ((Number(el.parseValue)) <= 100 ? 100 : 250) : 420)}
                                    format={_ => el.parseValue + el.unit}
                                    key={el.name}
                                    size="small"
                                >
                                </Progress>
                            </div>
                        )
                    }
                </section>
            )
        },
        {
            key: 'out',
            label: '输出状态',
            children: (
                <section className="upsTabStat">
                    {
                        (ups.OutStat as Uart.queryResultArgument[]).map(el =>
                            <div key={el.name}>
                                <span>{el.name}</span>
                                <Progress
                                    percent={Number(el.parseValue) * 100 / (Number(el.parseValue) < 300 ? ((Number(el.parseValue)) <= 100 ? 100 : 250) : 420)}
                                    format={_ => el.parseValue + el.unit}
                                    size="small"
                                >
                                </Progress>
                            </div>)
                    }
                </section>
            )
        }
    ]

    return (
        <Row gutter={24}>
            <Col span={24} md={12}>
                <div>
                    <span>{ups.WorkMode as string}</span>
                    {
                        ups.Switch && <Switch
                            style={{ marginLeft: 12 }}
                            checked={ups.Switch === '开机'}
                            {...(ups.Switch !== undefined ? { checkedChildren: ups.Switch as string, unCheckedChildren: ups.Switch as string } : {})}
                            onChange={OnOff}
                        ></Switch>
                    }
                </div>
                <Image {...(workPic !== undefined ? { src: workPic } : {})} preview={false} />
            </Col>
            <Col span={24} md={12}>
                <Tabs items={tabItems} />
            </Col>
        </Row>
    )

}

/**
 * 设备数据状态页面
 * @param param0
 * @returns
 */
