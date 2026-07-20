'use client'
/**
 * admin 短信日志页 (v3 hybrid v4 设计语言 · 2026-07-20)
 *
 * feat/mail-sms-filter-ui (cairui 20:13 拍"一样的重构流程", 跟 alarm 一样):
 * 1) 顶部 5 卡 (cairui 拍"5 卡 全在 1 页" — 4 时间分桶 + 1 短信消耗总):
 *    短信总数 / 本月新增 / 本周新增 / 今日新增 / 短信消耗总
 *    4 时间分桶走 server agg /sms/count-by-bucket
 *    短信消耗总走 logsmssendsCountInfo (复用, 加)
 * 2) 4 维筛选条 (server-errors 风格):
 *    时间快选 + 手机号 + 结果 + TemplateParam 模糊
 * 3) 短信消耗 tab 合并到 1 页:
 *    - 顶部 5 卡(第 5 卡 = 短信消耗总)
 *    - 主 Table (短信日志) 在筛选条下
 *    - 短信消耗分布 (用户/次数) 在主 Table 下, 用 logsmssendsCountInfo + getUserAlarmSetups
 *
 * cairui 21:40 追加精简:
 *  - 列表移除"结果"列 (截断看不清 / 列表不需要)
 *  - 单击行弹 Modal 详情 (sendParams / Success / Error 全展示)
 *  - 沿用 components/chart/MailStatsChart.tsx 的 onRow.click + Modal 模式
 *
 * 视觉 (跟 alarm / server-errors 一致):
 * - 顶部 PageSummary 5 卡
 * - 4 维筛选条 + 3 列 Table (收件人 / 发送参数 / 时间)
 * - 短信消耗分布表 (页底, 折叠可考虑, 暂不折)
 */

import {
    Button, Divider, Input, Modal, Select, Space, Spin, Table, Tag, Tabs,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
    ReloadOutlined, SearchOutlined, CloseCircleOutlined,
    CheckCircleOutlined, CalendarOutlined, FilterOutlined,
    TeamOutlined, DollarOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import {
    logsmssends,
    logsmssendsCountInfo,
    logSmsTimeBucket,
    getUserAlarmSetups,
} from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'
import { UserDes } from '@/components/data/UserDes'
import { DesList } from '@/components/data/DesList'
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
    // 共享 date state
    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ])

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

    // 短信消耗全网总条数 (5 卡中第 5 个)
    const smsTotal = useMemo(() => {
        if (!smsMap) return 0
        let s = 0
        smsMap.forEach((v) => { s += v })
        return s
    }, [smsMap])

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
    const enrichedTotal = enriched.reduce((p, c) => p + c.count, 0)
    const enrichedAvg = enriched.length > 0 ? Math.round(enrichedTotal / enriched.length) : 0

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

            {/* 5 卡 (cairui 20:13 拍): 4 时间分桶 + 1 短信消耗总 */}
            <PageSummary
                column={5}
                items={[
                    {
                        label: '短信总数',
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
                    {
                        label: '短信消耗总',
                        value: smsTotal,
                        variant: 'info',
                        icon: <DollarOutlined />,
                        extra: `全网累计 (来自 logsmssendsCountInfo)`,
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

                {enriched.length === 0 && !userLoading ? (
                    <EmptyState
                        description="暂无用户短信消耗数据"
                        secondaryLabel="刷新"
                        onSecondary={() => refetchUsers()}
                    />
                ) : (
                    <Table
                        className="v3-table"
                        dataSource={generateTableKey(enriched, 'user')}
                        loading={userLoading}
                        pagination={{
                            current: userPage,
                            pageSize: userPageSize,
                            total: userPagination.total,
                            showTotal: (t) => `共 ${t} 个用户`,
                            showSizeChanger: true,
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
                                title: '合计',
                                width: 100,
                                defaultSortOrder: 'descend',
                                sorter: (a: any, b: any) => a.count - b.count,
                            },
                        ]}
                        expandable={{
                            expandedRowRender: (re: any) => (
                                <div className="bento-card" style={{ padding: 16 }}>
                                    <Divider plain>用户信息</Divider>
                                    <UserDes user={re.user}></UserDes>
                                    <Divider plain>使用情况</Divider>
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
                            ),
                        }}
                    />
                )}
            </div>

            {/* cairui 21:40: 点击行弹 Modal 详情 (sendParams / Success / Error) */}
            <Modal
                title="短信详情"
                open={detailModal.open}
                onCancel={() => setDetailModal({ open: false, record: null })}
                footer={null}
                width={720}
            >
                {detailModal.record && (
                    <>
                        <DesList title="收件人" data={{ tels: detailModal.record.tels }} />
                        <DesList title="发送参数" data={detailModal.record.sendParams} />
                        <DesList
                            title="结果"
                            data={{
                                Success: detailModal.record.Success ?? null,
                                Error: detailModal.record.Error ?? null,
                            }}
                        />
                        <DesList
                            title="时间"
                            data={{
                                timeStamp: detailModal.record.timeStamp
                                    ? dayjs(detailModal.record.timeStamp).format('YYYY-MM-DD HH:mm:ss')
                                    : null,
                            }}
                        />
                    </>
                )}
            </Modal>
        </div>
    )
}

export default LogSms
