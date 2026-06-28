'use client'
import { DeleteFilled, EditFilled } from "@ant-design/icons";
import { Button, Card, Divider, Form, Input, message, Modal, Select, Space, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
import React, { useMemo } from "react";
import { addDevConstant } from "@/lib/api/fetchRoot";
import { getProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { AiProtocolEmpty } from "./AiProtocolEmpty";

interface ProtocolProps {
    protocolName: string
    user?: string
    isAdmin?: boolean
}

export const ProtocolOprate: React.FC<ProtocolProps> = ({ protocolName }) => {


    const opt = {
        io: ["断开", "闭合"],
        air: ["开机", "关机", "制冷", "制热", "湿度", "除湿"],
        ups: ["开机", "关机", "测试"],
        em: [],
        th: []
    } as Record<Uart.protocolType, string[]>

    const initData: Uart.OprateInstruct = {
        name: '',
        value: '',
        tag: '',
        bl: '1',
        readme: ''
    }

    const [form] = Form.useForm()

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName);
        return el.data;
    })

    const { data, loading, fecth, setData } = usePromise<Uart.OprateInstruct[]>(async () => {
        const { data } = await getProtocolSetup<Uart.OprateInstruct>(protocolName, 'OprateInstruct') as { data: { sys: Uart.OprateInstruct[]; user: Uart.OprateInstruct[] } }
        return data.sys as Uart.OprateInstruct[]
    }, [])


    const tags = useMemo(() => {
        if (Protocol.data) {
            const type = Protocol.data.ProtocolType
            return opt[type]
        } else {
            return []
        }
    }, [Protocol.data])

    /**
     * 编辑已有指令
     * @param item
     */
    const edit = (item: Uart.OprateInstruct) => {
        form.setFieldsValue(item)
    }

    /**
     * 删除已有指令
     * @param item
     */
    const deleteOprate = (item: Uart.OprateInstruct) => {
        Modal.confirm({
            content: `确定删除指令:${item.name}??`,
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
        addDevConstant(Protocol.data.ProtocolType, Protocol.data.Protocol, 'OprateInstruct', data)
            .then(el => {
                load()
                message.success("保存操作指令成功")
            })
    }


    /**
     * 保存form
     * @param item
     */
    const save = (item: Uart.OprateInstruct) => {
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
            <Card title="操作指令" bordered={false}>
            <AiProtocolEmpty
                typeName="操作指令"
                typeKey="OprateInstruct"
                protocolName={protocolName}
                source={Protocol.data?.source}
                remark={Protocol.data?.remark}
                empty={!loading && (!data || data.length === 0)}
            />
            <Form form={form} onFinish={save} labelCol={{ span: 3 }} initialValues={initData}>
                <Form.Item name="name" label="指令名称" required>
                    <Input />
                </Form.Item>
                <Form.Item name="value" label="指令值" required>
                    <Input />
                </Form.Item>
                <Form.Item name="tag" label="指令标签">
                    <Select>
                        {
                            tags.map(el => <Select.Option value={el} key={el}>{el}</Select.Option>)
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="bl" label="系数" extra="" required>
                    <Select defaultValue="1">
                        {
                            [1, 0.1, 10, 100, 1000, 0.01, 0.001].map(String).map(el => <Select.Option value={el} key={el}>{el}</Select.Option>)
                        }
                    </Select>
                </Form.Item>
                <Form.Item name="readme" label="指令说明">
                    <Input.TextArea autoSize />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 3, span: 16 }}>
                    <Button type="primary" htmlType="submit">保存</Button>
                </Form.Item>
            </Form>
            <Divider plain>指令列表</Divider>
            <Space>
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
                        dataIndex: 'value',
                        title: '指令值'
                    },
                    {
                        dataIndex: 'tag',
                        title: '指令标签'
                    },
                    {
                        dataIndex: 'bl',
                        title: '系数'
                    },
                    {
                        dataIndex: 'readme',
                        title: '说明'
                    },
                    {
                        key: 'oprate',
                        title: '操作',
                        render: (_, re) => <Space>
                            <EditFilled onClick={() => edit(re)}></EditFilled>
                            <DeleteFilled onClick={() => deleteOprate(re)}></DeleteFilled>
                        </Space>
                    }
                ] as ColumnsType<Uart.OprateInstruct>}
            ></Table>
            </Card>
        </>
    )
}


