'use client'
/**
 * admin 邮件日志页 (v3 hybrid v4 设计语言 · 2026-07-20)
 *
 * feat/mail-sms-filter-ui (cairui 20:13 拍"一样的重构流程", 跟 alarm 一样):
 * 1) 顶部 4 卡改成 "总数 / 月新增 / 周新增 / 日新增" (走 server agg /mail/count-by-bucket)
 * 2) 4 维筛选条 (server-errors 风格横排 wrap):
 *    时间快选 (1h/24h/7d/30d) + 收件人 + 结果 + 主题模糊
 * 3) 4 业务筛选 (收件人/结果/主题/时间) 走 server search/filters
 *    (server feat/mail-sms-filter-ui, buildMongoFilter 模式 + isOk 重写 Success 字段)
 * 4) 自渲染 antd Table (跟 alarm 一致, 不用共享 Log 组件)
 *
 * 视觉 (跟 alarm / server-errors 一致):
 * - 顶部 PageSummary 4 卡 (总数/月/周/日)
 * - 6 维筛选条 + 5 列 Table
 * - flex:1 + scroll.y 撑开 main.scroll-area
 */

import { Button, Input, Select, Space, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
    ReloadOutlined, SearchOutlined, CloseCircleOutlined,
    CheckCircleOutlined, CalendarOutlined, FilterOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import {
    logmailsends,
    logMailTimeBucket,
} from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'

// server MAX_PAGE_SIZE = 200 (from midwayuartserver pagination.helper.ts)
const MAX_ITEMS = 200

// 结果枚举 (server filters.isOk 白名单, 走 buildMongoFilter 后重写为 Success 字段)
const RESULT_OPTIONS = [
    { value: 'true', label: <Tag color="success" style={{ margin: 0 }}><CheckCircleOutlined /> 成功</Tag> },
    { value: 'false', label: <Tag color="error" style={{ margin: 0 }}>失败</Tag> },
]

// 时间快选 (cairui 13:48 拍 1h/24h/7d/30d)
const TIME_QUICK_OPTIONS: { value: string; label: string; hours: number }[] = [
    { value: '1h', label: '最近 1h', hours: 1 },
    { value: '24h', label: '最近 24h', hours: 24 },
    { value: '7d', label: '最近 7d', hours: 24 * 7 },
    { value: '30d', label: '最近 30d', hours: 24 * 30 },
]

// ─── 筛选条件 type ──────────────────────────────────────────────────────────

interface MailFilters {
    /** 收件人模糊搜索 */
    mails: string
    /** 结果多选: 'true'=成功 / 'false'=失败 */
    isOk: string[]
    /** 主题模糊 (sendParams.subject nested path) */
    subject: string
}

const EMPTY_FILTERS: MailFilters = {
    mails: '',
    isOk: [],
    subject: '',
}

// ─── 桌面 Table 列定义 ──────────────────────────────────────────────────────

const TABLE_COLUMNS: ColumnsType<Uart.logMailSend> = [
    {
        dataIndex: 'mails',
        title: '收件人',
        width: 240,
        ellipsis: true,
        render: (v: string[]) => Array.isArray(v) ? v.join(', ') : '—',
    },
    {
        dataIndex: 'sendParams',
        title: '主题',
        width: 280,
        ellipsis: true,
        render: (val: any) => val?.subject || '—',
    },
    {
        key: 'result',
        title: '结果',
        width: 200,
        render: (_, r: Uart.logMailSend) => r?.Success ? (
            <Tag color="success" style={{ margin: 0 }}>成功</Tag>
        ) : (
            <Tag color="error" style={{ margin: 0 }}>{r?.Error?.message || '失败'}</Tag>
        ),
    },
    {
        dataIndex: 'timeStamp',
        title: '时间',
        width: 170,
        defaultSortOrder: 'descend',
        sorter: (a: Uart.logMailSend, b: Uart.logMailSend) => (a.timeStamp || 0) - (b.timeStamp || 0),
        render: (v: number) => (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
            </span>
        ),
    },
]

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const LogMail: React.FC = () => {
    // 共享 date state
    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ])

    // 桌面分页 state
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)

    // 筛选 state
    const [filters, setFilters] = useState<MailFilters>(EMPTY_FILTERS)
    /** 触发 fetch 的签名 */
    const [fetchKey, setFetchKey] = useState(0)

    // 数据: items (≤200) + realTotal (server 真实) + bucket (4 卡时间分桶) + loading
    const [items, setItems] = useState<Uart.logMailSend[]>([])
    const [realTotal, setRealTotal] = useState(0)
    const [bucket, setBucket] = useState<Uart.UartAlarmTimeBucket>({
        total: 0, month: 0, week: 0, day: 0, tags: [],
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const req: Uart.MailSendListReq = {
            page: 1,
            pageSize: MAX_ITEMS,
            needTotal: true,
        }
        // 透传 search (收件人/主题模糊, sendParams.* nested path)
        const search: Record<string, string> = {}
        if (filters.mails.trim()) search['mails'] = filters.mails.trim()
        if (filters.subject.trim()) search['sendParams.subject'] = filters.subject.trim()
        if (Object.keys(search).length) req.search = search as any
        // 透传 filters (isOk, server 端重写为 Success 字段)
        if (filters.isOk.length) {
            req.filters = { isOk: filters.isOk as ('true' | 'false')[] }
        }

        Promise.all([
            logmailsends(date[0].format(), date[1].format(), req),
            logMailTimeBucket(date[0].format(), date[1].format()),
        ])
            .then(([listRes, bucketRes]) => {
                if (cancelled) return
                const ld: any = listRes.data
                const list = Array.isArray(ld) ? ld : ld?.items ?? []
                setItems(Array.isArray(list) ? list : [])
                setRealTotal(ld?.pagination?.total ?? list.length ?? 0)
                const b: any = bucketRes.data
                setBucket({
                    total: b?.total ?? 0,
                    month: b?.month ?? 0,
                    week: b?.week ?? 0,
                    day: b?.day ?? 0,
                    tags: Array.isArray(b?.tags) ? b.tags : [],
                })
            })
            .catch(() => {
                if (!cancelled) {
                    setItems([])
                    setRealTotal(0)
                    setBucket({ total: 0, month: 0, week: 0, day: 0, tags: [] })
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, fetchKey])

    // 桌面分页切片
    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize
        return items.slice(start, start + pageSize)
    }, [items, page, pageSize])

    // 触发 fetch 的 wrapper
    const triggerFetch = () => {
        setPage(1)
        setFetchKey((k) => k + 1)
    }

    // 时间快选
    const handleQuickTime = (hours: number) => {
        setDate([dayjs().subtract(hours, 'hour'), dayjs()])
    }

    // 重置筛选
    const handleResetFilters = () => {
        setFilters(EMPTY_FILTERS)
        setPage(1)
        setFetchKey((k) => k + 1)
    }

    return (
        <div
            className="bg-bento-canvas"
            style={{
                position: 'relative',
                zIndex: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
            }}
        >
            <PageHeader
                title="邮件日志"
                subtitle="查看邮件发送历史与时间分桶统计"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '日志' },
                ]}
            />

            <PageSummary
                column={4}
                items={[
                    {
                        label: '邮件总数',
                        value: bucket.total,
                        variant: 'primary',
                        icon: <CalendarOutlined />,
                        extra: `${date[0].format('MM-DD HH:mm')} ~ ${date[1].format('MM-DD HH:mm')}`,
                    },
                    {
                        label: '本月新增',
                        value: bucket.month,
                        variant: 'success',
                        icon: <CalendarOutlined />,
                        extra: `自然月 (${dayjs().startOf('month').format('MM-DD')} → ${date[1].format('MM-DD')})`,
                    },
                    {
                        label: '本周新增',
                        value: bucket.week,
                        variant: 'warning',
                        icon: <CalendarOutlined />,
                        extra: `自然周 (周一 ${dayjs().startOf('week').format('MM-DD')} → ${date[1].format('MM-DD')})`,
                    },
                    {
                        label: '今日新增',
                        value: bucket.day,
                        variant: 'danger',
                        icon: <CalendarOutlined />,
                        extra: `今天 (${dayjs().startOf('day').format('MM-DD HH:mm')} → ${date[1].format('MM-DD HH:mm')})`,
                    },
                ]}
            />

            {/* 4 维筛选条 (server-errors 风格) */}
            <div
                className="bento-card"
                style={{
                    padding: 16,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <span style={{ color: 'var(--ink-500)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FilterOutlined /> 筛选:
                </span>

                {/* 时间 RangePicker */}
                <MyDatePickerRange
                    lastDay={7}
                    onChange={(d) => setDate(d)}
                />

                {/* 时间快选 */}
                <Space.Compact size="small">
                    {TIME_QUICK_OPTIONS.map((opt) => (
                        <Button
                            key={opt.value}
                            size="small"
                            onClick={() => handleQuickTime(opt.hours)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </Space.Compact>

                {/* 收件人 input */}
                <Input
                    placeholder="收件人 (模糊)"
                    allowClear
                    value={filters.mails}
                    onChange={(e) => setFilters((f) => ({ ...f, mails: e.target.value }))}
                    onPressEnter={triggerFetch}
                    style={{ width: 200 }}
                    prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                />

                {/* 主题 input (sendParams.subject nested path) */}
                <Input
                    placeholder="主题 (模糊)"
                    allowClear
                    value={filters.subject}
                    onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
                    onPressEnter={triggerFetch}
                    style={{ width: 200 }}
                    prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                />

                {/* 结果多选 */}
                <Select
                    mode="multiple"
                    allowClear
                    placeholder="结果"
                    style={{ minWidth: 140 }}
                    value={filters.isOk}
                    onChange={(v: string[]) => setFilters((f) => ({ ...f, isOk: v }))}
                    options={RESULT_OPTIONS}
                    maxTagCount="responsive"
                />

                {/* 操作按钮 */}
                <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={triggerFetch}
                    loading={loading}
                    className="btn-brand"
                >
                    搜索
                </Button>
                <Button
                    icon={<CloseCircleOutlined />}
                    onClick={handleResetFilters}
                >
                    重置
                </Button>
            </div>

            {/* 主 Table */}
            <div
                className="bento-card"
                style={{
                    padding: 20,
                    marginBottom: 20,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                }}
            >
                {items.length === 0 && !loading ? (
                    <EmptyState
                        description="所选时间范围内暂无邮件日志"
                        secondaryLabel="刷新"
                        onSecondary={triggerFetch}
                    />
                ) : (
                    <Table<Uart.logMailSend>
                        className="v3-table"
                        rowKey="_id"
                        loading={loading}
                        columns={TABLE_COLUMNS}
                        dataSource={generateTableKey(pagedItems as any, '_id')}
                        // 动态 scroll.y: 装下当前页实际行数 + 头, 不留空白
                        // (cairui 14:15 反馈: 老 calc(100vh - 600px) 在小视口只显示 3-4 行 + 大量空白)
                        scroll={{ x: 900, y: `${Math.max(280, pagedItems.length * 54 + 54)}px` }}
                        pagination={{
                            current: page,
                            pageSize,
                            total: realTotal,
                            showSizeChanger: true,
                            showTotal: (t) => `共 ${t} 条`,
                            pageSizeOptions: [20, 30, 50, 100],
                            onChange: (p, ps) => {
                                setPage(p)
                                setPageSize(ps)
                            },
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default LogMail
