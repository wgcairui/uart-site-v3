'use client'
import { Card } from "antd"
import { logwxsubscribes } from "@/lib/api/fetchRoot"
import { Log } from "@/components/log";
import { DesList } from "@/components/DesList";

export const LogWxSubscribe: React.FC = () => {
    return (
        <Log
            lastDay={10}
            dataFun={logwxsubscribes}
            cPie={['touser']}
            columns={[
                {
                    dataIndex: 'touser',
                    title: '用户'
                },
                {
                    dataIndex: 'data',
                    title: '消息',
                    render: val => val?.remark?.value || ''
                },
                {
                    dataIndex: 'result',
                    title: '状态',
                    render: val => val.errmsg
                }
            ]}

            expandable={{
                expandedRowRender: li =>
                    <Card>
                        <DesList title="data" data={li.data} />
                        <DesList title="result" data={li.result} />
                    </Card>
            }}
        />
    )
}


export default LogWxSubscribe
