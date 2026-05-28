'use client'
import { Card } from "antd"
import dayjs from "dayjs"
import { logbulls } from "@/lib/api/fetchRoot"
import { DesList } from "@/components/DesList";
import { Log } from "@/components/log";

export const LogBull: React.FC = () => {

    return (
        <Log
            lastDay={120}
            dataFun={logbulls}
            columns={[
                {
                    dataIndex: 'timeStamp',
                    title: '日期',
                    render: val => dayjs(val).format('MM/DD')
                },
                {
                    dataIndex: 'jobName',
                    title: '队列'
                },
                {
                    dataIndex: 'id',
                    title: 'workId'
                },
                {
                    dataIndex: 'data',
                    title: 'message',
                    render:(val:any)=>val?.message || ''
                }
            ]}

            expandable={{
                expandedRowRender: (li: any) =>
                    <Card>
                        <DesList title="data" data={li.data} />
                    </Card>
            }}
        />
    )
}


export default LogBull
