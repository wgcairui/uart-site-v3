'use client'
import { Button, Card, Col, Row, Table, Timeline } from "antd";
import { ColumnsType } from "antd/lib/table";
import dayjs from "dayjs";
import React, { useState } from "react";
import { getAlarm, logUserAggs } from "@/lib/api/fetchRoot";
import { RepeatFilter } from "@/lib/utils/util";
import { generateTableKey, getColumnSearchProp, tableColumnsFilter, tableConfig } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { MyDatePickerRange } from "@/components/common/MyDatePickerRange";
import { ResultDataParse } from "@/components/data/ResultDataParse";

interface Props {
    user: string
}

/**
 * @returns
 */
export const UserLog: React.FC<Props> = ({ user }) => {

    const [date, setDate] = useState<dayjs.Dayjs[]>()

    const { data, loading, fecth } = usePromise(async () => {
        if (date) {
            const { data } = await logUserAggs(user, date[0]?.valueOf() || 0, date[1]?.valueOf() || 0)
            return data.items
        } else {
            return []
        }
    }, [], [date])

    const alarm = usePromise(async () => {
        if (date) {
            const { data } = await getAlarm(user, date[0]?.valueOf() || 0, date[1]?.valueOf() || 0)
            return data.items
        } else {
            return []
        }
    }, [], [date])

    const timelineItems = RepeatFilter(data.map((el: any) => {
        if (!el.msg) el.msg = el.type
        return el
    }), 'msg').map(({ msg, type, timeStamp }: any, i: number) => ({
        color: type === '请求' ? 'blue' : 'green',
        key: timeStamp + i,
        title: dayjs(timeStamp).format('MM-DD H:m:s:SSS'),
        content: <p>{msg || type}</p>
    }))

    return (
        <>
            <MyDatePickerRange lastDay={30} onChange={(r) => setDate(r as any)}>
                <Button type="primary" onClick={() => fecth()}>刷新</Button>
            </MyDatePickerRange>
            <Card >
                <Row>
                    <Col span={16} style={{ maxHeight: 600, overflow: 'auto' }}>
                        <Table
                            {...(tableConfig as any)}
                            dataSource={generateTableKey(alarm.data.reverse(), "timeStamp")}
                            loading={alarm.loading}
                            rowClassName={(re: any) => re.isOk ? '' : 'alarm'}
                            columns={[
                                {
                                    dataIndex: 'devName',
                                    title: 'name',
                                    width: 120,
                                    ...tableColumnsFilter(alarm.data, 'devName'),
                                    ellipsis: true
                                },
                                {
                                    dataIndex: 'mac',
                                    title: 'mac',
                                    ...tableColumnsFilter(alarm.data, 'mac'),
                                    width: 150
                                },
                                {
                                    dataIndex: 'pid',
                                    title: 'pid',
                                    width: 60
                                },
                                {
                                    dataIndex: 'tag',
                                    title: 'tag',
                                    width: 120,
                                    ...tableColumnsFilter(alarm.data, 'tag'),
                                },
                                {
                                    dataIndex: 'msg',
                                    title: 'msg',
                                    ...getColumnSearchProp('msg'),
                                    ellipsis: true
                                },
                                {
                                    dataIndex: 'timeStamp',
                                    title: '时间',
                                    render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),

                                }
                            ] as ColumnsType<Uart.uartAlarmObject>}

                            expandable={{
                                rowExpandable: (li: any) => Boolean(li.parentId),
                                expandedRowRender: (li: any) => <ResultDataParse id={li.parentId!} />
                            }}
                        />
                    </Col>
                    <Col span={8} style={{ maxHeight: 600, overflow: 'auto' }}>
                        <Timeline mode='start' items={timelineItems} />
                    </Col>
                </Row>
            </Card>
        </>
    )
}
