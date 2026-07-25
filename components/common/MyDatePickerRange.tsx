'use client'
import { Form, DatePicker } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";

interface props {
    /** 开始时间 */
    start?: dayjs.Dayjs
    /** 结束时间 */
    end?: dayjs.Dayjs
    /** 距今最后日期,设置过开始时间则此配置无效 */
    lastDay?: number
    onChange?: (range: [dayjs.Dayjs, dayjs.Dayjs], str: [string, string]) => void
    children?: React.ReactNode
}

/**
 * 自定义日期范围选择器
 *
 * 视觉风格：浅灰底输入框 + focus 蓝环（继承 globals.css 通用样式）
 *
 * 2026-07-25 fix: 移除 useState initial 的 dayjs() 调用, 改 client-only useEffect 初始化
 *   否则 server-render T1 跟 client-hydrate T2 不一致 → React #418 hydration error
 *   (admin/log/{alarm,mail,sms,server-errors} 4 个页面有这个问题)
 */
export const MyDatePickerRange: React.FC<props> = ({ children, start, end, lastDay, onChange }) => {

    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

    useEffect(() => {
        const next: [dayjs.Dayjs, dayjs.Dayjs] = [
            start || dayjs().subtract(lastDay || 1, 'day'),
            end || dayjs(),
        ]
        setDate(next)
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        onChange && onChange(next, next.map(el => el.toString()) as any)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Form layout="inline" style={{ marginBottom: 24 }}>
            <Form.Item label="查询时间段">
                <DatePicker.RangePicker
                    value={date as any}
                    onChange={(_: any, __: any) => {
                        setDate(_)
                        onChange && onChange(_, __)
                    }}
                />
            </Form.Item>
            <Form.Item>
                {children}
            </Form.Item>
        </Form>
    )
}