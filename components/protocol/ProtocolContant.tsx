'use client'
import { Button, Form, message, Select } from 'antd'
import React, { useEffect, useMemo, useState } from "react";
import { addDevConstant } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup } from "@/lib/api/fetch";


import { usePromise } from "@/lib/hooks/usePromise";

type devs = keyof Uart.DevConstant

interface ProtocolProps {
    protocolName: string
}

export const ProtocolContant: React.FC<ProtocolProps> = ({ protocolName }) => {


    const opt: Record<Uart.protocolType, Partial<Record<keyof Uart.DevConstant, string>>> = {
        air: {
            Switch: "开关",
            WorkMode: "工作模式",
            HeatChannelTemperature: "热通道温度",
            HeatChannelHumidity: "热通道湿度",
            ColdChannelTemperature: "冷通道温度",
            ColdChannelHumidity: "冷通道湿度",
            RefrigerationTemperature: "制冷温度",
            RefrigerationHumidity: "制冷湿度",
            Speed: "风速",
        },
        ups: {
            Switch: "开关",
            WorkMode: "工作模式",
            UpsStat: "UPS状态",
            BettyStat: "电池状态",
            InputStat: "输入状态",
            OutStat: "输出状态",
        },
        em: {
            battery: "电池电量",
            voltage: "电压",
            current: "电流",
            factor: "因数",
        },
        th: {
            Temperature: "温度",
            Humidity: "湿度",
        },
        io: {
            di: "DI",
            do: "DO",
        },
    }

    const [form] = Form.useForm<Uart.DevConstant>()

    const [filterOptions, setFilterOptions] = useState<string[]>([])

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getProtocolSetup(protocolName, "Constant")
        return data.sys as any as Uart.DevConstant
    })


    const vals = useMemo(() => {
        if (Protocol.data && data) {
            const type = opt[Protocol.data.ProtocolType]
            const keys = Object.keys(type) as devs[]
            const contants = keys.map(el => ({ value: data[el], label: el, text: type[el] }))
            return contants
        } else {
            return []
        }

    }, [Protocol.data, data])

    useEffect(() => {
        const da = Object.assign({}, ...vals.map(el => ({ [el.label]: el.value }))) as Record<string, string[]>
        form.setFieldsValue(da)
        setFilterOptions([...new Set([...filterOptions, ...Object.values(da).flat()])])
    }, [vals])


    const options = useMemo(() => {
        const Instructs = Protocol.data?.instruct
        if (Instructs) {
            return Instructs.map((el: any) => el.formResize.map((e2: any) => e2.name)).flat().filter((el: string) => !filterOptions.includes(el))
        } else {
            return []
        }
    }, [filterOptions, Protocol.data])


    const change = (val: Partial<Uart.DevConstant>) => {
        setFilterOptions(Object.values(form.getFieldsValue()).flat())
    }

    const submit = (val: Partial<Uart.DevConstant>) => {
        console.log(val);
        const load = message.loading({ content: 'loading' })
        addDevConstant(Protocol.data.ProtocolType, Protocol.data.Protocol, "Constant", val)
            .then(el => {
                load()
                message.success("保存常量成功")
            })
    }

    return (
        <>
            <Form form={form} labelCol={{ span: 3 }} onValuesChange={change} onFinish={submit}>
                {
                    vals.map(el => <Form.Item name={el.label} label={el.text} key={el.text as string}>
                        <Select
                            {...(typeof el.value === "object" ? { mode: "multiple" } : {})}
                            loading={loading}
                            showSearch
                        >
                            {
                                options.map((el: string) => <Select.Option value={el} key={el} >{el}</Select.Option>)
                            }
                        </Select>
                    </Form.Item>)
                }
                <Form.Item wrapperCol={{ offset: 3 }}>
                    <Button type="primary" htmlType="submit">上传保存</Button>
                </Form.Item>
            </Form>
        </>
    )
}


/**
 * 协议阈值配置
 * @param param0
 * @returns
 */
