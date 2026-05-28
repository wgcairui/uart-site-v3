'use client'
import { Form, DatePicker } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";

interface props {
    /**
     * 开始时间
     */
    start?: dayjs.Dayjs

    /**
     * 结束时间
     */
    end?: dayjs.Dayjs
    /**
     * 距今最后日期,设置过开始时间则此配置无效
     */
    lastDay?: number

    /**
     *
     */
    onChange?: (range: [dayjs.Dayjs, dayjs.Dayjs], str: [string, string]) => void
    children?: React.ReactNode
}

export const MyDatePickerRange: React.FC<props> = ({ children, start, end, lastDay, onChange }) => {

    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([start || dayjs().subtract(lastDay || 1, 'day'), end || dayjs()])



    useEffect(() => {
        return onChange && onChange(date, date.map(el => el.toString()) as any);
    }, [])
    return (
        <Form layout="inline" style={{ marginBottom: 12 }}>
            <Form.Item label="查询时间段">
                <DatePicker.RangePicker
                    value={date as any}
                    onChange={(_: any, __: any) => {
                        setDate(_)
                        onChange && onChange(_, __)
                    }}
                ></DatePicker.RangePicker>
            </Form.Item>
            <Form.Item>
                {
                    children
                }
            </Form.Item>
        </Form>
    )
}
