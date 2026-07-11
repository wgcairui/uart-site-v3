'use client'
import { Button, Col, Descriptions, Row, Space, Table } from "antd";
import { TableProps } from 'antd/lib/table'
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { generateTableKey } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { MyDatePickerRange } from "@/components/common/MyDatePickerRange";

export interface pieArg {
    key: string
    event: (data: {type: string, value: number}, plot: any) => void
}

export interface log<T = any> extends TableProps<T> {
    lastDay?: number | undefined
    dataFun: Function
    cPie?: (string | pieArg)[] | undefined
    filterNode?: string | undefined  // 节点名称过滤
    filterMac?: string | undefined   // 设备mac过滤
    filterPhone?: string | undefined // 手机号过滤
    onRowClick?: ((record: T) => void) | undefined  // 行点击回调
}

/**
 * 日志组件通用页面配置
 */
export const Log: React.FC<log> = (props) => {
    const { onRowClick, ...restProps } = props

    const [date, setDate] = useState([dayjs().subtract(props.lastDay || 1, 'day'), dayjs()])

    const [filter, setFilter] = useState<Record<string, string[] | null>>(() => {
        return props.cPie ?
            Object.assign({}, ...props.cPie.map(el => {
                const key = typeof el === 'string' ? el : el.key
                return { [key]: [] }
            }))
            : {}
    })

    const list = usePromise(async () => {
        const { data } = await props.dataFun(date[0]?.format() || "", date[1]?.format() || "", props.filterMac, props.filterPhone)
        let items = Array.isArray(data) ? data : (data?.items ?? [])
        if (props.filterNode) {
            items = items.filter((item: any) => item.Name === props.filterNode)
        }
        return items
    }, [] as any[], [date, props.filterNode, props.filterMac, props.filterPhone])

    const columns = useMemo(() => {
        const arr = [
            props.columns ? props.columns : [],
            {
                dataIndex: 'timeStamp',
                title: '时间',
                render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
                defaultSortOrder: 'descend',
                sorter: (a: any, b: any) => a.timeStamp - b.timeStamp
            },
        ].flat() as any

        return arr
    }, [filter])

    const pies = useMemo(() => {
        if (props.cPie && list.data.length > 0) {
            const hasPies = props.cPie.filter(el => ((typeof el === 'string') ? el : el.key) in list.data[0])
            if (hasPies.length !== props.cPie.length) console.log('piekey有未包含的键');

            return hasPies.map(el => {
                const m = new Map<string, number>();
                const [k, event] = typeof el === 'string' ? [el, undefined] : [el.key, el.event];
                (list.data as Record<string, any>[]).forEach(li => {
                    const key = li[k]
                    m.set(key, (m.get(key) || 0) + 1)
                })

                return {
                    data: [...m.entries()].map(([type, value]) => ({ type, value })),
                    key: k,
                    event
                }
            })

        } else {
            return []
        }
    }, [list.data])

    const target = (type: string, key: string) => {
        setFilter(filter => ({ ...filter, [type]: [key] }))
    }

    const clearFilter = () => {
        setFilter(() => {
            return props.cPie ?
                Object.assign({}, ...props.cPie.map(el => {
                    const key = typeof el === 'string' ? el : el.key
                    return { [key]: [] }
                }))
                : {}
        })
    }

    return (
        <>
            <MyDatePickerRange {...(props.lastDay !== undefined ? { lastDay: props.lastDay } : {})} onChange={setDate}>
                <Space>
                    <Button type="primary" onClick={() => list.fecth()}>刷新</Button>
                    <Button type="default" onClick={() => clearFilter()}>清除刷选配置</Button>
                </Space>
            </MyDatePickerRange>

            <Row >
                {
                    pies.map(el =>
                        <Col span={24 / pies.length} key={el.data[0]?.type || el.key} style={{ padding: 12 }}>
                            <Descriptions title={el.key} bordered column={1} size="small">
                                {el.data.map((item: any) => (
                                    <Descriptions.Item
                                        key={item.type}
                                        label={item.type}
                                    >
                                        <div
                                            onClick={() => {
                                                if (el.event) el.event(item, {} as any)
                                                else target(el.key, item.type)
                                            }}
                                            style={{cursor: 'pointer', color: '#8b5cf6', fontWeight: 500}}
                                        >
                                            {item.value}
                                        </div>
                                    </Descriptions.Item>
                                ))}
                            </Descriptions>
                        </Col>)
                }
            </Row>
            <Table
                {...restProps}
                loading={list.loading}
                dataSource={generateTableKey(list.data, '_id')}
                columns={columns}
                pagination={{ defaultPageSize: 30 }}
                onRow={(record) => ({
                    onClick: () => onRowClick?.(record as any),
                    style: { cursor: 'pointer' }
                })}
            ></Table>
        </>
    )
}
