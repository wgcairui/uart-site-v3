'use client'
/**
 * admin 邮件日志页 (v3 hybrid v4 设计语言 · 2026-07-20)
 *
 * feat/mail-sms-filter-ui (cairui 20:13 拍"一样的重构流程", 跟 alarm 一样):
 * 1) 顶部 4 卡 (cairui 拍"4 + 2 卡" — 4 时间分桶 + 2 失败维度):
 *    邮件总数 / 本月新增 / 本周新增 / 今日新增 (kind="navigate", href 跳到该时间窗)
 *    今日失败 / 失败率 (kind="drilldown", popover 显示 top failing 收件人 / 失败原因分布)
 * 2) 4 维筛选条 (server-errors 风格横排 wrap):
 *    时间快选 (1h/24h/7d/30d) + 收件人 + 结果 + 主题模糊
 * 3) 4 业务筛选 (收件人/结果/主题/时间) 走 server search/filters
 *    (server feat/mail-sms-filter-ui, buildMongoFilter 模式 + isOk 重写 Success 字段)
 * 4) 自渲染 antd Table (跟 alarm 一致, 不用共享 Log 组件)
 *
 * cairui 21:40 追加精简:
 *  - 列表移除"结果"列 (截断看不清 / 列表不需要)
 *  - 单击行弹 Modal 详情 (sendParams / Success / Error 全展示)
 *  - 沿用 components/chart/MailStatsChart.tsx 的 onRow.click + Modal 模式
 *
 * cairui 2026-07-21 拍板: 整个 modal 重设计
 *  - HTML 用 <iframe sandbox srcdoc> 渲染 (CSS 隔离 + 禁脚本 + 允许图片 + 允许外链弹窗)
 *  - Success 拆字段 KV 网格 (response/messageId/envelopeTime/messageTime + accepted/rejected 对比 + envelope 嵌套)
 *  - Error 拆 code/message + stack 折叠 + 原始 payload 兜底
 *  - 顶部 5 列状态条 (状态 Tag / 主题 / 时间 / 收件人数 / 邮件大小)
 *  - 邮件正文 Tab: 渲染预览 (默认) / HTML 源码
 *  - 实现: ./MailDetailModal  (page.tsx 不再写 modal 内联)
 *
 * W5 改造 (2026-07-25 cairui 拍 "log/sms + log/mail 接入 StatCard 4 variant"):
 *  - PageSummary 4 卡 (4 time-bucket) → 手写 grid 6 卡 (4 time-bucket navigate + 2 fail drilldown)
 *  - 4 time-bucket: kind="navigate", href 跳 ?startTs=&endTs= 让 page 切换 date
 *  - 今日失败: kind="drilldown" hover 显示 top 5 failing 收件人 (mail)
 *  - 失败率: kind="drilldown" hover 显示失败原因分布 (Error.message top 5)
 *  - 防御性: items 200 上限, failRate total=0 时显示 0
 *
 * 视觉 (跟 alarm / server-errors 一致):
 * - 顶部 6 StatCard (4 navigate + 2 drilldown) 手写 grid
 * - 4 维筛选条 + 3 列 Table (收件人 / 主题 / 时间)
 * - flex:1 + scroll.y 撑开 main.scroll-area
 */

import { Button, Input, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
    SearchOutlined, CloseCircleOutlined,
    CheckCircleOutlined, CalendarOutlined, FilterOutlined,
    WarningOutlined, PercentageOutlined,
} from '@ant-design/icons'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
    logmailsends,
    logMailTimeBucket,
} from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { useDashboardStat } from '@/lib/hooks/useDashboardStat'
import { getUserEngagement } from '@/lib/api/admin-summary/client'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/admin/StatCard'
import type { UserEngagementItem } from '@/types/admin-summary'
import { EmptyState } from '@/components/common/EmptyState'
import { MailDetailModal } from './_components/MailDetailModal'

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

function LogMailInner() {
    // 共享 date state (W5: 支持 URL ?startTs=&endTs= 反向驱动, StatCardNavigate 用)
    // 2026-07-25 fix: SSR-safe initial (was useState(() => window.location.search) → React #418 hydration error)
    // 改用 useSearchParams hook + useEffect client mount 同步, 初始 null 不调 dayjs() 避免 SSR/client mismatch
    // 跟 PR #75 (d35d4d4) 修 alarm/mail/sms/server-errors 4 页 useState dayjs() 模式同源
    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
    const searchParams = useSearchParams()
    useEffect(() => {
        // client mount 后同步 URL searchParams → state (URL 是 new source of truth)
        const startTs = Number(searchParams.get('startTs'))
        const endTs = Number(searchParams.get('endTs'))
        if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs > 0 && endTs > 0) {
            const nextStart = dayjs(startTs)
            const nextEnd = dayjs(endTs)
            setDate((cur) => {
                if (cur && cur[0].isSame(nextStart) && cur[1].isSame(nextEnd)) {
                    return cur
                }
                return [nextStart, nextEnd]
            })
        } else {
            // URL 无 startTs/endTs: 首次 mount 给默认 7d window; 后续不变 (避免覆盖 URL 切换前的值)
            setDate((cur) => cur ?? [dayjs().subtract(7, 'day'), dayjs()])
        }
    }, [searchParams])

    // 桌面分页 state
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)

    // 筛选 state
    const [filters, setFilters] = useState<MailFilters>(EMPTY_FILTERS)
    /** 触发 fetch 的签名 */
    const [fetchKey, setFetchKey] = useState(0)

    // 详情 Modal (cairui 21:40 拍: 列表移出"结果"列, 点击行弹窗)
    const [detailModal, setDetailModal] = useState<{ open: boolean; record: Uart.logMailSend | null }>({
        open: false,
        record: null,
    })

    // 数据: items (≤200) + realTotal (server 真实) + bucket (4 卡时间分桶) + loading
    const [items, setItems] = useState<Uart.logMailSend[]>([])
    const [realTotal, setRealTotal] = useState(0)
    const [bucket, setBucket] = useState<Uart.UartAlarmTimeBucket>({
        total: 0, month: 0, week: 0, day: 0, tags: [],
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!date) return  // 2026-07-25 fix: SSR-safe initial date=null, 等 client mount 同步后再 fetch
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

    // W5: StatCard drilldown 派生数据 (基于 items 200 上限, 在 popover 内注明)
    // 防御性: items 兜底 [] + 全部失败时 total=0 显示 0 不显示 NaN
    const todayStart = dayjs().startOf('day')
    const todayEnd = dayjs().endOf('day')
    const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items])
    const todayItems = useMemo(
        () => safeItems.filter((x) => {
            const ts = x?.timeStamp
            if (!ts) return false
            const d = dayjs(ts)
            return d.isAfter(todayStart) && d.isBefore(todayEnd)
        }),
        [safeItems, todayStart, todayEnd]
    )
    const todayTotal = todayItems.length
    const todayFails = useMemo(
        () => todayItems.filter((x) => x?.Error).length,
        [todayItems]
    )
    const failRate = todayTotal > 0 ? Math.round((todayFails / todayTotal) * 1000) / 10 : 0

    // top 5 failing 收件人 (mail) — group 失败 items by mail, count
    const topFailingMails = useMemo(() => {
        const map = new Map<string, number>()
        safeItems.forEach((it) => {
            if (!it?.Error) return
            const mails = Array.isArray(it.mails) ? it.mails : []
            mails.forEach((m) => {
                if (m) map.set(m, (map.get(m) ?? 0) + 1)
            })
        })
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([mail, count]) => ({ mail, count }))
    }, [safeItems])

    // top 5 失败原因 — group 失败 items by Error.message (nodemailer), 缺省走 Error.code
    const failReasons = useMemo(() => {
        const map = new Map<string, number>()
        safeItems.forEach((it) => {
            if (!it?.Error) return
            const reason =
                (typeof it.Error === 'object' && (it.Error.message || it.Error.Message || it.Error.code || it.Error.Code)) ||
                (typeof it.Error === 'string' ? it.Error : null) ||
                '未知错误'
            const key = String(reason).slice(0, 80)
            map.set(key, (map.get(key) ?? 0) + 1)
        })
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count }))
    }, [safeItems])

    // W5: 拉 top 10 用户活跃度 (走 BFF dashboard/users/engagement, 失败率 popover 参考用)
    // PR #71 review 后 useDashboardStat 已对齐单层 universalResult, 直接传 BFF 客户端
    const { data: userEngagement } = useDashboardStat<UserEngagementItem[]>(
        () => getUserEngagement(10),
        [],
        []
    )

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

            {/* W5 改造: 6 卡 = 4 time-bucket (navigate) + 2 fail dimension (drilldown)
                - 4 time-bucket href 跳同页 ?startTs=&endTs= 反向驱动 date state (useSearchParams effect)
                - 2 fail dimension 走 drilldown 弹 popover, 防御性 data ?? [] / failRate 0 兜底
                - popover 内注明 "基于当前 items 上限 200" 防误导 */}
            <div
                className="page-summary-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 20,
                    marginBottom: 32,
                }}
            >
                {/* 1. 邮件总数 (navigate: 跳到当前时间窗, href 用 date 反向) */}
                <StatCard
                    kind="navigate"
                    label="邮件总数"
                    value={bucket.total}
                    variant="primary"
                    icon={<CalendarOutlined />}
                    extra={date ? `${date[0].format('MM-DD HH:mm')} ~ ${date[1].format('MM-DD HH:mm')}` : '加载中…'}
                    href={date ? `/admin/log/mail?startTs=${date[0].valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/mail'}
                />
                {/* 2. 本月新增 (navigate: 跳到本月) */}
                <StatCard
                    kind="navigate"
                    label="本月新增"
                    value={bucket.month}
                    variant="success"
                    icon={<CalendarOutlined />}
                    extra={date ? `自然月 (${dayjs().startOf('month').format('MM-DD')} → ${date[1].format('MM-DD')})` : '加载中…'}
                    href={date ? `/admin/log/mail?startTs=${dayjs().startOf('month').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/mail'}
                />
                {/* 3. 本周新增 (navigate: 跳到本周) */}
                <StatCard
                    kind="navigate"
                    label="本周新增"
                    value={bucket.week}
                    variant="warning"
                    icon={<CalendarOutlined />}
                    extra={date ? `自然周 (周一 ${dayjs().startOf('week').format('MM-DD')} → ${date[1].format('MM-DD')})` : '加载中…'}
                    href={date ? `/admin/log/mail?startTs=${dayjs().startOf('week').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/mail'}
                />
                {/* 4. 今日新增 (navigate: 跳到今天) */}
                <StatCard
                    kind="navigate"
                    label="今日新增"
                    value={bucket.day}
                    variant="danger"
                    icon={<CalendarOutlined />}
                    extra={date ? `今天 (${dayjs().startOf('day').format('MM-DD HH:mm')} → ${date[1].format('MM-DD HH:mm')})` : '加载中…'}
                    href={date ? `/admin/log/mail?startTs=${dayjs().startOf('day').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/mail'}
                />
                {/* 5. 今日失败 (drilldown: hover 显示 top 5 failing 收件人 + 活跃度 top 10 参考) */}
                <StatCard
                    kind="drilldown"
                    label="今日失败"
                    value={todayFails}
                    variant="danger"
                    icon={<WarningOutlined />}
                    extra={`今日 ${todayTotal} 条中 (基于当前列表 ≤${MAX_ITEMS})`}
                    data={topFailingMails}
                    trigger="hover"
                    popoverContent={() => (
                        <div style={{ width: 360 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6, fontWeight: 600 }}>
                                Top 5 失败收件人 (mail)
                            </div>
                            {topFailingMails.length === 0 ? (
                                <div style={{ color: 'var(--ink-500)', fontSize: 12, padding: '8px 0 12px' }}>
                                    暂无失败记录
                                </div>
                            ) : (
                                <Table
                                    size="small"
                                    pagination={false}
                                    rowKey="mail"
                                    dataSource={topFailingMails as any}
                                    columns={[
                                        { title: '邮箱', dataIndex: 'mail', key: 'mail', ellipsis: true, width: 220 },
                                        {
                                            title: '失败数',
                                            dataIndex: 'count',
                                            key: 'count',
                                            width: 90,
                                            align: 'right',
                                            render: (v: number) => (
                                                <Tag color="error" style={{ margin: 0 }}>{v}</Tag>
                                            ),
                                        },
                                    ]}
                                />
                            )}
                            {userEngagement.length > 0 && (
                                <>
                                    <div style={{ fontSize: 12, color: 'var(--ink-500)', margin: '12px 0 6px', fontWeight: 600 }}>
                                        参考: 活跃度 top {userEngagement.length} 用户
                                    </div>
                                    <Table
                                        size="small"
                                        pagination={false}
                                        rowKey="user"
                                        dataSource={userEngagement.slice(0, 5) as any}
                                        columns={[
                                            { title: '用户', dataIndex: 'user', key: 'user', ellipsis: true, width: 140 },
                                            { title: '设备', dataIndex: 'deviceCount', key: 'deviceCount', width: 50, align: 'right' },
                                            { title: '7d告警', dataIndex: 'alarmCount7d', key: 'alarmCount7d', width: 70, align: 'right' },
                                            { title: '7d短信', dataIndex: 'smsCount7d', key: 'smsCount7d', width: 70, align: 'right' },
                                        ]}
                                    />
                                </>
                            )}
                        </div>
                    )}
                />
                {/* 6. 失败率 (drilldown: hover 显示失败原因 top 5) */}
                <StatCard
                    kind="drilldown"
                    label="失败率"
                    value={`${failRate}%`}
                    variant={failRate > 5 ? 'danger' : failRate > 0 ? 'warning' : 'success'}
                    icon={<PercentageOutlined />}
                    extra={`今日失败 ${todayFails} / ${todayTotal} (基于当前列表 ≤${MAX_ITEMS})`}
                    data={failReasons}
                    trigger="hover"
                    popoverContent={() => (
                        <div style={{ width: 360 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}>
                                失败原因分布 (Error.message / code, top 5)
                            </div>
                            {failReasons.length === 0 ? (
                                <div style={{ color: 'var(--ink-500)', fontSize: 12, padding: '8px 0' }}>
                                    暂无失败记录
                                </div>
                            ) : (
                                <Table
                                    size="small"
                                    pagination={false}
                                    rowKey="reason"
                                    dataSource={failReasons as any}
                                    columns={[
                                        {
                                            title: '原因',
                                            dataIndex: 'reason',
                                            key: 'reason',
                                            ellipsis: true,
                                        },
                                        {
                                            title: '次数',
                                            dataIndex: 'count',
                                            key: 'count',
                                            width: 70,
                                            align: 'right',
                                            render: (v: number) => (
                                                <Tag color="error" style={{ margin: 0 }}>{v}</Tag>
                                            ),
                                        },
                                    ]}
                                />
                            )}
                        </div>
                    )}
                />
            </div>

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
                        // cairui 21:40: 列表移出"结果"列, 改点击行弹窗
                        onRow={(record) => ({
                            onClick: () => setDetailModal({ open: true, record }),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </div>

            {/* cairui 2026-07-21: 整个 modal 重设计, 改用 MailDetailModal (5 section + iframe HTML 渲染) */}
            <MailDetailModal
                open={detailModal.open}
                record={detailModal.record}
                onClose={() => setDetailModal({ open: false, record: null })}
            />
        </div>
    )
}

// Next.js 16.3+ 要求 useSearchParams 包 <Suspense>, 否则 prod build warn (16.4+ 会变 error)
// 跟 app/(admin)/admin/node/terminal/[mac]/page.tsx 的 Inner/Suspense pattern 一致
export default function LogMailPage() {
    return (
        <Suspense fallback={null}>
            <LogMailInner />
        </Suspense>
    )
}
