'use client'
import { Alert, Button, Checkbox, Divider, Form, InputNumber, message, Space, Table, Tag } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { modifyAdminUserAlarmSetupProtocol } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup, setUserSetupProtocol } from "@/lib/api/fetch";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { ProtocolInstructFormrizeParse } from "@/lib/utils/util";

interface UserProps {
    protocolName: string
    user: string
    isAdmin?: boolean
}

export const ProtocolAlarmStatUser: React.FC<UserProps> = ({ protocolName, user, isAdmin }) => {
    const [form] = Form.useForm()

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, loading, fecth, setData } = usePromise<Uart.ConstantAlarmStat[]>(async () => {
        const { data } = await getProtocolSetup<Uart.ConstantAlarmStat>(protocolName, "AlarmStat", user) as { data: { sys: Uart.ConstantAlarmStat[]; user: Uart.ConstantAlarmStat[] } }
        const alarmMap = new Map(data.sys.map((el: Uart.ConstantAlarmStat) => [el.name, el]))
        data.user.forEach((el: Uart.ConstantAlarmStat) => {
            if (el?.name) alarmMap.set(el.name, el)
        })
        return [...alarmMap.values()]
    }, [])

    const options = useMemo(() => {
        const Instructs = Protocol.data?.instruct
        if (Instructs) {
            const args = new Map(Instructs.map((el: any) => el.formResize.filter((e2: any) => e2.isState)).flat().map((el: any) => [el.name, { ...ProtocolInstructFormrizeParse(el), value: [] as string[] }]))
            data.forEach(el => {
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
        const saveReq = isAdmin 
            ? modifyAdminUserAlarmSetupProtocol(user, Protocol.data.Protocol, { AlarmStat: Threld })
            : setUserSetupProtocol(Protocol.data.Protocol, "AlarmStat", Threld);

        saveReq.then(() => {
            fecth()
            load()
            message.success("保存状态配置成功")
        })
    }

    return (
        <>
            <Alert title="状态配置说明：在这里勾选异常的状态值。当设备上报的状态与您勾选的值匹配时，系统将触发状态告警。" type="info" showIcon style={{ marginBottom: 16 }} />
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
        </>
    )
}


/**
 * 显示参数配置
 * @param param0
 * @returns
 */
