'use client'

/**
 * 用户详情页 — v3 hybrid (Page B · 1:1 镜像设备详情模板)
 *
 * 视觉: user hero 紫渐变 + PageSummary 4 KPI + UserOverview + UserActions
 *       + BoundTerminalsStrip + Tabs (items prop) + MigrateUserResourcesModal
 * 兼容: 复用 PageHeader / PageSummary / StatusTag / BentoCard
 * 用户实体: Uart.UserInfo (字段: user/userId/userGroup/name/mail/tel/status/...)
 *
 * 关键决定:
 * - 镜像 terminal/[mac]/page.tsx (设备详情 v3 模板) 的 4 段式骨架
 * - StatusTag 替代手写 status pill (online / offline)
 * - BentoCard 替代手写 bento-card 容器 + padding
 * - baseTabs / terminalTabs 不用 useMemo (avoid React Compiler 警告)
 * - boundList Array.isArray() 兜底, trial mode 缺数据也漂亮渲染
 */

import { Suspense, useEffect, useCallback, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Spin, Tabs } from 'antd'

import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { BentoCard } from '@/components/common/BentoCard'
import { usePromise } from '@/lib/hooks/usePromise'
import { BindDev, getUser } from '@/lib/api/fetchRoot'
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
                    },
                ]}
            />

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
