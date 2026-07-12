'use client'

/**
 * P2-3 · 告警 (v3 化)
 *
 * v3 视觉:
 * - PageHeader (h1 + 渐变分隔线)
 * - PageSummary 4 卡 (告警总数 / 未处理 / 今日 / 本周) — 6 variant 覆盖
 * - 2 个图表区改 v3 真实图表 (recharts Pie + Line, bento-card 容器)
 * - 移动端 < 768px → 1 列堆叠 (mobile fix 已 ship)
 * - 数据 0 时图表显示 EmptyState (bento-card 居中), 不 mock
 *
 * 业务: 复用现有 getAlarm / confrimAlarm (有 hex-id guard)
 * 复用现有 isValidAlarmId (24-hex regex)
 *
 * Stub 策略: 后端 0 数据 / 试模式 (403) → 防御性 ?? 兜底
 *            PageSummary 全 0, 图表 EmptyState, 不假数据
 */

import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    DatePicker,
    Form,
    Popconfirm,
    message,
    Spin,
    Table,
} from "antd"
import {
    BellOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { getAlarm, confrimAlarm, isValidAlarmId } from "@/lib/api/fetch"
import { usePromise } from "@/lib/hooks/usePromise"
import { generateTableKey, getColumnSearchProp, tableColumnsFilter } from "@/lib/utils/tableCommon"
import { PageHeader } from "@/components/common/PageHeader"
import { PageSummary, type SummaryVariant } from "@/components/common/PageSummary"
import { StatusTag } from "@/components/common/StatusTag"
import { EmptyState } from "@/components/common/EmptyState"
import { PaginationReq } from '@/types'

interface alarms extends Uart.uartAlarmObject {
    _id?: string
}

// 6 variant 配色 (跟 SEMANTIC token 对齐)
const PIE_COLORS = ['#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#6366f1', '#f43f5e']

const Alarm: React.FC = () => {
    const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(6, "month"),
        dayjs(),
    ])

    const [pageReq, setPageReq] = useState<PaginationReq>({ page: 1, pageSize: 20 })
    const { data: alarmsData, fecth, loading, setData: setAlarmsData } = usePromise<alarms[]>(async () => {
        const { data } = await getAlarm(
            dates[0].format("YYYY/MM/DD H:m:s"),
            dates[1].format("YYYY/MM/DD H:m:s"),
            pageReq
        )
        // 防御：试用模式或鉴权失败时 data 可能不是数组
        if (!Array.isArray(data)) {
            return [] as alarms[]
        }
        return data as alarms[]
    }, [] as alarms[], [dates, pageReq.page, pageReq.pageSize])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const alarms = alarmsData ?? []

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

    // ── 派生统计 ──────────────────────────────────────────────────────────
    const todayCount = useMemo(() => {
        const start = dayjs().startOf('day').valueOf()
        const end = dayjs().endOf('day').valueOf()
        return alarms.filter(a => a.timeStamp >= start && a.timeStamp <= end).length
    }, [alarms])

    const weekCount = useMemo(() => {
        const start = dayjs().subtract(7, 'day').startOf('day').valueOf()
        const end = dayjs().endOf('day').valueOf()
        return alarms.filter(a => a.timeStamp >= start && a.timeStamp <= end).length
    }, [alarms])

    // 折线图: 按日期聚合
    const lineData = useMemo(() => {
        const maps: Map<string, number> = new Map()
        alarms.forEach(el => {
            const date = dayjs(el.timeStamp).format('MM-DD')
            maps.set(date, (maps.get(date) || 0) + 1)
        })
        return [...maps.entries()]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([date, count]) => ({ date, count }))
    }, [alarms])

    // 饼图: 按类型聚合
    const pieData = useMemo(() => {
        const maps: Map<string, number> = new Map()
        alarms.forEach(el => {
            const tag = el.tag || '其他'
            maps.set(tag, (maps.get(tag) || 0) + 1)
        })
        return [...maps.entries()].map(([tag, count]) => ({ tag, count }))
    }, [alarms])

    // ── 确认告警 (复用 isValidAlarmId guard) ─────────────────────────────
    const confirm = async (_id?: string) => {
        if (!isValidAlarmId(_id)) {
            message.warning('告警 id 缺失或格式不合法，无法确认')
            console.warn('[Alarm.confirm] invalid _id:', _id)
            return
        }
        try {
            await confrimAlarm(_id)
        } catch (err) {
            message.error('确认失败：' + (err instanceof Error ? err.message : '未知错误'))
            return
        }
        const a = alarms.find(el_1 => el_1._id === _id)
        if (a) a.isOk = true
        setAlarmsData([...alarms])
        message.success("操作成功")
    }

    const confirmAll = async () => {
        // 批量确认: 逐个调用 confirm (保留每个 id 的 hex guard)
        const ids = alarms.filter(a => !a.isOk).map(a => a._id).filter(isValidAlarmId)
        if (ids.length === 0) {
            message.info('没有可确认的告警')
            return
        }
        let okCount = 0
        for (const id of ids) {
            try {
                await confrimAlarm(id)
                okCount++
            } catch (err) {
                console.warn('[confirmAll] id=' + id, err)
            }
        }
        setAlarmsData(prev => prev.map(a => (a._id && ids.includes(a._id) ? { ...a, isOk: true } : a)))
        message.success(`已确认 ${okCount}/${ids.length} 条告警`)
    }

    // ── 渲染 ─────────────────────────────────────────────────────────────
    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="告警中心"
                subtitle="查看并确认设备告警，跟踪历史趋势"
                breadcrumb={[
                    { title: '首页', href: '/main' },
                    { title: '告警' },
                ]}
                extra={
                    <Form layout="inline" style={{ margin: 0 }}>
                        <Form.Item label="时间区间" style={{ marginBottom: 0 }}>
                            <DatePicker.RangePicker
                                value={dates as any}
                                onChange={value => setDates(value as any)}
                                allowClear={false}
                            />
                        </Form.Item>
                    </Form>
                }
            />

            {/* PageSummary 4 卡 — 6 variant 全覆盖 (primary/success/warning/danger/info/purple) */}
            <PageSummary
                items={[
                    {
                        label: '告警总数',
                        value: alarms.length,
                        variant: 'primary' as SummaryVariant,
                        icon: <BellOutlined />,
                    },
                    {
                        label: '未处理',
                        value: alarms.filter(a => !a.isOk).length,
                        variant: 'danger' as SummaryVariant,
                        extra: alarms.length > 0
                            ? `${Math.round((alarms.filter(a => !a.isOk).length / alarms.length) * 100)}% 未处理`
                            : '—',
                        icon: <WarningOutlined />,
                    },
                    {
                        label: '今日',
                        value: todayCount,
                        variant: 'warning' as SummaryVariant,
                        icon: <ClockCircleOutlined />,
                    },
                    {
                        label: '本周',
                        value: weekCount,
                        variant: 'info' as SummaryVariant,
                        extra: alarms.length > 0
                            ? `${Math.round((weekCount / alarms.length) * 100)}% 占比`
                            : '—',
                        icon: <CheckCircleOutlined />,
                    },
                ]}
            />

            {/* 图表区 — 桌面 2 列 (1:1) · 移动 1 列堆叠 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: 20,
                    marginBottom: 24,
                }}
            >
                {/* 告警类型占比 · PieChart */}
                <div className="bento-card" style={{ minHeight: 360 }}>
                    <h3
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            margin: '0 0 4px',
                            color: 'var(--ink-900)',
                        }}
                    >
                        告警类型占比
                    </h3>
                    <p
                        style={{
                            fontSize: 12,
                            color: 'var(--ink-500)',
                            margin: '0 0 16px',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {'// distribution by tag · '}{pieData.length} 类
                    </p>
                    {pieData.length === 0 ? (
                        <EmptyState
                            description="暂无告警数据"
                            minHeight={240}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="count"
                                    nameKey="tag"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={88}
                                    innerRadius={50}
                                    paddingAngle={2}
                                    label={((props: any) =>
                                        `${props.tag ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                                    ) as any}
                                    labelLine={false}
                                >
                                    {pieData.map((entry, i) => {
                                        const color = PIE_COLORS[i % PIE_COLORS.length] ?? '#8b5cf6'
                                        return <Cell key={i} fill={color} />
                                    })}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.96)',
                                        border: '1px solid var(--ink-200)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 告警数量 · LineChart */}
                <div className="bento-card" style={{ minHeight: 360 }}>
                    <h3
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            margin: '0 0 4px',
                            color: 'var(--ink-900)',
                        }}
                    >
                        告警数量趋势
                    </h3>
                    <p
                        style={{
                            fontSize: 12,
                            color: 'var(--ink-500)',
                            margin: '0 0 16px',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {'// daily count · '}{lineData.length} 天
                    </p>
                    {lineData.length === 0 ? (
                        <EmptyState
                            description="暂无告警数据"
                            minHeight={240}
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart
                                data={lineData}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="alarmLine" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#f472b6" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-200)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.96)',
                                        border: '1px solid var(--ink-200)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="告警数量"
                                    stroke="url(#alarmLine)"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#8b5cf6' }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 告警列表 + 批量操作 */}
            <div
                className="bento-card"
                style={{ padding: 24 }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                        flexWrap: 'wrap',
                        gap: 8,
                    }}
                >
                    <h3
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--ink-900)',
                        }}
                    >
                        告警列表 ({alarms.length})
                    </h3>
                    <Popconfirm
                        title="是否确认全部告警，操作无法取消"
                        onCancel={() => message.warning('取消操作')}
                        onConfirm={confirmAll}
                    >
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                        >
                            确认全部告警
                        </Button>
                    </Popconfirm>
                </div>

                {loading ? (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: 40,
                        }}
                    >
                        <Spin tip="加载中…" />
                    </div>
                ) : alarms.length === 0 ? (
                    <EmptyState
                        description="当前时间区间无告警"
                        minHeight={240}
                    />
                ) : isMobile ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                        }}
                    >
                        {alarms.map((a, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: 12,
                                    background: 'var(--bg-hover)',
                                    borderRadius: 12,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                        }}
                                    >
                                        {a.devName || a.mac}
                                    </span>
                                    <StatusTag
                                        variant={a.isOk ? 'online' : 'warning'}
                                        size="sm"
                                        text={a.isOk ? '已确认' : '待处理'}
                                    />
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--ink-500)',
                                        marginBottom: 4,
                                    }}
                                >
                                    {a.tag} · PID {a.pid}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--ink-700)',
                                        marginBottom: 6,
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {a.msg}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: 'var(--ink-400)',
                                            fontFamily: 'var(--font-mono)',
                                        }}
                                    >
                                        {dayjs(a.timeStamp).format('MM-DD H:m:s')}
                                    </span>
                                    {a.isOk ? (
                                        <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                                            已确认
                                        </span>
                                    ) : !isValidAlarmId(a._id) ? (
                                        <Button
                                            type="primary"
                                            danger
                                            size="small"
                                            disabled
                                            title="告警 id 不合法"
                                        >
                                            确认
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            danger
                                            size="small"
                                            onClick={() => confirm(a._id)}
                                        >
                                            确认
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Table
                        className="v3-table"
                        dataSource={generateTableKey(alarms, '_id')}
                        size="small"
                        pagination={{
                            current: pageReq.page ?? 1,
                            pageSize: pageReq.pageSize ?? 20,
                            total: alarms.length,
                            showTotal: t => `共 ${t} 条`,
                            showSizeChanger: true,
                            onChange: (page, pageSize) =>
                                setPageReq({ ...pageReq, page, pageSize }),
                        }}
                    >
                        <Table.Column
                            title="状态"
                            dataIndex="isOk"
                            width={90}
                            render={(v: boolean) => (
                                <StatusTag
                                    variant={v ? 'online' : 'warning'}
                                    size="sm"
                                    text={v ? '已确认' : '待处理'}
                                />
                            )}
                        />
                        <Table.Column
                            responsive={["sm"]}
                            title="网关"
                            dataIndex="mac"
                            key="mac"
                            ellipsis
                            {...tableColumnsFilter(alarms, 'mac')}
                        />
                        <Table.Column
                            title="设备"
                            dataIndex="devName"
                            key="devName"
                            {...tableColumnsFilter(alarms, 'devName')}
                        />
                        <Table.Column
                            title="消息"
                            dataIndex="msg"
                            key="msg"
                            ellipsis
                            {...getColumnSearchProp<alarms>('msg')}
                            render={(val, record: any) =>
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
                        />
                        <Table.Column
                            responsive={["sm"]}
                            title="类型"
                            dataIndex="tag"
                            key="tag"
                            {...tableColumnsFilter(alarms, 'tag')}
                        />
                        <Table.Column
                            title="时间"
                            dataIndex="timeStamp"
                            key="timeStamp"
                            defaultSortOrder="descend"
                            sorter={(a: any, b: any) => a.timeStamp - b.timeStamp}
                            render={(value: number) => (
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 12,
                                    }}
                                >
                                    {dayjs(value).format('MM-DD H:M:s')}
                                </span>
                            )}
                        />
                        <Table.Column
                            title="操作"
                            key="op"
                            width={100}
                            render={(_, record: alarms) => {
                                if (record.isOk)
                                    return (
                                        <span style={{ color: 'var(--ink-400)' }}>
                                            已确认
                                        </span>
                                    )
                                if (!isValidAlarmId(record._id)) {
                                    return (
                                        <Button
                                            type="primary"
                                            danger
                                            size="small"
                                            disabled
                                            title="告警 id 不合法"
                                        >
                                            确认
                                        </Button>
                                    )
                                }
                                return (
                                    <Button
                                        type="primary"
                                        danger
                                        size="small"
                                        onClick={() => confirm(record._id)}
                                    >
                                        确认
                                    </Button>
                                )
                            }}
                        />
                    </Table>
                )}
            </div>
        </div>
    )
}

export default Alarm
