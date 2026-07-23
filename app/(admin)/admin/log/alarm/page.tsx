'use client'
/**
 * admin 报警日志页 (v3 hybrid v4 设计语言 · 2026-07-20)
 *
 * v4 改版 (cairui 13:48 拍 6 维筛选 + server-errors layout + 顶部 4 卡时间分桶):
 * 1) 顶部 4 卡改成 "总数 / 月新增 / 周新增 / 日新增", 走 server agg 接口
 *    (server feat/alarm-time-bucket, 自然周口径)
 * 2) 6 维筛选条 (server-errors 风格横排 wrap):
 *    时间快选 (1h/24h/7d/30d) + 状态 + 严重程度 + 设备名 + 协议 + 标签
 * 3) 5 业务筛选 (状态/严重程度/设备/协议/标签) 走 server search/filters
 *    (server feat/alarm-filter-ui, buildMongoFilter 模式)
 * 4) tag 分布 (跟筛选联动) — 从 server agg 接口拿, 不再用 client 端 items.reduce
 *
 * 视觉:
 * - 顶部 PageSummary 4 卡 (总数 / 月新增 / 周新增 / 日新增)
 * - 桌面 (>= 768px): 6 维筛选条 + tag 分布 + 5 列 Table
 * - 移动 (< 768px): 简化筛选 (时间快选) + cards 视图
 *
 * 数据流 (一次 page render 触发 2 个 server 请求):
 * - loguartterminaldatatransfinites(date, query): items[≤200] + pagination.total
 * - logAlarmTimeBucket(date): 4 个真实 total + tag 分布
 */

import { Button, Input, Select, Space, Spin, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
    ReloadOutlined, SearchOutlined, CloseCircleOutlined,
    CheckCircleOutlined, FireOutlined, BellOutlined,
    CalendarOutlined, FilterOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import {
    loguartterminaldatatransfinites,
    logAlarmTimeBucket,
} from '@/lib/api/fetchRoot'
import { getColumnSearchProp, generateTableKey } from '@/lib/utils/tableCommon'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'
import { AlarmDetailModal } from './_components/AlarmDetailModal'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// server MAX_PAGE_SIZE = 200 (from midwayuartserver pagination.helper.ts)
const MAX_ITEMS = 200

// 状态枚举 (server filters.isOk 白名单)
const STATUS_OPTIONS = [
    { value: 'false', label: <Tag color="error" style={{ margin: 0 }}>告警中</Tag> },
    { value: 'true', label: <Tag color="success" style={{ margin: 0 }}>已恢复</Tag> },
]

// 严重程度枚举 (server filters.severity 白名单, AlarmSeverity 类型)
const SEVERITY_OPTIONS: { value: Uart.AlarmSeverity; label: React.ReactNode }[] = [
    { value: 'critical', label: <Tag color="error" style={{ margin: 0 }}><FireOutlined /> 严重</Tag> },
    { value: 'warning', label: <Tag color="warning" style={{ margin: 0 }}>警告</Tag> },
    { value: 'info', label: <Tag color="blue" style={{ margin: 0 }}>提示</Tag> },
]

// 时间快选 (cairui 拍 1h/24h/7d/30d)
const TIME_QUICK_OPTIONS: { value: string; label: string; hours: number }[] = [
    { value: '1h', label: '最近 1h', hours: 1 },
    { value: '24h', label: '最近 24h', hours: 24 },
    { value: '7d', label: '最近 7d', hours: 24 * 7 },
    { value: '30d', label: '最近 30d', hours: 24 * 30 },
]

// ─── 移动端卡片视图 ────────────────────────────────────────────────────────

const MobileAlarmCards: React.FC<{
    items: Uart.uartAlarmObject[]
    loading: boolean
    total: number
    onRefresh: () => void
    onItemClick?: (item: Uart.uartAlarmObject) => void
}> = ({ items, loading, total, onRefresh, onItemClick }) => {
    return (
        <>
            {loading && items.length === 0 ? (
                <div className="bento-card" style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                </div>
            ) : items.length === 0 ? (
                <div className="bento-card" style={{ padding: 0 }}>
                    <EmptyState
                        description="所选时间范围内暂无告警"
                        secondaryLabel="刷新"
                        onSecondary={onRefresh}
                    />
                </div>
            ) : (
                <>
                    {total > items.length && (
                        <div
                            style={{
                                marginBottom: 12,
                                padding: '8px 12px',
                                fontSize: 12,
                                color: 'var(--ink-500)',
                                background: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                borderRadius: 8,
                            }}
                        >
                            ⚠️ 移动端仅展示前 {items.length} 条 (共 {total} 条); 切换桌面端可看完整列表
                        </div>
                    )}
                    <div className="alarm-mobile-cards" data-testid="alarm-mobile-cards">
                        {generateTableKey(items as any, '_id').map((item: any) => {
                            const ts = item.timeStamp
                            const d = ts ? dayjs(ts) : null
                            const relative = d ? d.fromNow() : '—'
                            return (
                                <div
                                    key={item._id ?? `${item.mac}-${ts}-${item.pid}`}
                                    className="alarm-mobile-card"
                                    onClick={onItemClick ? () => onItemClick(item) : undefined}
                                    style={onItemClick ? { cursor: 'pointer' } : undefined}
                                >
                                    <div className="alarm-mobile-card-header">
                                        <span className="alarm-mac">{item.mac || '—'}</span>
                                        <span className="alarm-mobile-card-time" title={d ? d.format('YYYY-MM-DD HH:mm:ss') : ''}>
                                            {relative}
                                        </span>
                                    </div>
                                    <div className="alarm-mobile-card-body">
                                        <div className="kv">
                                            <span>设备</span>
                                            <span>{item.devName || '—'}</span>
                                        </div>
                                        <div className="kv">
                                            <span>协议 / PID</span>
                                            <span>
                                                {item.protocol || '—'} / {item.pid ?? '—'}
                                            </span>
                                        </div>
                                        <div className="kv">
                                            <span>状态</span>
                                            <span>
                                                {item.isOk ? (
                                                    <Tag color="success">已恢复</Tag>
                                                ) : (
                                                    <Tag color="error">告警中</Tag>
                                                )}
                                            </span>
                                        </div>
                                        {item.severity && (
                                            <div className="kv">
                                                <span>严重程度</span>
                                                <span>
                                                    {item.severity === 'critical' ? (
                                                        <Tag color="error" style={{ margin: 0 }}><FireOutlined /> 严重</Tag>
                                                    ) : item.severity === 'warning' ? (
                                                        <Tag color="warning" style={{ margin: 0 }}>警告</Tag>
                                                    ) : (
                                                        <Tag color="blue" style={{ margin: 0 }}>提示</Tag>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {item.tag && (
                                            <div className="alarm-mobile-card-tags">
                                                <Tag color="purple">{item.tag}</Tag>
                                            </div>
                                        )}
                                    </div>
                                    {item.msg && (
                                        <div className="alarm-mobile-card-msg">{item.msg}</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </>
    )
}

// ─── 桌面 Table 列定义 ──────────────────────────────────────────────────────

const TABLE_COLUMNS: ColumnsType<Uart.uartAlarmObject> = [
    {
        dataIndex: 'mac',
        title: 'MAC 地址',
        width: 160,
        ...getColumnSearchProp('mac'),
    },
    {
        dataIndex: 'pid',
        title: 'PID',
        width: 70,
    },
    {
        dataIndex: 'tag',
        title: '标签',
        width: 130,
        render: (v: string) => v ? <Tag color="purple">{v}</Tag> : '—',
        ...getColumnSearchProp('tag'),
    },
    {
        dataIndex: 'msg',
        title: '消息',
        ellipsis: true,
    },
    {
        dataIndex: 'timeStamp',
        title: '时间',
        width: 170,
        defaultSortOrder: 'descend',
        sorter: (a: Uart.uartAlarmObject, b: Uart.uartAlarmObject) => a.timeStamp - b.timeStamp,
        render: (v: number) => (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
            </span>
        ),
    },
]

// ─── 筛选条件 type ──────────────────────────────────────────────────────────

interface AlarmFilters {
    /** 状态 (isOk) 多选: 'true'=已恢复 / 'false'=告警中 */
    isOk: string[]
    /** 严重程度多选 */
    severity: Uart.AlarmSeverity[]
    /** 设备名模糊搜索 */
    devName: string
    /** 协议多选 */
    protocol: string[]
    /** 标签多选 */
    tag: string[]
}

const EMPTY_FILTERS: AlarmFilters = {
    isOk: [],
    severity: [],
    devName: '',
    protocol: [],
    tag: [],
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const LogAlarm: React.FC = () => {
    // 共享 date state
    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ])

    // 桌面分页 state
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)

    // 筛选 state
    const [filters, setFilters] = useState<AlarmFilters>(EMPTY_FILTERS)
    /** 触发 fetch 的签名: filters / date / page / pageSize 任一变化都重新拉 */
    const [fetchKey, setFetchKey] = useState(0)

    // 移动端 detection
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // 一次 page render 拉 2 个 server 接口:
    // 1) transfinite list (受 filters + date 影响, 拿 items + total)
    // 2) time bucket (受 filters + date 影响, 拿 4 卡真实 total + tag 分布)
    // 2 个接口都受同样筛选影响, 所以时间桶的 total 跟列表 total 含义一致
    const [items, setItems] = useState<Uart.uartAlarmObject[]>([])
    const [realTotal, setRealTotal] = useState(0)
    const [bucket, setBucket] = useState<Uart.UartAlarmTimeBucket>({
        total: 0, month: 0, week: 0, day: 0, tags: [],
    })
    const [loading, setLoading] = useState(false)

    // 详情 Modal (跟 mail/sms 模式一致: 列表移出详情列, 点击行弹窗)
    const [detailModal, setDetailModal] = useState<{ open: boolean; record: Uart.uartAlarmObject | null }>({
        open: false,
        record: null,
    })

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const req: Uart.UartAlarmListReq = {
            page: 1,
            pageSize: MAX_ITEMS,
            needTotal: true,
        }
        // 透传 filters (5 维业务筛选, server 端走 buildMongoFilter 白名单)
        if (filters.isOk.length || filters.severity.length || filters.protocol.length || filters.tag.length) {
            req.filters = {
                ...(filters.isOk.length ? { isOk: filters.isOk as ('true' | 'false')[] } : {}),
                ...(filters.severity.length ? { severity: filters.severity } : {}),
                ...(filters.protocol.length ? { protocol: filters.protocol } : {}),
                ...(filters.tag.length ? { tag: filters.tag } : {}),
            }
        }
        // 透传 search (设备名模糊)
        if (filters.devName.trim()) {
            req.search = { devName: filters.devName.trim() }
        }

        Promise.all([
            loguartterminaldatatransfinites(date[0].format(), date[1].format(), req),
            logAlarmTimeBucket(date[0].format(), date[1].format()),
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

    // 协议 / 标签的 available options (从当前 items 自动算, server 端没返 distinct list)
    const protocolOptions = useMemo(() => {
        const s = new Set<string>()
        items.forEach((it) => { if (it.protocol) s.add(it.protocol) })
        return Array.from(s).sort()
    }, [items])
    const tagOptions = useMemo(() => {
        // 优先用 server agg 的 tag 分布, fallback 到 client items
        const fromBucket = bucket.tags.map((t) => t.type).filter(Boolean)
        if (fromBucket.length) return Array.from(new Set(fromBucket)).sort()
        const s = new Set<string>()
        items.forEach((it) => { if ((it as any).tag) s.add((it as any).tag) })
        return Array.from(s).sort()
    }, [items, bucket.tags])

    // 触发 fetch 的 wrapper
    const triggerFetch = () => {
        setPage(1)
        setFetchKey((k) => k + 1)
    }

    // 时间快选
    const handleQuickTime = (hours: number) => {
        setDate([dayjs().subtract(hours, 'hour'), dayjs()])
        // date 变 → useEffect 自动重 fetch
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
                title="告警日志"
                subtitle="查看设备告警事件历史记录"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '日志' },
                ]}
            />

            <PageSummary
                column={4}
                items={[
                    {
                        label: '告警总数',
                        value: bucket.total,
                        variant: 'primary',
                        icon: <BellOutlined />,
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

            {/* 桌面 6 维筛选条 (server-errors 风格) */}
            {!isMobile && (
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

                    {/* 状态多选 */}
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="状态"
                        style={{ minWidth: 140 }}
                        value={filters.isOk}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, isOk: v }))}
                        options={STATUS_OPTIONS}
                        maxTagCount="responsive"
                    />

                    {/* 严重程度多选 */}
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="严重程度"
                        style={{ minWidth: 160 }}
                        value={filters.severity}
                        onChange={(v: Uart.AlarmSeverity[]) => setFilters((f) => ({ ...f, severity: v }))}
                        options={SEVERITY_OPTIONS}
                        maxTagCount="responsive"
                    />

                    {/* 设备名 input */}
                    <Input
                        placeholder="设备名 (模糊)"
                        allowClear
                        value={filters.devName}
                        onChange={(e) => setFilters((f) => ({ ...f, devName: e.target.value }))}
                        onPressEnter={triggerFetch}
                        style={{ width: 200 }}
                        prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                    />

                    {/* 协议多选 */}
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="协议"
                        style={{ minWidth: 120 }}
                        value={filters.protocol}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, protocol: v }))}
                        options={protocolOptions.map((p) => ({ value: p, label: p }))}
                        maxTagCount="responsive"
                    />

                    {/* 标签多选 */}
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="标签"
                        style={{ minWidth: 140 }}
                        value={filters.tag}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, tag: v }))}
                        options={tagOptions.map((t) => ({ value: t, label: <Tag color="purple" style={{ margin: 0 }}>{t}</Tag> }))}
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
            )}

            {/* 移动端简化筛选条 (时间快选 + 刷新) */}
            {isMobile && (
                <div className="bento-card" style={{ padding: 16, marginBottom: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                        <MyDatePickerRange lastDay={7} onChange={setDate}>
                            <Button
                                type="primary"
                                size="small"
                                icon={<ReloadOutlined />}
                                loading={loading}
                                onClick={triggerFetch}
                                className="btn-brand"
                            >
                                刷新
                            </Button>
                        </MyDatePickerRange>
                    </div>
                    <Space.Compact size="small" style={{ width: '100%' }}>
                        {TIME_QUICK_OPTIONS.map((opt) => (
                            <Button
                                key={opt.value}
                                size="small"
                                onClick={() => handleQuickTime(opt.hours)}
                                style={{ flex: 1 }}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </Space.Compact>
                </div>
            )}

            {isMobile ? (
                <MobileAlarmCards
                    items={items}
                    loading={loading}
                    total={realTotal}
                    onRefresh={triggerFetch}
                    onItemClick={(item) => setDetailModal({ open: true, record: item })}
                />
            ) : (
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
                    {/* Tag 分布 (从 server agg 拿, 跟筛选联动) */}
                    {bucket.tags.length > 0 && (
                        <div
                            data-testid="alarm-tag-dist"
                            style={{
                                marginBottom: 12,
                                padding: '12px 16px',
                                background: 'rgba(139, 92, 246, 0.04)',
                                border: '1px solid rgba(139, 92, 246, 0.12)',
                                borderRadius: 8,
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
                                标签分布 (当前筛选条件内)
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {bucket.tags.map((t) => (
                                    <div
                                        key={t.type}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 10px',
                                            background: 'rgba(255,255,255,0.6)',
                                            borderRadius: 999,
                                            fontSize: 12,
                                        }}
                                    >
                                        <Tag color="purple" style={{ margin: 0 }}>{t.type}</Tag>
                                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{t.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 主 Table */}
                    <Table<Uart.uartAlarmObject>
                        className="v3-table"
                        rowKey="_id"
                        loading={loading}
                        columns={TABLE_COLUMNS}
                        dataSource={generateTableKey(pagedItems as any, '_id')}
                        // 动态 scroll.y: 装下当前页实际行数 + 头, 不留空白
                        // 兜底 min 280 避免空 table / loading 状态太挤
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
                        // 跟 mail/sms 一致: 列表移出详情列, 点击行弹窗
                        onRow={(record) => ({
                            onClick: () => setDetailModal({ open: true, record }),
                            style: { cursor: 'pointer' },
                        })}
                    />
                </div>
            )}

            {/* 告警详情 Modal (跟 mail/sms 详情模式一致) */}
            <AlarmDetailModal
                open={detailModal.open}
                record={detailModal.record}
                onClose={() => setDetailModal({ open: false, record: null })}
            />
        </div>
    )
}

export default LogAlarm
