'use client'
import { Alert, Button, Checkbox, CheckboxOptionType, Col, message, Row } from "antd";
import React, { useMemo } from "react";
import { modifyAdminUserAlarmSetupProtocol } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup, setUserSetupProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";

interface UserProps {
    protocolName: string
    user: string
    isAdmin?: boolean
}

export const ProtocolShowTagUser: React.FC<UserProps> = ({ protocolName, user, isAdmin }) => {

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, fecth, setData } = usePromise(async () => {
        const { data } = await getProtocolSetup<string>(protocolName, "ShowTag", user)
        return data.user || []
    }, [])

    const options = useMemo<CheckboxOptionType[]>(() => {
        const Instructs = Protocol.data?.instruct
        return Instructs ? Instructs.map((el: any) => el.formResize.map((e2: any) => e2.name)).flat().map((el: string) => ({ label: el, value: el })) : []
    }, [Protocol.data, data])


    /**
     * 保存配置
     */
    const save = () => {
        const load = message.loading({ content: 'loading' })
        const saveReq = isAdmin 
            ? modifyAdminUserAlarmSetupProtocol(user, Protocol.data.Protocol, { ShowTag: data })
            : setUserSetupProtocol(Protocol.data.Protocol, "ShowTag", data);

        saveReq.then(el => {
            load()
            fecth()
            message.success("保存显示参数配置成功")
        })
    }

    return (
        <>
            <Alert title="显示参数说明：勾选需要在设备详情、列表或概览中重点关注和显示的参数指标。" type="info" showIcon style={{ marginBottom: 16 }} />
            <Button type="primary" onClick={() => save()} style={{ marginBottom: 22 }}>上传保存</Button>
            <Checkbox.Group value={data} style={{ width: '100%' }} onChange={(val: any[]) => setData(val)}>
                <Row>
                    {
                        options.map(el =>
                            <Col span={24} md={12} xl={8} key={el.label as any}>
                                <Checkbox value={el.value}>{el.label}</Checkbox>
                            </Col>
                        )
                    }
                </Row>
            </Checkbox.Group>
        </>
    )
}
