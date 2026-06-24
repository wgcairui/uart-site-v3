'use client'
import { Modal, Alert } from "antd"
import { useState } from "react"
import { logterminals } from "@/lib/api/fetchRoot"

import { DesList } from "@/components/data/DesList";
import { Log } from "@/components/log/log";

interface Props {
    mac?: string
}

/**
 * 设备通信日志
 */
export const LogTerminal: React.FC<Props> = ({ mac }) => {
    const [selected, setSelected] = useState<Uart.logTerminals | null>(null)

    return (
        <>
            <Log lastDay={5}
                dataFun={logterminals}
                filterMac={mac}
                cPie={['type']}
                columns={[
                    {
                        dataIndex: 'NodeName',
                        title: 'NodeName'
                    },
                    {
                        dataIndex: 'type',
                        title: '事件',
                    },
                    {
                        dataIndex: 'timeStamp',
                        title: '时间',
                        render: (val: number) => val ? new Date(val).toLocaleString() : '-'
                    },
                ]}
                onRowClick={setSelected}
            />

            <Modal
                title="通信日志详情"
                open={!!selected}
                onCancel={() => setSelected(null)}
                footer={null}
                width={600}
            >
                {selected && (
                    <>
                        <DesList title="基本信息" data={{
                            mac: selected.TerminalMac,
                            NodeName: selected.NodeName,
                            NodeIP: selected.NodeIP,
                            事件: selected.type,
                            时间: selected.timeStamp ? new Date(selected.timeStamp).toLocaleString() : '-',
                        }} />
                        {selected.msg && (
                            <Alert
                                type="warning"
                                title="消息内容"
                                description={selected.msg}
                                style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}
                            />
                        )}
                        {selected.query && <DesList title="Query" data={selected.query} style={{ marginTop: 16 }} />}
                        {selected.result && <DesList title="Result" data={selected.result} style={{ marginTop: 16 }} />}
                    </>
                )}
            </Modal>
        </>
    )
}