'use client'
import React, { useState } from "react"
import { Table, Tag, Card, Modal } from "antd"
import dayjs from "dayjs"
import { ClientResultSingle, ClientResultList } from "@/lib/api/fetchRoot"
import { clientResultExpandableExpandedRowRender } from "@/components/data/ClientResultExpandable"
import { usePromise } from "@/lib/hooks/usePromise"
import { PaginationReq } from "@/types"

export const TerminalCurData: React.FC<{ mac: string; pid: number }> = ({ mac, pid }) => {

    const { data, loading } = usePromise(async () => {
        const el = await ClientResultSingle({ page: 1, pageSize: 1, needTotal: false, search: { mac }, filters: { pid: [String(pid)] } })
        return (el?.data as any)?.items?.[0]
    }, undefined, [mac, pid])

    if (loading) return null
    if (!data) return <div style={{ padding: 16 }}>暂无数据</div>

    return (
        <Card size="small" title={dayjs(data.time).format('YYYY-MM-DD HH:mm:ss')}>
            <Table
                dataSource={data.result || []}
                rowKey="name"
                pagination={false}
                loading={loading}
                columns={[
                    { dataIndex: 'name', title: '参数' },
                    { dataIndex: 'value', title: '值' },
                    { dataIndex: 'parseValue', title: '解析值' },
                    { dataIndex: 'alarm', title: '告警', render: (v?: boolean) => <Tag color={v ? 'red' : 'success'}>{v ? '是' : '否'}</Tag> },
                ]}
            />
        </Card>
    )
}

export const TerminalHistoryData: React.FC<{ mac: string; pid: number }> = ({ mac, pid }) => {

    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true })
    const [selected, setSelected] = useState<any>(null)

    const { data, loading } = usePromise(async () => {
        const startTs = Date.now() - 24 * 60 * 60 * 1000
        const endTs = Date.now()
        const el = await ClientResultList(startTs, endTs, mac, pid, query)
        return el?.data
    }, undefined, [mac, pid, JSON.stringify(query)])

    const items = (data as any)?.items ?? []

    return (
        <>
            <Table
                rowKey="_id"
                loading={loading}
                dataSource={items}
                pagination={{
                    current: query.page ?? 1,
                    pageSize: query.pageSize ?? 20,
                    total: (data as any)?.pagination?.total,
                    showTotal: (t: number) => `共 ${t} 条`,
                    showSizeChanger: true,
                }}
                onChange={(pag) => {
                    setQuery(prev => ({
                        ...prev,
                        page: pag.current ?? 1,
                        pageSize: pag.pageSize ?? 20,
                    }))
                }}
                columns={[
                    { dataIndex: 'mac', title: 'mac', width: 180 },
                    { dataIndex: 'pid', title: 'pid', width: 60 },
                    { dataIndex: 'hasAlarm', title: '告警', width: 60, render: (v?: boolean) => <Tag color={v ? 'red' : 'success'}>{v ? '是' : '否'}</Tag> },
                    { dataIndex: 'useTime', title: 'useTime', width: 80 },
                    { dataIndex: 'timeStamp', title: '时间', width: 160, render: (v?: number) => v ? dayjs(v).format("YYYY/MM/DD HH:mm:ss") : '-' }
                ]}
                onRow={(record) => ({
                    onClick: () => setSelected(record),
                    style: { cursor: 'pointer' },
                })}
            />
            <Modal
                title={selected ? dayjs(selected.timeStamp).format('YYYY-MM-DD HH:mm:ss') : ''}
                open={!!selected}
                onCancel={() => setSelected(null)}
                width={800}
                footer={null}
            >
                {selected ? clientResultExpandableExpandedRowRender(selected) : null}
            </Modal>
        </>
    )
}
