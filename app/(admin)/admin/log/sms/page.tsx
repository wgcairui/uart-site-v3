'use client'
/**
 * admin 短信日志页 (v3 hybrid v4 设计语言 · 2026-07-20)
 *
 * feat/mail-sms-filter-ui (cairui 20:13 拍"一样的重构流程", 跟 alarm 一样):
 * 1) 顶部 4 卡 (cairui 拍"4 + 2 卡" — 4 时间分桶 + 2 失败维度, 取代原 5 卡):
 *    短信总数 / 本月新增 / 本周新增 / 今日新增 (kind="navigate", href 跳到该时间窗)
 *    今日失败 / 失败率 (kind="drilldown", popover 显示 top failing 收件人 / 失败原因分布)
 * 2) 4 维筛选条 (server-errors 风格):
 *    时间快选 + 手机号 + 结果 + TemplateParam 模糊
 * 3) 短信消耗 tab 合并到 1 页:
 *    - 顶部 6 卡 (4 time-bucket navigate + 2 fail drilldown)
 *    - 主 Table (短信日志) 在筛选条下
 *    - 短信消耗分布 (用户/次数) 在主 Table 下, 用 logsmssendsCountInfo + getUserAlarmSetups
 *
 * cairui 21:40 追加精简:
 *  - 列表移除"结果"列 (截断看不清 / 列表不需要)
 *  - 单击行弹 Modal 详情 (sendParams / Success / Error 全展示)
 *  - 沿用 components/chart/MailStatsChart.tsx 的 onRow.click + Modal 模式
 *
 * cairui 2026-07-22 拍板: 整个 modal 重设计 (跟 mail 一样, 设计语言对齐 MailDetailModal)
 *  - TemplateParam JSON 解析: 老版本是 'TemplateParam: {"name":"Yozi",...}' 一坨,
 *    改成 key-value 表格, 每个变量一行, 加 "复制 JSON" 按钮
 *  - Success 拆字段: Message / RequestId / BizId / Code 单独展示
 *  - Error 拆 code/message + stack 折叠
 *  - 顶部 4 列状态条 (状态 Tag / 签名 / 时间 / 收件人数+条数)
 *  - 收件人: 手机号 Tag 列表 (可复制)
 *  - 发送参数: RegionId / SignName / TemplateCode / PhoneNumbers 拆字段
 *  - 实现: ./SmsDetailModal  (page.tsx 不再写 modal 内联)
 *
 * W5 改造 (2026-07-25 cairui 拍 "log/sms + log/mail 接入 StatCard 4 variant"):
 *  - PageSummary 5 卡 (4 time-bucket + 1 短信消耗总) → 手写 grid 6 卡 (4 time-bucket navigate + 2 fail drilldown)
 *  - 短信消耗总 卡 删除 (跟 log/mail 保持一致, 4 + 2 模式)
 *  - 4 time-bucket: kind="navigate", href 跳 ?startTs=&endTs= 让 page 切换 date
 *  - 今日失败: kind="drilldown" hover 显示 top 5 failing 收件人
 *  - 失败率: kind="drilldown" hover 显示失败原因分布 (Error.Message top 5)
 *  - 防御性: items 200 上限, failRate total=0 时显示 0, useDashboardStat 兜底
 *
 * 视觉 (跟 alarm / server-errors 一致):
 * - 顶部 6 StatCard (4 navigate + 2 drilldown) 手写 grid
 * - 4 维筛选条 + 3 列 Table (收件人 / 发送参数 / 时间)
 * - 短信消耗分布表 (页底, 折叠可考虑, 暂不折)
 */

import {
    Button, Divider, Input, Select, Space, Table, Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
    SearchOutlined, CloseCircleOutlined,
    CheckCircleOutlined, CalendarOutlined, FilterOutlined,
    WarningOutlined, PercentageOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
    logsmssends,
    logsmssendsCountInfo,
    logSmsTimeBucket,
    getUserAlarmSetups,
    BindDev,
} from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'
import { useDashboardStat } from '@/lib/hooks/useDashboardStat'
import { getUserEngagement } from '@/lib/api/admin-summary/client'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/admin/StatCard'
import type { UserEngagementItem } from '@/types/admin-summary'
import { EmptyState } from '@/components/common/EmptyState'
import { UserDes } from '@/components/data/UserDes'
import { SmsDetailModal } from './_components/SmsDetailModal'
import { PaginationReq, V2ListResponse } from '@/types'

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

// ─── 短信日志 Table 列 ──────────────────────────────────────────────────────

const SMS_TABLE_COLUMNS: ColumnsType<Uart.logSmsSend> = [
    {
        dataIndex: 'tels',
        title: '收件人',
        width: 200,
        ellipsis: true,
        render: (v: string[]) => Array.isArray(v) ? v.join(', ') : '—',
    },
    {
        dataIndex: 'sendParams',
        title: '发送参数',
        ellipsis: true,
        render: (val: any) => {
            try {
                const j = val?.TemplateParam ? JSON.parse(val.TemplateParam) : null
                if (j) {
                    for (const k of ['remind', 'code']) {
                        if (k in j) return `${k}:${j[k]}`
                    }
                }
            } catch { /* fallthrough */ }
            return val?.TemplateParam || '—'
        },
    },
    {
        dataIndex: 'timeStamp',
        title: '时间',
        width: 170,
        defaultSortOrder: 'descend',
        sorter: (a: Uart.logSmsSend, b: Uart.logSmsSend) => (a.timeStamp || 0) - (b.timeStamp || 0),
        render: (v: number) => (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
            </span>
        ),
    },
]

// ─── 筛选条件 type ──────────────────────────────────────────────────────────

interface SmsFilters {
    /** 手机号模糊搜索 (tels 数组元素) */
    tels: string
    /** 结果多选: 'true'=成功 / 'false'=失败 */
    isOk: string[]
    /** TemplateParam 模糊 (JSON 字符串搜) */
    template: string
}

const EMPTY_FILTERS: SmsFilters = {
    tels: '',
    isOk: [],
    template: '',
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const LogSms: React.FC = () => {
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

    // 桌面分页 state (短信日志)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)

    // 筛选 state
    const [filters, setFilters] = useState<SmsFilters>(EMPTY_FILTERS)
    const [fetchKey, setFetchKey] = useState(0)

    // 详情 Modal (cairui 21:40 拍: 列表移出"结果"列, 点击行弹窗)
    const [detailModal, setDetailModal] = useState<{ open: boolean; record: Uart.logSmsSend | null }>({
        open: false,
        record: null,
    })

    // 短信消耗分布 (cairui 20:13 拍合并, 保留原 tab 的 3 卡 + 用户表)
    const [userPage, setUserPage] = useState(1)
    const [userPageSize, setUserPageSize] = useState(20)
    const [userSearch, setUserSearch] = useState('')

    // 数据: items + realTotal + bucket (4 卡时间分桶) + loading
    const [items, setItems] = useState<Uart.logSmsSend[]>([])
    const [realTotal, setRealTotal] = useState(0)
    const [bucket, setBucket] = useState<Uart.UartAlarmTimeBucket>({
        total: 0, month: 0, week: 0, day: 0, tags: [],
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!date) return  // 2026-07-25 fix: SSR-safe initial date=null, 等 client mount 同步后再 fetch
        let cancelled = false
        setLoading(true)

        const req: Uart.SmsSendListReq = {
            page: 1,
            pageSize: MAX_ITEMS,
            needTotal: true,
        }
        // 透传 search (手机号/TemplateParam 模糊)
        const search: Record<string, string> = {}
        if (filters.tels.trim()) search['tels'] = filters.tels.trim()
        if (filters.template.trim()) search['sendParams.TemplateParam'] = filters.template.trim()
        if (Object.keys(search).length) req.search = search as any
        // 透传 filters (isOk, server 端重写为 Success 字段)
        if (filters.isOk.length) {
            req.filters = { isOk: filters.isOk as ('true' | 'false')[] }
        }

        Promise.all([
            logsmssends(date[0].format(), date[1].format(), undefined, req),
            logSmsTimeBucket(date[0].format(), date[1].format()),
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

    // 全网短信消费统计 (短信消耗分布卡 + 表格用)
    const { data: smsMap } = usePromise<Map<string, number>>(async () => {
        const smsRes = await logsmssendsCountInfo()
        return new Map((smsRes.data as any[] || []).map((el: any) => [el._id, el.sum]))
    }, new Map())

    // 短信消耗全网总条数 (W5: 短信消耗总 卡已 drop, smsTotal 仍保留供后续消费)
    const smsTotal = useMemo(() => {
        if (!smsMap) return 0
        let s = 0
        smsMap.forEach((v) => { s += v })
        return s
    }, [smsMap])

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

    // top 5 failing 收件人 (tels) — group 失败 items by tel, count
    const topFailingTels = useMemo(() => {
        const map = new Map<string, number>()
        safeItems.forEach((it) => {
            if (!it?.Error) return
            const tels = Array.isArray(it.tels) ? it.tels : []
            tels.forEach((tel) => {
                if (tel) map.set(tel, (map.get(tel) ?? 0) + 1)
            })
        })
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tel, count]) => ({ tel, count }))
    }, [safeItems])

    // top 5 失败原因 — group 失败 items by Error.Message (aliyun sms), 缺省走 Error.code
    const failReasons = useMemo(() => {
        const map = new Map<string, number>()
        safeItems.forEach((it) => {
            if (!it?.Error) return
            const reason =
                (typeof it.Error === 'object' && (it.Error.Message || it.Error.message || it.Error.Code || it.Error.code)) ||
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

    // W5: 拉 top 10 用户活跃度 (走 BFF dashboard/users/engagement, 拿 enrichment 用)
    // useDashboardStat 期望 { data: { code, data, message? } } (双层), BE 返 universalResult (单层)
    // 用包装函数对齐 hook 类型, hook 内部按 result.data.code / result.data.data 解套
    const { data: userEngagement } = useDashboardStat<UserEngagementItem[]>(
        async () => {
            const r = await getUserEngagement(10)
            return { data: { code: r.code, data: r.data, message: r.message } }
        },
        [],
        []
    )

    // 用户分页 (短信消耗分布表)
    const userApiQuery: PaginationReq = {
        page: userPage, pageSize: userPageSize, needTotal: true,
        ...(userSearch.trim() ? { search: { user: userSearch.trim() } } : {}),
    }
    const { data: userData, loading: userLoading, fecth: refetchUsers } = usePromise<V2ListResponse<Uart.userSetup>>(async () => {
        const { data } = await getUserAlarmSetups(userApiQuery)
        return data as V2ListResponse<Uart.userSetup>
    }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [JSON.stringify(userApiQuery)])

    const users = useMemo(() => userData?.items ?? [], [userData])
    const userPagination = userData?.pagination ?? { total: 0 }
    const enriched = useMemo(() => {
        return users.map((el: any) => {
            const map = (el.tels as string[] || []).map((tel: string) => ({ tel, count: smsMap?.get(tel) || 0 }))
            const count = map.reduce((p: number, c: any) => p + c.count, 0)
            return { user: el.user, map, count }
        })
    }, [users, smsMap])

    // cairui 22:07: 短信消耗分布重设计
    //   1) 过滤掉 count=0 的用户 (没消耗不显示)
    //   2) 按 count 降序排 (消耗多在前)
    //   3) 列出设备 (用 BindDev 接口拿)
    const enrichedFiltered = useMemo(() => {
        return enriched
            .filter((u) => u.count > 0)
            .sort((a, b) => b.count - a.count)
    }, [enriched])

    // 预拉所有用户绑定的设备 (并行 BindDev, 1 次 N+1 拉取)
    // Map<user, Terminal[]>, 主表"设备数"列 + 展开行设备列表都用
    const [userDevices, setUserDevices] = useState<Map<string, Uart.Terminal[]>>(new Map())
    useEffect(() => {
        let cancelled = false
        const targets = enrichedFiltered.map((u) => u.user)
        if (targets.length === 0) {
            setUserDevices(new Map())
            return () => { cancelled = true }
        }
        Promise.all(
            targets.map((u) =>
                BindDev(u)
                    .then((res) => [u, (res.data as any)?.UTs || []] as [string, Uart.Terminal[]])
                    .catch(() => [u, []] as [string, Uart.Terminal[]])
            )
        ).then((entries) => {
            if (cancelled) return
            setUserDevices(new Map(entries))
        })
        return () => { cancelled = true }
    }, [enrichedFiltered])

    const enrichedTotal = enrichedFiltered.reduce((p, c) => p + c.count, 0)
    const enrichedAvg = enrichedFiltered.length > 0 ? Math.round(enrichedTotal / enrichedFiltered.length) : 0

    // 桌面分页切片 (短信日志 Table)
    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize
        return items.slice(start, start + pageSize)
    }, [items, page, pageSize])

    // 触发 fetch
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
                title="短信日志"
                subtitle="查看短信发送历史、消耗统计与时间分桶"
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
                {/* 1. 短信总数 (navigate: 跳到当前时间窗, href 用 date 反向) */}
                <StatCard
                    kind="navigate"
                    label="短信总数"
                    value={bucket.total}
                    variant="primary"
                    icon={<CalendarOutlined />}
                    extra={date ? `${date[0].format('MM-DD HH:mm')} ~ ${date[1].format('MM-DD HH:mm')}` : '加载中…'}
                    href={date ? `/admin/log/sms?startTs=${date[0].valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/sms'}
                />
                {/* 2. 本月新增 (navigate: 跳到本月) */}
                <StatCard
                    kind="navigate"
                    label="本月新增"
                    value={bucket.month}
                    variant="success"
                    icon={<CalendarOutlined />}
                    extra={date ? `自然月 (${dayjs().startOf('month').format('MM-DD')} → ${date[1].format('MM-DD')})` : '加载中…'}
                    href={date ? `/admin/log/sms?startTs=${dayjs().startOf('month').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/sms'}
                />
                {/* 3. 本周新增 (navigate: 跳到本周) */}
                <StatCard
                    kind="navigate"
                    label="本周新增"
                    value={bucket.week}
                    variant="warning"
                    icon={<CalendarOutlined />}
                    extra={date ? `自然周 (周一 ${dayjs().startOf('week').format('MM-DD')} → ${date[1].format('MM-DD')})` : '加载中…'}
                    href={date ? `/admin/log/sms?startTs=${dayjs().startOf('week').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/sms'}
                />
                {/* 4. 今日新增 (navigate: 跳到今天) */}
                <StatCard
                    kind="navigate"
                    label="今日新增"
                    value={bucket.day}
                    variant="danger"
                    icon={<CalendarOutlined />}
                    extra={date ? `今天 (${dayjs().startOf('day').format('MM-DD HH:mm')} → ${date[1].format('MM-DD HH:mm')})` : '加载中…'}
                    href={date ? `/admin/log/sms?startTs=${dayjs().startOf('day').valueOf()}&endTs=${date[1].valueOf()}` : '/admin/log/sms'}
                />
                {/* 5. 今日失败 (drilldown: hover 显示 top 5 failing 收件人 + 活跃度 top 10 参考) */}
                <StatCard
                    kind="drilldown"
                    label="今日失败"
                    value={todayFails}
                    variant="danger"
                    icon={<WarningOutlined />}
                    extra={`今日 ${todayTotal} 条中 (基于当前列表 ≤${MAX_ITEMS})`}
                    data={topFailingTels}
                    trigger="hover"
                    popoverContent={() => (
                        <div style={{ width: 360 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6, fontWeight: 600 }}>
                                Top 5 失败收件人 (tel)
                            </div>
                            {topFailingTels.length === 0 ? (
                                <div style={{ color: 'var(--ink-500)', fontSize: 12, padding: '8px 0 12px' }}>
                                    暂无失败记录
                                </div>
                            ) : (
                                <Table
                                    size="small"
                                    pagination={false}
                                    rowKey="tel"
                                    dataSource={topFailingTels as any}
                                    columns={[
                                        { title: '手机号', dataIndex: 'tel', key: 'tel', ellipsis: true, width: 220 },
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
                                失败原因分布 (Error.Message / code, top 5)
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

                <MyDatePickerRange
                    lastDay={7}
                    onChange={(d) => setDate(d)}
                />

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

                {/* 手机号 input (tels 数组元素模糊) */}
                <Input
                    placeholder="手机号 (模糊)"
                    allowClear
                    value={filters.tels}
                    onChange={(e) => setFilters((f) => ({ ...f, tels: e.target.value }))}
                    onPressEnter={triggerFetch}
                    style={{ width: 200 }}
                    prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                />

                {/* TemplateParam 模糊 (JSON 字符串搜) */}
                <Input
                    placeholder="TemplateParam (模糊)"
                    allowClear
                    value={filters.template}
                    onChange={(e) => setFilters((f) => ({ ...f, template: e.target.value }))}
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

            {/* 主 Table — 短信日志 */}
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
                        description="所选时间范围内暂无短信日志"
                        secondaryLabel="刷新"
                        onSecondary={triggerFetch}
                    />
                ) : (
                    <Table<Uart.logSmsSend>
                        className="v3-table"
                        rowKey="_id"
                        loading={loading}
                        columns={SMS_TABLE_COLUMNS}
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

            {/* 短信消耗分布 (cairui 20:13 拍合并) */}
            <div
                className="bento-card"
                style={{
                    padding: 20,
                    marginBottom: 20,
                }}
            >
                <div style={{ marginBottom: 12, color: 'var(--ink-700)', fontSize: 14, fontWeight: 600 }}>
                    短信消耗分布 (按用户)
                </div>

                {/* 3 卡 Stat 摘要 (用户总数/当前页合计/平均每用户) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div className="bento-card" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>用户总数</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-900)' }}>{userPagination.total}</div>
                    </div>
                    <div className="bento-card" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>当前页合计</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-900)' }}>{enrichedTotal}</div>
                    </div>
                    <div className="bento-card" style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>平均每用户</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-900)' }}>{enrichedAvg}</div>
                    </div>
                </div>

                {/* 用户搜索 + Table */}
                <Space style={{ marginBottom: 12 }}>
                    <Input
                        placeholder="按用户名搜索"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onPressEnter={() => setUserPage(1)}
                        style={{ width: 240 }}
                        allowClear
                        prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={() => setUserPage(1)}
                        className="btn-brand"
                    >
                        搜索
                    </Button>
                </Space>

                {enrichedFiltered.length === 0 && !userLoading ? (
                    <EmptyState
                        description={enriched.length > 0 ? '当前页用户均无短信消耗' : '暂无用户短信消耗数据'}
                        secondaryLabel="刷新"
                        onSecondary={() => refetchUsers()}
                    />
                ) : (
                    <Table
                        className="v3-table"
                        dataSource={generateTableKey(enrichedFiltered, 'user')}
                        loading={userLoading}
                        pagination={{
                            current: userPage,
                            pageSize: userPageSize,
                            total: enrichedFiltered.length,
                            showTotal: (t) => `共 ${t} 个有消耗用户 (已过滤无消耗)`,
                            showSizeChanger: true,
                            pageSizeOptions: [20, 30, 50, 100],
                            onChange: (pag: any) => {
                                setUserPage(pag.current ?? 1)
                                setUserPageSize(pag.pageSize ?? 20)
                            },
                        }}
                        columns={[
                            {
                                dataIndex: 'user',
                                title: '用户',
                                width: 200,
                            },
                            {
                                dataIndex: 'count',
                                title: '短信消耗',
                                width: 110,
                                defaultSortOrder: 'descend',
                                sorter: (a: any, b: any) => a.count - b.count,
                                render: (v: number) => (
                                    <span style={{ color: 'var(--brand-500)', fontWeight: 600 }}>{v}</span>
                                ),
                            },
                            {
                                key: 'devices',
                                title: '设备',
                                width: 90,
                                render: (_, r: any) => {
                                    const devs = userDevices.get(r.user) || []
                                    if (devs.length === 0) return <span style={{ color: 'var(--ink-500)' }}>—</span>
                                    return <Tag color="blue" style={{ margin: 0 }}>{devs.length} 台</Tag>
                                },
                            },
                            {
                                key: 'tels',
                                title: '告警手机',
                                width: 100,
                                render: (_, r: any) => (
                                    <Tag color="purple" style={{ margin: 0 }}>{r.map.length} 个</Tag>
                                ),
                            },
                        ]}
                        expandable={{
                            expandedRowRender: (re: any) => {
                                const devs = userDevices.get(re.user) || []
                                return (
                                    <div className="bento-card" style={{ padding: 16 }}>
                                        <Divider plain>用户信息</Divider>
                                        <UserDes user={re.user}></UserDes>
                                        <Divider plain>设备列表 ({devs.length} 台)</Divider>
                                        {devs.length === 0 ? (
                                            <EmptyState description="该用户未绑定设备" />
                                        ) : (
                                            <Table
                                                className="v3-table"
                                                rowKey="DevMac"
                                                dataSource={generateTableKey(devs as any, 'DevMac')}
                                                columns={[
                                                    { dataIndex: 'name', title: '设备名', width: 200, render: (v: string, r: any) => v || r.DevMac },
                                                    { dataIndex: 'DevMac', title: 'MAC', width: 160, render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
                                                    { dataIndex: 'mountNode', title: '挂载节点', width: 140 },
                                                ]}
                                            />
                                        )}
                                        <Divider plain>告警手机使用情况</Divider>
                                        <Table
                                            className="v3-table"
                                            dataSource={generateTableKey(re.map, 'tel')}
                                            columns={[
                                                { dataIndex: 'tel', title: '告警手机', width: 200 },
                                                {
                                                    dataIndex: 'count',
                                                    title: '次数',
                                                    defaultSortOrder: 'descend',
                                                    sorter: (a: any, b: any) => a.count - b.count,
                                                },
                                            ]}
                                        />
                                    </div>
                                )
                            },
                        }}
                    />
                )}
            </div>

            {/* cairui 2026-07-22: 整个 modal 重设计, 改用 SmsDetailModal (5 section + TemplateParam 解析) */}
            <SmsDetailModal
                open={detailModal.open}
                record={detailModal.record}
                onClose={() => setDetailModal({ open: false, record: null })}
            />
        </div>
    )
}

export default LogSms
