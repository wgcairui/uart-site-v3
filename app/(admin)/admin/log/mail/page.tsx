'use client'
import { Card } from "antd"
import { logmailsends } from "@/lib/api/fetchRoot"
import { getColumnSearchProp } from "@/lib/utils/tableCommon"
import { Log } from "@/components/log/log";
import { DesList } from "@/components/data/DesList";
import { PageHeader } from "@/components/common/PageHeader";


export const LogMail: React.FC = () => {
    return (
        <>
            <PageHeader
                title="邮件日志"
                subtitle="查看邮件发送历史"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '日志' },
                ]}
            />
            <Log
                lastDay={30}
                dataFun={logmailsends}
                cPie={["mails"]}
                columns={[
                    {
                        dataIndex: 'mails',
                        title: '收件人',
                        ...getColumnSearchProp('mails')
                    },
                    {
                        dataIndex: 'sendParams',
                        title: '发送参数',
                        ellipsis: true,
                        render: val => val.html,
                    },
                    {
                        key: 'result',
                        title: '结果',
                        render: (_, sms: Uart.logMailSend) => sms?.Success?.response || sms?.Error?.message || 'null'
                    }
                ]}

                expandable={{
                    expandedRowRender: (li: Uart.logSmsSend) =>
                        <Card>
                            <DesList title="sendParams" data={li.sendParams} />
                            <DesList title="Success" data={li.Success} />
                            <DesList title="Error" data={li.Error} />
                        </Card>
                }}
            >

            </Log>
        </>
    )
}

export default LogMail
