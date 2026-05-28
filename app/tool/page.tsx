'use client'

import { Button, Card, Form, Input, InputNumber, Layout, Select, Tabs } from "antd"
import React, { useEffect, useState } from "react"
import { crc } from "@/lib/api/fetch"

const Prifx: React.FC = () => {

    const [prifx, setPrifx] = useState('')
    const [split, setSplit] = useState('\n')
    const [content, setContent] = useState('')
    const [result, setResult] = useState('')

    useEffect(() => {
        const datas = content.split(split)
        const data = datas.map(el => prifx + el).join(split)
        console.log({ datas, data })
        setResult(data)
    }, [prifx, split, content])

    return (

        <Form labelCol={{ span: 3 }} >
            <Form.Item label="前戳" name="prifx">
                <Input value={prifx} onChange={e => setPrifx(e.target.value)}></Input>
            </Form.Item>
            <Form.Item label="分隔符" name="split">
                <Input value={split} onChange={e => setSplit(e.target.value)}></Input>
            </Form.Item>
            <Form.Item label="内容" name="content">
                <Input.TextArea minLength={2} autoSize value={content} onChange={e => setContent(e.target.value)}></Input.TextArea>
            </Form.Item>
            <Form.Item label="序列化">
                <Input.TextArea minLength={2} autoSize value={result}></Input.TextArea>
            </Form.Item>
        </Form>
    )
}

interface crcOption {
    protocolType: number;
    pid: number;
    instructN: string;
    address: number;
    value: number;
}

const Crc: React.FC = () => {

    const [Modbus] = useState<crcOption>({
        protocolType: 1,
        pid: 1,
        instructN: "03",
        address: 0,
        value: 0
    })

    const [result, setResult] = useState('')

    const finsh = (value: crcOption) => {
        crc({ ...value, protocolType: 1 })
            .then(el => setResult(el))
    }
    return (
        <Form initialValues={Modbus} labelCol={{ span: 3 }} onFinish={finsh}>
            <Form.Item label="Pid" name="pid">
                <InputNumber></InputNumber>
            </Form.Item>
            <Form.Item label="指令类型" name="instructN">
                <Select>
                    {
                        ['01', '02', '03', '04', '05', '06'].map(el => <Select.Option value={el} key={el}>{el}</Select.Option>)
                    }
                </Select>
            </Form.Item>
            <Form.Item label="起始地址" name="address">
                <InputNumber></InputNumber>
            </Form.Item>
            <Form.Item label="长度/值" name="value">
                <InputNumber></InputNumber>
            </Form.Item>
            <Form.Item label="crc">
                <Input value={result}></Input>
            </Form.Item>
            <Form.Item>
                <Button htmlType="submit">获取指令</Button>
            </Form.Item>
        </Form>
    )
}

const Tool: React.FC = () => {
    return (
        <Layout className="layout" style={{ display: "flex", height: "100%" }}>
            <Layout.Header>
                <div className="logo" />
            </Layout.Header>
            <Layout.Content style={{ padding: '0 50px', overflow: "auto" }}>
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: 'crc',
                        label: 'CRC16',
                        children: (
                            <Card>
                                <Crc />
                            </Card>
                        ),
                    },
                    {
                        key: 'sub',
                        label: 'SUB',
                        children: (
                            <Card style={{ overflow: "auto" }}>
                                <Prifx />
                            </Card>
                        ),
                    },
                ]} />
            </Layout.Content>
            <Layout.Footer style={{ textAlign: 'center', marginTop: "auto" }}>ladis tool</Layout.Footer>
        </Layout>
    )
}

export default Tool
