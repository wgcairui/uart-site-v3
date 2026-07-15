'use client'
import { Card } from "antd"
import { logwxsubscribes } from "@/lib/api/fetchRoot"
import { Log } from "@/components/log/log";
import { DesList } from "@/components/data/DesList";
import { PageHeader } from "@/components/common/PageHeader";

export const LogWxSubscribe: React.FC = () => {
    return (
        <>
            <PageHeader
                title="微信告警事件日志"
                subtitle="查看微信公众号告警推送历史"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '日志' },
                ]}
            />
            <Log
                lastDay={10}
                dataFun={logwxsubscribes}
                cPie={['touser']}
                columns={[
                    {
                        dataIndex: 'touser',
                        title: '用户 OpenID'
                    },
                    {
                        dataIndex: 'data',
                        title: '消息内容',
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
        </>
    )
}


export default LogWxSubscribe
