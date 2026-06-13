'use client'
import { Button, Card, Collapse, Divider, Dropdown, Form, Input, Menu, message, Modal, Radio, Space, Table } from "antd";
import React, { useMemo, useState } from "react";
import { deleteProtocol, getProtocols, setProtocol, getProtocolStats } from "@/lib/api/fetchRoot";
import { generateTableKey, makeServerSearchProp, makeServerFilterProp, extractServerTableQuery } from "@/lib/utils/tableCommon";

import { usePromise } from "@/lib/hooks/usePromise";
import { ColumnsType } from "antd/lib/table";
import { useNav } from "@/lib/hooks/useNav";
import { MoreOutlined } from "@ant-design/icons";
import { MyCopy } from "@/components/common/MyCopy";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";
import { downJson } from "@/lib/utils/util";
import { getProtocol } from "@/lib/api/fetch";

interface props {
    ok?: (protocol: string) => void
}

const AddProtocol: React.FC<props> = ({ ok }) => {

    const types = [
        { value: 'ups', label: "UPS" },
        { value: 'air', label: "空调" },
        { value: 'em', label: "电量仪" },
        { value: 'th', label: "温湿度" },
        { value: 'io', label: "IO" },
    ]

    const [Type, setType] = useState<Uart.communicationType>(485)

    const [protocolType, setProtocolType] = useState<Uart.protocolType>("air")

    const [name, setName] = useState("")

    /**
     * 添加协议
     * @returns
     */
    const add = async () => {
        const { data } = await getProtocol(name)
        if (data) {
            message.warning("协议名称重复")
            return
        }
        message.loading({ content: '添加协议', key: name })
        setProtocol(Type, protocolType, name, [])
            .then(el => {
                if (el.code === 200 || el.code === 0) {
                    message.success({ content: '添加协议成功', key: name })
                    ok && ok(name)
                } else {
                    message.warning({ content: el.message || '添加失败', key: name })
                }
            })
    }

    return (

        <Form>
            <Form.Item label="协议名称">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入协议名称"></Input>
            </Form.Item>
            <Form.Item label="协议类型">
                <Radio.Group onChange={e => setType(e.target.value)} value={Type}>
                    {
                        [485, 232].map(el => <Radio value={el} key={el}>{el}</Radio>)
                    }
                </Radio.Group>
            </Form.Item>
            <Form.Item label="设备类型">
                <Radio.Group onChange={e => setProtocolType(e.target.value)} value={protocolType}>
                    {
                        types.map(el => <Radio value={el.value} key={el.label}>{el.label}</Radio>)
                    }
                </Radio.Group>
            </Form.Item>
            <Form.Item >
                <Button type="primary" onClick={() => add()} disabled={!name}>添加</Button>
            </Form.Item>
        </Form>

    )
}


export const Protocols: React.FC = () => {

    const nav = useNav()

    const [query, setQuery] = useState({ page: 1, pageSize: 20, needTotal: true })
    const [searchFields, setSearchFields] = useState<Record<string, string>>({})
    const [isAddProtocolVisible, setIsAddProtocolVisible] = useState(false)
    const apiQuery = { ...query, search: searchFields }

    const { data: protocolData, loading, fecth } = usePromise<any>(async () => {
        const el = await getProtocols(apiQuery);
        return el.data
    }, { items: [], pagination: {} }, [JSON.stringify(apiQuery)])

    const data: any[] = protocolData?.items ?? [];
    const pagination = protocolData?.pagination ?? {};

    const { data: protocolStats } = usePromise(async () => {
        const { data } = await getProtocolStats()
        return Array.isArray(data) ? data : []
    }, [])

    const deleteProtocols = async (Protocol: string) => {
        Modal.confirm({
            content: `确定要删除指令:${Protocol}吗??`,
            onOk() {
                deleteProtocol(Protocol).then((el: any) => {
                    if (el.code === 200 || el.code === 0) {
                        if (Array.isArray(el.data) && el.data.length > 0) {
                            Modal.error({ content: `设备模型 ${el.data.join(', ')} 还在使用该协议，无法删除！` })
                        } else {
                            message.success("删除协议成功")
                            fecth()
                        }
                    } else {
                        message.error(el.message || "删除协议失败")
                    }
                }).catch(() => {
                    message.error("请求失败，请检查网络或后端状态")
                })
            }
        })
    }

    const downProtocol = async (protocol?: string) => {
        const protocols = protocol ? data.filter(el => el.Protocol === protocol) : data
        downJson(JSON.stringify(protocols), `${protocol || '所有协议'}.json`)
    }

    const handleSearch = (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }))
        setQuery(prev => ({ ...prev, page: 1 }))
    }

    return (
        <>
            <PageHeader
                title="协议管理"
                extra={<Button type="primary" onClick={() => setIsAddProtocolVisible(true)}>添加协议</Button>}
            />
            <PageSummary
                items={[
                    { label: '协议总数', value: pagination.total ?? data.length, color: '#1890ff' },
                    ...(protocolStats || []).slice(0, 3).map((s: any) => ({
                        label: s.type,
                        value: s.value,
                        color: '#52c41a',
                        onClick: () => {
                            setSearchFields({})
                            setQuery(prev => ({ ...prev, page: 1, filters: { ProtocolType: [s.type] } } as any))
                        },
                    })),
                ]}
            />
            <Modal
                title="添加协议"
                open={isAddProtocolVisible}
                onCancel={() => setIsAddProtocolVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <AddProtocol ok={(p) => {
                    setIsAddProtocolVisible(false)
                    fecth()
                    nav('/admin/node/protocols/info', { Protocol: p })
                }}></AddProtocol>
            </Modal>
            <Divider></Divider>
            <Table
                loading={loading}
                dataSource={generateTableKey(data, '_id')}
                scroll={{ x: 1000 }}
                pagination={{
                    current: query.page,
                    pageSize: query.pageSize,
                    total: pagination.total,
                    showTotal: (t) => `共 ${t} 条`,
                    showSizeChanger: true,
                }}
                onChange={(pag, filters, sorter) => {
                    const sq = extractServerTableQuery(pag, filters, sorter)
                    setQuery(prev => ({
                        ...prev,
                        page: sq.page,
                        pageSize: sq.pageSize,
                        sortBy: sq.sortBy,
                        sortOrder: sq.sortOrder,
                        filters: sq.filters,
                    } as any))
                }}
                columns={[
                    {
                        dataIndex: 'Protocol',
                        title: "协议",
                        sorter: true,
                        ...makeServerSearchProp('Protocol', handleSearch),
                        width: 220
                    },
                    {
                        dataIndex: 'ProtocolType',
                        title: "协议类型",
                        ...makeServerFilterProp('ProtocolType',
                            protocolStats.map((s: any) => s.type).filter(Boolean)
                        ),
                        width: 120
                    },
                    {
                        dataIndex: "Type",
                        title: "串口类型",
                        ...makeServerFilterProp('Type', ['485', '232']),
                        width: 120
                    },
                    {
                        dataIndex: "remark",
                        title: '备注',
                        ellipsis: true,
                        ...makeServerSearchProp('remark', handleSearch),
                        render: val => <MyCopy value={val}></MyCopy>
                    },
                    {
                        key: "oprate",
                        title: "操作",
                        width: 110,
                        render: (_, re) => <Space size={0} wrap>
                            <Button type="link" onClick={() => nav('/admin/node/protocols/info', { Protocol: re.Protocol })}>查看</Button>
                            <Dropdown menu={{
                                items: [
                                    { key: '1', label: <span onClick={() => downProtocol(re.Protocol)}>下载协议</span> },
                                    { key: '2', label: <span onClick={() => {}}>更新协议</span>, disabled: true },
                                    { key: '3', label: <span onClick={() => deleteProtocols(re.Protocol)}>删除</span> }
                                ]
                            }}>
                                <MoreOutlined />
                            </Dropdown>
                        </Space>
                    }
                ] as ColumnsType<Uart.protocol>}
            >
            </Table>
        </>
    )
}

export default Protocols
