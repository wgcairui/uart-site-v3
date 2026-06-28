'use client'
import { Button, Card, Checkbox, Form, Tag, message } from 'antd'
import React, { useEffect, useMemo, useState } from "react";
import { getProtocol, getProtocolSetup } from "@/lib/api/fetch";

import { usePromise } from "@/lib/hooks/usePromise";
import { addDevConstant } from '@/lib/api/fetchRoot'
import { ProtocolInstructFormrizeParse } from "@/lib/utils/util";
import { AiProtocolEmpty } from "./AiProtocolEmpty";

interface ProtocolProps {
    protocolName: string
}

export const ProtocolAlarmStat: React.FC<ProtocolProps> = ({ protocolName }) => {

    const [form] = Form.useForm()

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, loading, fecth, setData } = usePromise(async () => {
        const { data } = await getProtocolSetup<Uart.ConstantAlarmStat>(protocolName, "AlarmStat")
        return data.sys
    }, [])

    const options = useMemo(() => {
        const Instructs = Protocol.data?.instruct
        // data 是 usePromise 解包后的 data.sys，可能为 undefined（后端无 AlarmStat 配置）
        // 必须先判空再 forEach
        if (Instructs && Array.isArray(data)) {
            const args = new Map(Instructs.map((el: any) => el.formResize.filter((e2: any) => e2.isState)).flat().map((el: any) => [el.name, { ...ProtocolInstructFormrizeParse(el), value: [] as string[] }]))
            data.forEach((el: Uart.ConstantAlarmStat) => {
                args.get(el.name)!.value = el.alarmStat
            })

            return [...args.values()]
                .map(el => ({
                    name: el.name,
                    value: el.value,
                    options: Object.entries((el.parse)).map(e2 => ({ label: e2.join("/"), value: e2[0] }))
                }))
        } else {
            return []
        }
    }, [Protocol.data, data])

    useEffect(() => {
        if (options.length > 0) {
            form.setFieldsValue(Object.assign({}, ...options.map(el => ({ [el.name]: el.value }))))
        }
    }, [options])



    /**
     * 保存配置
     * @param values
     */
    const save = (values: Record<string, string[]>) => {
        const Threld = Object.entries(values).map(([name, alarmStat]) => ({ name, alarmStat }))
        const load = message.loading({ content: 'loading' })
        addDevConstant(Protocol.data.ProtocolType, Protocol.data.Protocol, "AlarmStat", Threld)
            .then(el => {
                load()
                message.success("保存状态配置成功")
            })
    }


    return (
        <>
            <Card title="状态配置" bordered={false}>
            <AiProtocolEmpty
                typeName="状态配置"
                typeKey="AlarmStat"
                protocolName={protocolName}
                source={Protocol.data?.source}
                remark={Protocol.data?.remark}
                empty={!loading && (!data || data.length === 0)}
            />
            <Form form={form} labelCol={{ span: 8 }} size="small" onFinish={save}>
                {
                    options.map(el =>
                        <Form.Item name={el.name} label={<Tag>{el.name}</Tag>} key={el.name}>
                            <Checkbox.Group options={el.options}></Checkbox.Group>
                        </Form.Item>
                    )
                }
                <Form.Item wrapperCol={{ offset: 8 }}>
                    <Button type="primary" htmlType="submit">上传提交</Button>
                </Form.Item>
            </Form>
            </Card>
        </>
    )
}


/**
 * 显示参数配置
 * @param param0
 * @returns
 */
