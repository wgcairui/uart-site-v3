'use client'
import { Card } from "antd"
import { logmailsends } from "@/lib/api/fetchRoot"
import { getColumnSearchProp } from "@/lib/utils/tableCommon"
import { Log } from "@/components/log";
import { DesList } from "@/components/DesList";


export const LogMail: React.FC = () => {
    return (
        <Log
            lastDay={30}
            dataFun={logmailsends}
            cPie={["mails"]}
            columns={[
                {
                    dataIndex: 'mails',
                    title: 'mails',
                    ...getColumnSearchProp('mails')
                },
                {
                    dataIndex: 'sendParams',
                    title: 'sendParams',
                    ellipsis: true,
                    render: val => val.html,
                },
                {
                    key: 'result',
                    title: 'result',
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
    )
}

export default LogMail
