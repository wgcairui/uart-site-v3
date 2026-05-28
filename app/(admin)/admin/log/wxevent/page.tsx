'use client'
import { log_wxEvent } from "@/lib/api/fetchRoot"
import { getColumnSearchProp } from "@/lib/utils/tableCommon"
import { Log } from "@/components/log";
import { DesList } from "@/components/DesList";

export const LogWxEvent: React.FC = () => {
    return (
        <Log
            dataFun={log_wxEvent}
            cPie={[
                'MsgType',
                'Event',
                'FromUserName']}
            columns={[
                {
                    dataIndex: 'FromUserName',
                    title: '用户',
                    ...getColumnSearchProp('FromUserName')
                },
                {
                    dataIndex: 'MsgType',
                    title: '类型'
                },
                {
                    dataIndex: 'Content',
                    title: 'Content'
                },
                {
                    dataIndex: 'Event',
                    title: '事件'
                }
            ]}

            expandable={{
                expandedRowRender: li => <DesList title="Data" data={li} />
            }}
        />
    )
}


export default LogWxEvent
