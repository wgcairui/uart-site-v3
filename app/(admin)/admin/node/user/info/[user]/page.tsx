'use client'

/**
 * 用户详情页 — v3 hybrid (Page B · 1:1 镜像设备详情模板)
 *
 * 视觉: user hero 紫渐变 + PageSummary 4 KPI + StatCard row 3 KPI (W3 4-variant)
 *       + UserOverview + UserActions + BoundTerminalsStrip + Tabs (items prop)
 *       + MigrateUserResourcesModal
 * 兼容: 复用 PageHeader / PageSummary / StatusTag / BentoCard
 * 用户实体: Uart.UserInfo (字段: user/userId/userGroup/name/mail/tel/status/...)
 *
 * 关键决定:
 * - 镜像 terminal/[mac]/page.tsx (设备详情 v3 模板) 的 4 段式骨架
 * - StatusTag 替代手写 status pill (online / offline)
 * - BentoCard 替代手写 bento-card 容器 + padding
 * - baseTabs / terminalTabs 不用 useMemo (avoid React Compiler 警告)
 * - boundList Array.isArray() 兜底, trial mode 缺数据也漂亮渲染
 * - W7 (2026-07-25): PageSummary 保留 4 基础卡; 第 2 行加 3 张 StatCard (drilldown×2
 *   + navigate×1) 接 admin summary BFF (getUserEngagement + getAlarmTrend), 详见
 *   types/admin-summary.ts + components/admin/StatCard/ (W3 4-variant)
 */

import { Suspense, useEffect, useCallback, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Spin, Tabs } from 'antd'
import {
    AlertOutlined,
    MessageOutlined,
    LoginOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { BentoCard } from '@/components/common/BentoCard'
import { StatCard } from '@/components/admin/StatCard'
import { usePromise } from '@/lib/hooks/usePromise'
import { useDashboardStat } from '@/lib/hooks/useDashboardStat'
import { BindDev, getUser, getUserOnlineStat } from '@/lib/api/fetchRoot'
import { getTerminal } from '@/lib/api/fetch'
import { useTerminalUpdate } from '@/lib/hooks/useTerminalData'
import { TerminalAT } from '@/components/terminal/TerminalAT'
import { TerminalOprate } from '@/components/terminal/TerminalOprate'
import { AdminScheduledOpTab } from '@/components/terminal/AdminScheduledOpTab'
import { TerminalRunLog } from '@/components/terminal/TerminalRunLog'
import { TerminalDevPage } from '@/components/terminal/TerminalDevPage'
import { DevRealTimeLog } from '@/components/data/devRealTimeLog'
import { UserAlarmPage } from '@/components/data/UserAlarmPage'
import { UserLog } from '@/components/log/UserLog'
import { SmsStatsChart } from '@/components/chart/SmsStatsChart'
import { MailStatsChart } from '@/components/chart/MailStatsChart'
import { LoginLogTab } from '@/components/log/LoginLogTab'
import { RequestLogTab } from '@/components/log/RequestLogTab'
import { MigrateUserResourcesModal } from '@/components/admin/MigrateUserResourcesModal'
import { UserOverview } from '@/components/user/UserOverview'
import { UserActions } from '@/components/user/UserActions'
import { BoundTerminalsStrip } from '@/components/user/BoundTerminalsStrip'
import { getUserEngagement, getAlarmTrend } from '@/lib/api/admin-summary/client'
import type {
    AlarmTrendBucket,
    AlarmTrendResp,
    UserEngagementItem,
    UserEngagementResp,
} from '@/types/admin-summary'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 7d 告警 trend 迷你图 — drilldown popover 内容
 * 渲染 SVG 双线 (critical/warning/info stack) + 总量 header
 */
function AlarmTrendSparkline({ data }: { data?: AlarmTrendResp }) {
    const buckets = Array.isArray(data) ? data : []
    if (buckets.length === 0) {
        return <div style={{ width: 320, padding: 24, color: 'var(--ink-500)', fontSize: 12, textAlign: 'center' }}>暂无 7d 告警数据</div>
    }
    const w = 320, h = 120
    const padL = 32, padR = 8, padT = 12, padB = 22
    const chartW = w - padL - padR, chartH = h - padT - padB
    const max = Math.max(1, ...buckets.map((b) => b.total))
    const xStep = chartW / Math.max(1, buckets.length - 1)
    const pts = buckets.map((b, i) => [padL + i * xStep, padT + chartH * (1 - b.total / max)] as const)
    const polyPts = pts.map((p) => p.join(',')).join(' ')
    const totalC = buckets.reduce((s, b) => s + b.critical, 0)
    const totalW = buckets.reduce((s, b) => s + b.warning, 0)
    const totalI = buckets.reduce((s, b) => s + b.info, 0)
    return (
        <div style={{ width: w, padding: 8 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-500)' }}>7d 总计</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>critical {totalC}</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>warning {totalW}</span>
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>info {totalI}</span>
            </div>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
                {[0, 0.5, 1].map((p, i) => (
                    <line key={i} x1={padL} x2={w - padR} y1={padT + chartH * p} y2={padT + chartH * p} stroke="var(--ink-100)" strokeWidth="1" strokeDasharray={p === 0 ? '0' : '2 3'} />
                ))}
                <polyline points={polyPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="#8b5cf6" />
                ))}
                {buckets.length > 0 && (
                    <>
                        <text x={padL} y={h - 6} fontSize="9" fill="var(--ink-500)" fontFamily="var(--font-mono)">
                            {dayjs(buckets[0]!.bucket).format('MM-DD')}
                        </text>
                        <text x={w - padR} y={h - 6} fontSize="9" fill="var(--ink-500)" textAnchor="end" fontFamily="var(--font-mono)">
                            {dayjs(buckets[buckets.length - 1]!.bucket).format('MM-DD')}
                        </text>
                    </>
                )}
            </svg>
        </div>
    )
}

/**
 * 7d 短信分布 — drilldown popover 内容
 * 当前用户 smsCount7d vs 排行里其他用户分布
 */
function SmsDistribution({ value, peers }: { value: number; peers: UserEngagementItem[] }) {
    const smsValues = peers.map((p) => p.smsCount7d).filter((n) => n > 0).sort((a, b) => b - a)
    const rank = smsValues.findIndex((n) => n <= value)
    const percentile = smsValues.length > 0 ? Math.round(((smsValues.length - rank) / smsValues.length) * 100) : 0
    const max = smsValues[0] || 1
    const top5 = peers.slice(0, 5)
    return (
        <div style={{ width: 320, padding: 8 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-500)' }}>7d 短信</span>
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>{value} 条</span>
                {smsValues.length > 0 && (
                    <span style={{ color: 'var(--ink-500)' }}>Top {percentile}%</span>
                )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>前 5 名排行</div>
            {top5.map((p, i) => (
                <div key={p.user + i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 2 }}>
                    <span style={{ width: 18, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>#{i + 1}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.user}</span>
                    <div style={{ width: 80, height: 6, background: 'var(--ink-100)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(p.smsCount7d / max) * 100}%`, height: '100%', background: '#06b6d4' }} />
                    </div>
                    <span style={{ width: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-700)' }}>{p.smsCount7d}</span>
                </div>
            ))}
            {top5.length === 0 && (
                <div style={{ color: 'var(--ink-500)', fontSize: 12, textAlign: 'center', padding: 12 }}>暂无 7d 短信数据</div>
            )}
        </div>
    )
}

interface TerminalInfosProps {
    mac: string
}

const TerminalInfos: React.FC<TerminalInfosProps> = ({ mac }) => {
    const { data, loading, setData } = usePromise(async () => {
        const { data } = await getTerminal(mac)
        return data
    })

    const ter = useTerminalUpdate([mac])

    useEffect(() => {
        if (ter.data) setData(ter.data)
    }, [ter.data, setData])

    return loading ? (
        <Spin />
    ) : !data ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--ink-500)' }}>找不到该终端的数据</div>
    ) : (
        <Tabs items={[
            { key: 'info', label: '设备信息', children: <div style={{ padding: 16, color: 'var(--ink-700)' }}>设备 {data.name || data.DevMac} · 详细管理见上方「绑定设备」区</div> },
            { key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
            { key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
            { key: 'scheduled-op', label: '定时操作', children: <AdminScheduledOpTab mac={data.DevMac} /> },
            { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
            { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac} /> },
            ...(Array.isArray(data.mountDevs)
                ? data.mountDevs.map((dev) => ({
                    key: dev.mountDev + dev.pid,
                    label: dev.mountDev + dev.pid,
                    children: <TerminalDevPage mac={data.DevMac} pid={dev.pid} />,
                }))
                : []),
        ]} />
    )
}

function UserInfoInner() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const user = params.user as string

    const [activeKey, setActiveKey] = useState(searchParams.get('tab') || 'alarm')
    const [migrateOpen, setMigrateOpen] = useState(false)

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab) setActiveKey(tab)
    }, [searchParams])

    const handleTabChange = useCallback((key: string) => {
        setActiveKey(key)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', key)
        window.history.pushState({}, '', url.toString())
    }, [])

    // 监听 UserActions 派发的资源迁移事件
    useEffect(() => {
        const handler = () => setMigrateOpen(true)
        window.addEventListener('user-page:open-migrate', handler as EventListener)
        return () => window.removeEventListener('user-page:open-migrate', handler as EventListener)
    }, [])

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getUser(user)
        return data
    }, undefined, [user])

    const bindUts = usePromise(async () => {
        const { data } = await BindDev(user)
        return (data?.UTs || []) as Uart.Terminal[]
    }, [] as Uart.Terminal[], [user])

    // 用户在线状态 (existing API: getUserOnlineStat 返 boolean)
    const { data: userOnline } = usePromise(async () => {
        const { data } = await getUserOnlineStat(user)
        return !!data
    }, false, [user])

    // W7: admin summary BFF — 拉 engagement 排行找当前用户位置
    // useDashboardStat 期望 { data: { code, data, message? } } 包装, BFF wrapper
    // 直接返 universalResult<T>, 套一层 { data: r } 让 hook 能正确解套 (result.data.code)
    const fetchEngagement = useCallback(async () => {
        const r = await getUserEngagement(50)
        return { data: r as unknown as { code: number; data: UserEngagementResp; message?: string } }
    }, [])
    const { data: engagement } = useDashboardStat<UserEngagementResp>(fetchEngagement, [], [])

    // W7: 7d 告警 trend (drilldown popover 用) — 同上 wrap
    const fetchAlarmTrend = useCallback(async () => {
        const r = await getAlarmTrend(168, 'hour')
        return { data: r as unknown as { code: number; data: AlarmTrendResp; message?: string } }
    }, [])
    const { data: alarmTrend } = useDashboardStat<AlarmTrendResp>(fetchAlarmTrend, [], [])

    // 不用 useCallback, usePromise 每次 render 都返回新的 fecth 引用, 包了也无效
    const refreshAll = () => {
        bindUts.fecth()
        fecth()
    }

    // 防御: 数组兜底, trial mode / 鉴权失败时仍能渲染
    const boundList = Array.isArray(bindUts.data) ? bindUts.data : []
    const onlineCount = boundList.filter((t) => t.online).length
    const isActive = data?.status !== false
    const userGroup = data?.userGroup || 'user'

    // 找到当前用户在 engagement 排行里的位置 (top 50 内, trial mode 兜底空数组)
    // useMemo 稳定引用, 避免下游 useMemo dep 触发 lint warning
    const engagementList = useMemo<UserEngagementItem[]>(
        () => (Array.isArray(engagement) ? engagement : []),
        [engagement]
    )
    const me = useMemo(
        () => engagementList.find((e) => e.user === user) || null,
        [engagementList, user]
    )
    const userAlarmCount7d = me?.alarmCount7d ?? 0
    const userSmsCount7d = me?.smsCount7d ?? 0
    const lastLogin = me?.lastLogin

    // 7d 告警 trend buckets (Array.isArray 兜底)
    const trendBuckets = useMemo<AlarmTrendBucket[]>(
        () => (Array.isArray(alarmTrend) ? alarmTrend : []),
        [alarmTrend]
    )

    // tabs (不用 useMemo, 避免 React Compiler preserve-manual-memoization 警告)
    const baseTabs = data ? [
        { key: 'alarm', label: '告警设置', children: <UserAlarmPage user={data.user} /> },
        { key: 'log', label: '操作日志', children: <UserLog user={data.user} /> },
        { key: 'sms-stats', label: '短信消耗', children: <SmsStatsChart user={data.user} /> },
        { key: 'mail-stats', label: '邮件消耗', children: <MailStatsChart user={data.user} /> },
        { key: 'login-log', label: '登录日志', children: <LoginLogTab user={data.user} /> },
        { key: 'request-log', label: '请求日志', children: <RequestLogTab user={data.user} /> },
    ] : []

    const terminalTabs = boundList.map((ter) => ({
        key: ter.DevMac,
        label: ter.name || ter.DevMac,
        children: <TerminalInfos mac={ter.DevMac} />,
    }))

    const tabs = [...baseTabs, ...terminalTabs]

    if (loading) {
        return (
            <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: 'var(--ink-500)' }}>
                找不到该用户的数据
            </div>
        )
    }

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            {/* ─── 1. PageHeader (标题 + 返回 + breadcrumb) ─── */}
            <PageHeader
                title="用户详情"
                back
                breadcrumb={[
                    { title: '用户管理', href: '/admin/node/user' },
                    { title: data.name || data.user },
                ]}
            />

            {/* ─── 2. user hero 紫渐变 (bento-card-hero 已带 aurora gradient) ─── */}
            <div
                className="bento-card bento-card-hero v3-user-hero"
                style={{ marginBottom: 20, padding: '20px 28px' }}
            >
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div
                        style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: data.avanter
                                ? `url(${data.avanter}) center/cover`
                                : 'linear-gradient(135deg, var(--accent-400) 0%, #f472b6 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 22, fontWeight: 600,
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            flexShrink: 0,
                        }}
                    >
                        {!data.avanter && (data.name || data.user || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3 }}>
                            {data.name || data.user}
                        </h2>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                            {data.user} · {data.userGroup || 'user'} · {data.mail || '-'} · {data.tel || '-'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <StatusTag
                            variant={isActive ? 'online' : 'offline'}
                            text={isActive ? '正常' : '停用'}
                            pulse={isActive}
                            size="md"
                        />
                    </div>
                </div>
            </div>

            {/* ─── 3. PageSummary 4 KPI (账号 / 用户组 / 绑定设备 / 在线设备) ─── */}
            <PageSummary
                items={[
                    { label: '账号', value: data.user, variant: 'primary' },
                    { label: '用户组', value: userGroup, variant: 'info' },
                    { label: '绑定设备', value: boundList.length, variant: 'success' },
                    {
                        label: '在线设备',
                        value: onlineCount,
                        variant: onlineCount > 0 ? 'success' : 'warning',
                        extra: userOnline ? '用户在线' : undefined,
                    },
                ]}
            />

            {/* ─── 3b. W7 · StatCard row 3 KPI (drilldown×2 + navigate×1) ───
                 接 admin summary BFF: getUserEngagement (me 行) + getAlarmTrend
                 - 7d 告警: drilldown popover 显示 7d trend 迷你图
                 - 7d 短信: drilldown popover 显示排行分布
                 - 最近登录: navigate 跳 ?tab=login-log (LoginLogTab key) */}
            <div className="page-summary-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
                marginBottom: 32,
            }}>
                <StatCard
                    kind="drilldown"
                    label="7d 告警"
                    value={userAlarmCount7d}
                    variant={userAlarmCount7d > 10 ? 'danger' : userAlarmCount7d > 0 ? 'warning' : 'success'}
                    icon={<AlertOutlined />}
                    data={trendBuckets}
                    trigger="hover"
                    popoverContent={({ data }) => (
                        <AlarmTrendSparkline data={data as AlarmTrendResp} />
                    )}
                />
                <StatCard
                    kind="drilldown"
                    label="7d 短信"
                    value={userSmsCount7d}
                    variant="info"
                    icon={<MessageOutlined />}
                    data={engagementList}
                    trigger="hover"
                    popoverContent={() => (
                        <SmsDistribution value={userSmsCount7d} peers={engagementList} />
                    )}
                />
                <StatCard
                    kind="navigate"
                    label="最近登录"
                    value={lastLogin ? dayjs(lastLogin).fromNow() : '从未登录'}
                    variant={lastLogin ? 'success' : 'info'}
                    icon={<LoginOutlined />}
                    href={`/admin/node/user/info/${encodeURIComponent(user)}?tab=login-log`}
                />
            </div>

            {/* ─── 4. UserOverview + UserActions (8+4 响应式 grid) ─── */}
            <div className="user-detail-grid">
                <div style={{ minHeight: 360 }}>
                    <UserOverview user={data} onChange={fecth} />
                </div>
                <div style={{ minHeight: 360 }}>
                    <UserActions user={data} onChange={fecth} />
                </div>
            </div>

            {/* ─── 5. BoundTerminalsStrip (绑定设备完整管理) ─── */}
            <div style={{ marginBottom: 20 }}>
                <BoundTerminalsStrip user={data.user} onChange={refreshAll} />
            </div>

            {/* ─── 6. Tabs (base 6 + terminal N) ─── */}
            <BentoCard padding="md" hoverable={false} style={{ marginBottom: 20 }}>
                <Tabs
                    activeKey={activeKey}
                    onChange={handleTabChange}
                    items={tabs}
                />
            </BentoCard>

            {/* ─── 7. MigrateUserResourcesModal (UserActions 派 event 触发) ─── */}
            <MigrateUserResourcesModal
                visible={migrateOpen}
                fromUser={data.user}
                onCancel={() => setMigrateOpen(false)}
                onSuccess={() => {
                    fecth()
                }}
            />
        </div>
    )
}

export default function UserInfo() {
    return (
        <Suspense fallback={<Spin />}>
            <UserInfoInner />
        </Suspense>
    )
}
