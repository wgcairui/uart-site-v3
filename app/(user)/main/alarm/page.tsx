'use client'

import React, { useMemo, useState } from "react";
import { getAlarm, confrimAlarm, isValidAlarmId } from "@/lib/api/fetch";
import { Card, Row, Col, DatePicker, Table, Space, Button, Form, Popconfirm, message, Divider, Descriptions } from "antd"
import dayjs from "dayjs"
import { generateTableKey, getColumnSearchProp, tableColumnsFilter } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { PageSummary } from "@/components/common/PageSummary";

import { PaginationReq } from '@/types'

interface alarms extends Uart.uartAlarmObject {
    _id?: string
}

const Alarm: React.FC = () => {

    const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(6, "month"), dayjs()])

    const [pageReq, setPageReq] = useState<PaginationReq>({ page: 1, pageSize: 20 });
    const { data: alarmsData, fecth, loading, setData: setAlarmsData } = usePromise<alarms[]>(async () => {
        const { data } = await getAlarm(dates[0].format("YYYY/MM/DD H:m:s"), dates[1].format("YYYY/MM/DD H:m:s"), pageReq)
        // 防御：试用模式或鉴权失败时 data 可能不是数组
        if (!Array.isArray(data)) {
            return [] as alarms[]
        }
        return data as alarms[]
    }, [] as alarms[], [dates, pageReq.page, pageReq.pageSize])
    const alarms = alarmsData ?? [];



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
     * @param _id 24 位 hex alarm id; undefined 直接返回（不发请求）
     * @returns
     */
    const confirm = async (_id?: string) => {
        // 2026-06-29 加守卫：_id 缺失 / 非 24 位 hex 直接 return + warning，
        // 不发明知会 400 的请求（用户体验差）。
        // 触发场景：报警数据 _id 字段缺失 / navigation 时 id 未就绪
        if (!isValidAlarmId(_id)) {
            message.warning('告警 id 缺失或格式不合法，无法确认')
            console.warn('[Alarm.confirm] invalid _id:', _id)
            return
        }
        try {
            await confrimAlarm(_id);
        } catch (err) {
            // 2026-07-04 加固：confrimAlarm 现在 reject 替代 fake success，
            // 捕获并提示，不让 caller 继续走 setAlarmsData + message.success
            message.error('确认失败：' + (err instanceof Error ? err.message : '未知错误'))
            return
        }
        const a = alarms.find(el_1 => el_1._id === _id);
        if (a)
            a.isOk = true;

        setAlarmsData([...alarms])
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
                            <Space orientation="vertical" style={{ width: "100%" }}>
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
                                current: pageReq.page ?? 1,
                                pageSize: pageReq.pageSize ?? 20,
                                total: alarms.length,
                                showTotal: t => `共 ${t} 条`,
                                onChange: (page, pageSize) => setPageReq({ ...pageReq, page, pageSize })
                            }}
                        >
                            <Table.Column responsive={["sm"]} title='网关' dataIndex='mac' key="mac" ellipsis {...tableColumnsFilter(alarms, 'mac')} ></Table.Column>
                            <Table.Column title='设备' dataIndex='devName' key="devName" {...tableColumnsFilter(alarms, 'devName')}></Table.Column>
                            <Table.Column title='消息' dataIndex='msg' key="msg" ellipsis  {...getColumnSearchProp<alarms>('msg')}
                                render={(val, record:any) =>
                                    // 2026-07-04 加固：record._id 非 24-hex 直接显示纯文本，
                                    // 不渲染 Popconfirm，避免点击发送 /alarms/undefined/confirm
                                    isValidAlarmId(record._id) ? (
                                        <Popconfirm
                                            title={val}
                                            onConfirm={() => confirm(record._id)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                           {val}
                                        </Popconfirm>
                                    ) : (
                                        <span style={{ color: '#999' }}>{val}</span>
                                    )
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
                                // 2026-07-04 加固：record._id 非 24-hex 时 button disabled，
                                // 防止用户点出 /alarms/undefined/confirm 请求
                                if (record.isOk) return <a >已确认</a>
                                if (!isValidAlarmId(record._id)) {
                                    return <Button type="primary" danger size="small" disabled title="告警 id 不合法，无法确认">确认告警</Button>
                                }
                                return <Button type="primary" danger size="small" onClick={() => confirm(record._id)}>确认告警</Button>
                            }}></Table.Column>
                        </Table>
                    </Col>
                </Row>
            </Card>

        </>
    )
}

export default Alarm
