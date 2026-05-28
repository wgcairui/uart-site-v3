'use client'
import { FundFilled, InfoCircleFilled } from "@ant-design/icons"
import { Card, Divider, Empty, Table, Tag, Tooltip } from "antd"
import { ColumnsType } from "antd/lib/table"
import Link from "next/link"
import dayjs from "dayjs"
import React from "react"
import { ClientResult } from "@/lib/api/fetchRoot"
import { generateTableKey, getColumnSearchProp } from "@/lib/utils/tableCommon"
import { usePromise } from "@/lib/hooks/usePromise"
import { ResultDataOriginal } from "./ResultDataOriginal"

export const ResultDataParse: React.FC<{ id: string }> = ({ id }) => {

    const { loading, data } = usePromise(async () => {
        if (id) {
            const start = dayjs().startOf('day').valueOf()
            const end = dayjs().valueOf()
            const { data } = await ClientResult(start, end, id)
            return data?.items?.[0]
        } else {
            return undefined
        }
    }, undefined, [id])



    return (
        !data ? <Empty />
            : <Card>
                <Divider plain>解析数据</Divider>
                <Table loading={loading} dataSource={generateTableKey(data.result, 'name')}
                    columns={[
                        {
                            dataIndex: 'name',
                            title: '参数',
                            ...getColumnSearchProp('name')
                        },
                        {
                            dataIndex: 'value',
                            title: '值'
                        },
                        {
                            dataIndex: 'parseValue',
                            title: '解析值',
                            render: (value, record) => (
                                <span>{value }
                                    <Tooltip color="cyan" title={`查看[${record.name}]的历史记录`}>
                                        <Link
                                            href={`/root/node/terminal/devline?name=${record.name}&mac=${data.mac}&pid=${data.pid}`}>
                                            <FundFilled style={{ marginLeft: 8 }} />
                                        </Link>
                                    </Tooltip>

                                    {
                                        record.alarm ? <InfoCircleFilled style={{ color: "#E6A23C" }} /> : <a />
                                    }

                                </span>
                            )
                        },
                        {
                            dataIndex: 'alarm',
                            title: '告警',
                            render: val => <Tag color={val ? 'red' : 'success'}>{val ? '是' : '否'}</Tag>
                        }
                    ] as ColumnsType<Uart.queryResultArgument>}
                />
                <Divider plain>原始数据</Divider>
                <ResultDataOriginal id={data.parentId} />
            </Card>
    )
}


