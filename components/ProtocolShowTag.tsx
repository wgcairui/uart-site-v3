'use client'
import { Alert, Button, Checkbox, CheckboxOptionType, Col, Divider, Input, InputNumber, message, Modal, Row, Select, Space, Table, Tag } from "antd";
import { ColumnsType } from "antd/lib/table";
import React, { useMemo, useState } from "react";
import { addDevConstant } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { ProtocolInstructSelect } from "./ProtocolInstructSelect";

interface ProtocolProps {
    protocolName: string
}

export const ProtocolShowTag: React.FC<ProtocolProps> = ({ protocolName }) => {

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, loading, fecth, setData } = usePromise(async () => {
        const { data } = await getProtocolSetup<string>(protocolName, "ShowTag")
        return data.sys
    }, [])

    const options = useMemo<CheckboxOptionType[]>(() => {
        const Instructs = Protocol.data?.instruct
        return Instructs ? Instructs.map((el: any) => el.formResize.map((e2: any) => e2.name)).flat().map((el: string) => ({ label: el, value: el })) : []
    }, [Protocol.data, data])


    /**
     * 保存配置
     * @param values
     */
    const save = () => {
        const load = message.loading({ content: 'loading' })
        addDevConstant(Protocol.data.ProtocolType, Protocol.data.Protocol, "ShowTag", data)
            .then(el => {
                load()
                message.success("保存显示参数配置成功")
            })
    }

    return (
        <>
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


/**
 * 协议阈值配置
 * @param param0
 * @returns
 */
