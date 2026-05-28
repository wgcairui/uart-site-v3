'use client'
import { Table } from "antd"
import dayjs from "dayjs"
import React from "react"
import { ClientResults } from "@/lib/api/fetchRoot"
import { generateTableKey } from "@/lib/utils/tableCommon"
import { usePromise } from "@/lib/hooks/usePromise"
import { MyCopy } from "./myCopy"

export const ResultDataOriginal: React.FC<{ id: string }> = ({ id }) => {

    const { loading, data } = usePromise(async () => {
        if (id) {
            const start = dayjs().startOf('day').valueOf()
            const end = dayjs().valueOf()
            const { data } = await ClientResults(start, end, id)
            return data.items[0]?.contents || []
        } else {
            return []
        }
    }, [], [id])

    return (
        <Table loading={loading} dataSource={generateTableKey(data, 'content')} pagination={false}
            columns={[
                {
                    dataIndex: 'content',
                    title: '指令'
                },
                {
                    dataIndex: 'data',
                    title: '数据',
                    render: (val: number[]) => <MyCopy value={val.map(el => el.toString(16).padStart(2, '0')).join(' ')} />
                }
            ]}
        />
    )
}

/**
 * 展示设备解析数据
 * @param param0
 * @returns
 */
