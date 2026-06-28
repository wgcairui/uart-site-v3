'use client'
import { DeleteFilled, EditFilled } from "@ant-design/icons";
import { Button, Divider, Form, InputNumber, message, Modal, Select, Space, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
import React, { useMemo } from "react";
import { addDevConstant } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { AiProtocolEmpty } from "./AiProtocolEmpty";

interface ProtocolProps {
    protocolName: string
}

export const ProtocolThreshold: React.FC<ProtocolProps> = ({ protocolName }) => {

    const initData: Uart.Threshold = {
        name: '',
        min: 0,
        max: 100
    }

    const [form] = Form.useForm()

    const Protocol = usePromise(() => {
        return getProtocol(protocolName).then(el => el.data)
    })

    const { data, loading, fecth, setData } = usePromise(async () => {
        const { data } = await getProtocolSetup<Uart.Threshold>(protocolName, "Threshold")
        return data.sys
    }, [])

    const options = useMemo(() => {
        const Instructs = Protocol.data?.instruct
        if (Instructs) {
            return Instructs.map((el: any) => el.formResize.filter((e2: any) => !e2.isState).map((e2: any) => e2.name)).flat()
        } else {
            return []
        }
    }, [Protocol.data])


    /**
     * 编辑已有指令
     * @param item
     */
    const edit = (item: Uart.Threshold) => {
        form.setFieldsValue(item)
    }

    /**
     * 删除已有指令
     * @param item
     */
    const deleteOprate = (item: Uart.Threshold) => {
        Modal.confirm({
            content: `确定删除阈值:${item.name}??`,
            onOk() {
                const index = data.findIndex(el => el.name === item.name)
                data.splice(index, 1)
                setData([...data])
            }
        })
    }


    /**
     * 保存操作指令
     */
    const saveOprates = () => {
        const load = message.loading({ content: 'loading' })
        addDevConstant(Protocol.data.ProtocolType, Protocol.data.Protocol, "Threshold", data)
            .then(el => {
                load()
                message.success("保存阈值配置成功")

            })
    }


    /**
     * 保存form
     * @param item
     */
    const save = (item: Uart.Threshold) => {
        const index = data.findIndex(el => el.name === item.name)
        if (index === -1) {
            setData([item, ...data])
        } else {
            data.splice(index, 1, item)
            setData([...data])
        }
        form.setFieldsValue(initData)
    }

    return (
        <>
            <AiProtocolEmpty
                typeName="阈值配置"
                typeKey="Threshold"
                protocolName={protocolName}
                source={Protocol.data?.source}
                remark={Protocol.data?.remark}
                empty={!loading && (!data || data.length === 0)}
            />
            <Form form={form} initialValues={initData} onFinish={save} layout="inline">
                <Form.Item name="name" label="参数" required
                    rules={[
                        {
                            required: true
                        }
                    ]}
                >
                    <Select
                        loading={loading}
                        showSearch
                        placeholder="选择参数"
                        style={{ minWidth: 120 }}
                    >
                        {
                            options.map((el: string) => <Select.Option value={el} key={el} >{el}</Select.Option>)
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="min" label="最小值" required
                    rules={[
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                return value < getFieldValue("max") ? Promise.resolve() : Promise.reject(new Error('必须小于最大值'))
                            }
                        })
                    ]}
                >
                    <InputNumber></InputNumber>
                </Form.Item>
                <Form.Item name="max" label="最大值" required
                    rules={[
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                return value > getFieldValue("min") ? Promise.resolve() : Promise.reject(new Error('必须大于最小值'))
                            }
                        })
                    ]}
                >
                    <InputNumber></InputNumber>
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 3 }}>
                    <Button type="primary" htmlType="submit">保存</Button>
                </Form.Item>
            </Form>
            <Divider plain>阈值列表</Divider>
            <Space >
                <Button type="primary" onChange={() => setData([])}>清除所有</Button>
                <Button type="primary" onClick={() => saveOprates()}>上传保存</Button>
            </Space>
            <Table
                loading={loading}
                dataSource={generateTableKey(data, "name")}
                pagination={false}
                columns={[
                    {
                        dataIndex: 'name',
                        title: '指令名称'
                    },
                    {
                        dataIndex: 'min',
                        title: '最小值'
                    },
                    {
                        dataIndex: 'max',
                        title: '最大值'
                    },
                    {
                        key: 'oprate',
                        title: '操作',
                        render: (_, re) => <Space>
                            <EditFilled onClick={() => edit(re)}></EditFilled>
                            <DeleteFilled onClick={() => deleteOprate(re)}></DeleteFilled>
                        </Space>
                    }
                ] as ColumnsType<Uart.Threshold>}
            ></Table>
        </>
    )
}


/**
 * 协议状态配置
 * @param param0
 * @returns
 */
