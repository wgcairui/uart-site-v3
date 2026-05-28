'use client'
import { Card } from "antd"
import dayjs from "dayjs"
import { loginnerMessages } from "@/lib/api/fetchRoot"
import { DesList } from "@/components/DesList";
import { Log } from "@/components/log";

export const LogInnerMessage: React.FC = () => {

    return (
        <Log
            lastDay={120}
            dataFun={loginnerMessages}
            columns={[
                {
                    dataIndex: 'timeStamp',
                    title: '日期',
                    render: val => dayjs(val).format('MM/DD')
                },
                {
                    dataIndex: 'user',
                    title: '用户'
                },
                {
                    dataIndex: 'nikeName',
                    title: '用户昵称'
                },
                {
                    dataIndex: 'mac',
                    title: '设备mac'
                },
                {
                    dataIndex: 'pid',
                    title: 'pid'
                },
                {
                    dataIndex: 'message',
                    title: 'message'
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


export default LogInnerMessage
