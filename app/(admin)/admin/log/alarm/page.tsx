'use client'
/**
 * admin 报警日志页 (v3 hybrid v4 设计语言 · 2026-07-17)
 *
 * 视觉:
 * - 顶部 PageSummary 4 卡 (总数 / 已恢复 / 告警中 / 严重告警) — 全程可见
 * - 桌面 (>= 768px) 走共享 Log 组件 → 5 列 Table + Pies 概览
 * - 移动 (< 768px) 走 .alarm-mobile-cards 卡片视图, 时间用 dayjs.fromNow() 相对时间
 *   (5 列 Table 在 mobile 视口被挤压、msg 截断、时间列竖排)
 *
 * 移动端数据流共享父级 usePromise (避免重复请求), 桌面走 Log 组件
 * (Log 组件不可拆, 不动它以免影响其他 6 个调用方)
 */

import { Button, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
    ReloadOutlined, AlertOutlined, CheckCircleOutlined,
    WarningOutlined, FireOutlined, BellOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import { Log } from '@/components/log/log'
import { loguartterminaldatatransfinites } from '@/lib/api/fetchRoot'
import { getColumnSearchProp, generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// ─── 移动端卡片视图 (数据由父级传入, 避免双请求) ─────────────────────────

const MobileAlarmCards: React.FC<{
    items: Uart.uartAlarmObject[]
    loading: boolean
    onRefresh: () => void
}> = ({ items, loading, onRefresh }) => {
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
                <div className="alarm-mobile-cards" data-testid="alarm-mobile-cards">
                    {generateTableKey(items as any, '_id').map((item: any) => {
                        const ts = item.timeStamp
                        const d = ts ? dayjs(ts) : null
                        const relative = d ? d.fromNow() : '—'
                        return (
                            <div key={item._id ?? `${item.mac}-${ts}-${item.pid}`} className="alarm-mobile-card">
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
                                                    <Tag color="warning" style={{ margin: 0 }}><WarningOutlined /> 警告</Tag>
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
            )}
        </>
    )
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const LogAlarm: React.FC = () => {
    // 共享 date state (PageSummary + mobile 都需要)
    const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(30, 'day'),
        dayjs(),
    ])

    // 移动端 detection: < 768px 走 cards 视图, 桌面走 Table (共享 Log 组件)
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // 全量数据 (移动端用, 桌面 stats 也用) — 全程在父级维护
    const { data, loading, fecth } = usePromise<Uart.uartAlarmObject[]>(
        async () => {
            const { data } = await loguartterminaldatatransfinites(
                date[0].format(),
                date[1].format(),
            )
            const items = Array.isArray(data) ? data : data?.items ?? []
            return Array.isArray(items) ? items : []
        },
        [] as Uart.uartAlarmObject[],
        [date],
    )

    // 顶部统计: 总数 / 已恢复 / 告警中 / 严重
    const stats = useMemo(() => {
        const items = data ?? []
        const total = items.length
        const recovered = items.filter((i) => i.isOk).length
        const active = items.filter((i) => !i.isOk).length
        const critical = items.filter((i) => i.severity === 'critical').length
        const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0
        return { total, recovered, active, critical, recoveryRate }
    }, [data])

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
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
                        value: stats.total,
                        variant: 'primary',
                        icon: <BellOutlined />,
                        extra: `${date[0].format('MM-DD')} ~ ${date[1].format('MM-DD')}`,
                    },
                    {
                        label: '已恢复',
                        value: stats.recovered,
                        variant: 'success',
                        icon: <CheckCircleOutlined />,
                        extra: stats.total > 0 ? `${stats.recoveryRate}% 恢复率` : undefined,
                    },
                    {
                        label: '告警中',
                        value: stats.active,
                        variant: 'warning',
                        icon: <WarningOutlined />,
                        extra: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% 当前占比` : undefined,
                    },
                    {
                        label: '严重告警',
                        value: stats.critical,
                        variant: 'danger',
                        icon: <FireOutlined />,
                        extra: stats.total > 0 ? `${Math.round((stats.critical / stats.total) * 100)}% 占比` : undefined,
                    },
                ]}
            />

            {isMobile && (
                <div className="bento-card" style={{ padding: 16, marginBottom: 20 }}>
                    <MyDatePickerRange
                        lastDay={30}
                        onChange={setDate}
                    >
                        <Button
                            type="primary"
                            size="small"
                            icon={<ReloadOutlined />}
                            loading={loading}
                            onClick={() => fecth()}
                            className="btn-brand"
                        >
                            刷新
                        </Button>
                    </MyDatePickerRange>
                </div>
            )}

            {isMobile ? (
                <MobileAlarmCards
                    items={data ?? []}
                    loading={loading}
                    onRefresh={() => fecth()}
                />
            ) : (
                <div className="bento-card" style={{ padding: 20, marginBottom: 20 }}>
                    <Log
                        lastDay={30}
                        dataFun={loguartterminaldatatransfinites}
                        cPie={['tag']}
                        columns={[
                            { dataIndex: 'mac', title: 'MAC 地址', ...getColumnSearchProp('mac') },
                            { dataIndex: 'pid', title: 'PID' },
                            { dataIndex: 'tag', title: '标签', ...getColumnSearchProp('tag') },
                            { dataIndex: 'msg', title: '消息', ellipsis: true },
                            {
                                dataIndex: 'timeStamp',
                                title: '时间',
                                defaultSortOrder: 'descend',
                                sorter: (a: any, b: any) => a.timeStamp - b.timeStamp,
                            },
                        ]}
                    />
                </div>
            )}
        </div>
    )
}

export default LogAlarm
