'use client'

import React, { useMemo, useState } from "react";
import { getAlarm, confrimAlarm } from "@/lib/api/fetch";
import { Card, Row, Col, DatePicker, Table, Space, Button, Form, Popconfirm, message, Divider, Descriptions } from "antd"
import dayjs from "dayjs"
import { generateTableKey, getColumnSearchProp, tableColumnsFilter } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { PageSummary } from "@/components/common/PageSummary";

import { PaginationReq, V2ListResponse } from "@/types";

interface alarms extends Uart.uartAlarmObject {
    _id?: string
}

const Alarm: React.FC = () => {

    const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(6, "month"), dayjs()])

    const [pageReq, setPageReq] = useState<PaginationReq>({ page: 1, pageSize: 20 });
    const { data, fecth, loading, setData } = usePromise<V2ListResponse<alarms>>(async () => {
        const { data } = await getAlarm(dates[0].format("YYYY/MM/DD H:m:s"), dates[1].format("YYYY/MM/DD H:m:s"), pageReq)
        return data as unknown as V2ListResponse<alarms>
    }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [dates, pageReq.page, pageReq.pageSize])
    const alarms = data?.items ?? [];



    const lineData = useMemo(() => {
        const maps: Map<string, alarms[]> = new Map()
        alarms.forEach(el => {
            const date = new Date(el.timeStamp).toLocaleDateString()
            if (!maps.has(date)) maps.set(date, [])
            maps.get(date)!.push(el)
        })
        return [...maps.entries()].map(([date, u]) => ({ date, count: u.length }))
    }, [alarms])

    const pieData = useMemo(() => {
        const maps: Map<string, alarms[]> = new Map()
        alarms.forEach(el => {
            const tag = el.tag || 'other'
            if (!maps.has(tag)) maps.set(tag, [])
            maps.get(tag)!.push(el)
        })
        return [...maps.entries()].map(([tag, u]) => ({ tag, count: u.length }))
    }, [alarms])

    /**
     * 确认告警,然后变更数据
     * @param _id
     * @returns
     */
    const confirm = async (_id?: string) => {
        await confrimAlarm(_id);
        if (_id) {
            const a = alarms.find(el_1 => el_1._id === _id);
            if (a)
                a.isOk = true;

            setData({ ...data, items: [...alarms] })
        } else fecth()
        message.success("操作成功")
    }



    return (
        <>
            <PageSummary
                items={[
                    { label: '告警总数', value: alarms.length, variant: 'primary' },
                    { label: '未确认', value: alarms.filter(a => !a.isOk).length, variant: 'warning' },
                    { label: '已确认', value: alarms.filter(a => a.isOk).length, variant: 'success' },
                    { label: '类型数', value: pieData.length, variant: 'info' },
                ]}
            />
            <Form layout="inline" style={{ margin: 8 }}>
                <Form.Item label="选择时间区间">
                    <DatePicker.RangePicker defaultValue={dates as any} onChange={(value) => setDates(value as any)} />
                </Form.Item>
                <Form.Item>
                    <Popconfirm title="是否确认全部告警,操作无法取消" onCancel={() => message.warning("取消操作")} onConfirm={() => {
                        confirm().then(() => message.success("操作成功!!!"))
                    }}>
                        <Button shape="round" type="primary">确认全部告警</Button>
                    </Popconfirm>
                </Form.Item>
            </Form>
            <Card>
                <Row gutter={12}>
                    <Col span={24} md={8} sm={0} key="chart">
                        <Card>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Divider plain>告警类型占比</Divider>
                                <Descriptions bordered column={1} size="small">
                                    {pieData.map(item => <Descriptions.Item label={item.tag} key={item.tag}>{item.count}</Descriptions.Item>)}
                                </Descriptions>
                                <Divider plain>告警数量</Divider>
                                <Descriptions bordered column={1} size="small">
                                    {lineData.map(item => <Descriptions.Item label={item.date} key={item.date}>{item.count}</Descriptions.Item>)}
                                </Descriptions>
                            </Space>
                        </Card>
                    </Col>
                    <Col span={24} md={16} key="table">
                        <Table dataSource={generateTableKey(alarms, '_id')} size="small" sticky
                            pagination={{
                                current: data.pagination.page,
                                pageSize: data.pagination.pageSize,
                                total: data.pagination.total,
                                onChange: (page, pageSize) => setPageReq({ ...pageReq, page, pageSize })
                            }}
                        >
                            <Table.Column responsive={["sm"]} title='网关' dataIndex='mac' key="mac" ellipsis {...tableColumnsFilter(alarms, 'mac')} ></Table.Column>
                            <Table.Column title='设备' dataIndex='devName' key="devName" {...tableColumnsFilter(alarms, 'devName')}></Table.Column>
                            <Table.Column title='消息' dataIndex='msg' key="msg" ellipsis  {...getColumnSearchProp<alarms>('msg')}
                                render={(val, record:any) =>
                                    <Popconfirm
                                        title={val}
                                        onConfirm={() => confirm(record._id)}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                       {val}
                                    </Popconfirm>
                                }
                            ></Table.Column>
                            <Table.Column responsive={["sm"]} title='类型' dataIndex='tag' key="tag" {...tableColumnsFilter(alarms, "tag")}></Table.Column>
                            <Table.Column title='时间' dataIndex='timeStamp' key="timeStamp"
                                defaultSortOrder='descend'
                                sorter={(a: any, b: any) => a.timeStamp - b.timeStamp}
                                render={
                                    (value: number) => (
                                        <p>{dayjs(value).format('MM-DD H:M:s')}</p>
                                    )
                                }></Table.Column>
                            <Table.Column title='操作' key="oprate" render={(_, record: alarms) => {
                                return (
                                    record.isOk ? <a >已确认</a> : <Button type="primary" danger size="small" onClick={() => confirm(record._id)}>确认告警</Button>
                                )
                            }}></Table.Column>
                        </Table>
                    </Col>
                </Row>
            </Card>

        </>
    )
}

export default Alarm
