'use client'

/**
 * P2-2 · 协议常量配置 (v3 化)
 *
 * 业务: 单一挂载设备的协议配置页 (mac+pid 路由参数决定目标)
 *       - 显示参数 / 阈值配置 / 状态配置 三 tab
 *
 * v3 视觉:
 * - PageHeader (h1 + 面包屑)
 * - PageSummary 4 卡 (协议/设备/类型/在线状态) — 当 mountDev 加载后显示
 * - 主体 Tabs 容器走 bento-card (复用 antd Tabs, 容器换皮肤)
 * - 无 mac+pid 时 → 居中 EmptyState (bento-card 圆角)
 * - 移动端 1 列堆叠
 *
 * Stub 策略: 当 URL 缺 mac+pid 时, 不硬造/不跳到添加页,
 *            显示 EmptyState + "去添加设备" 按钮 → nav('/main/addterminal')
 *
 * 注: server 端没有"全量常量列表"API (admin 端有 /api/v2/admin/protocols/dev-constant,
 *     但 user 端无对应接口), 所以这页只展示"单设备协议配置",
 *     不做"全量常量表"。PageSummary 4 卡用 mountDev 元数据 + 派生字段。
 */

import { Empty, Spin, Tabs } from 'antd'
import { SettingOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { FC, Suspense, useEffect } from 'react'
import { useUserStore } from '@/lib/store/userStore'
import { useSearchParams } from 'next/navigation'
import { getTerminalPidProtocol } from '@/lib/api/fetch'
import { ProtocolAlarmStatUser } from '@/components/protocol/ProtocolAlarmStatUser'
import { ProtocolShowTagUser } from '@/components/protocol/ProtocolShowTagUser'
import { ProtocolThresholdUser } from '@/components/protocol/ProtocolThresholdUser'
import { usePromise } from '@/lib/hooks/usePromise'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { EmptyState } from '@/components/common/EmptyState'

const UserConstant: FC = () => {
    const user = useUserStore(s => s.user)
    const param = useSearchParams()

    // 移动端 detection
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        // 仅声明一次, 不需要 setState
        void mq
    }, [])

    const { data: mountDev, loading } = usePromise(async () => {
        const [mac, pid] = [param.get('mac'), param.get('pid')]
        if (!mac || !pid) throw new Error('param Error')
        const { data } = await getTerminalPidProtocol(mac, pid)
        return data
    })

    // 路由参数缺失 → 居中 EmptyState
    if (!param.get('mac') || !param.get('pid')) {
        return (
            <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
                <PageHeader
                    title="协议常量"
                    subtitle="为挂载设备配置显示参数、阈值与告警状态"
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: '协议常量' },
                    ]}
                />
                <div className="bento-card">
                    <EmptyState
                        icon={<SettingOutlined style={{ fontSize: 48, color: 'var(--ink-400)' }} />}
                        description="请从设备详情页进入此页"
                        actionLabel="去添加设备"
                        onAction={() => {
                            window.location.href = '/main/addterminal'
                        }}
                        secondaryLabel="返回设备列表"
                        onSecondary={() => {
                            window.location.href = '/main'
                        }}
                        minHeight={420}
                    />
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
                <PageHeader
                    title="协议常量"
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: '协议常量' },
                    ]}
                />
                <div
                    className="bento-card"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 320,
                    }}
                >
                    <Spin tip="正在加载设备配置…" />
                </div>
            </div>
        )
    }

    if (!mountDev) {
        return (
            <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
                <PageHeader
                    title="协议常量"
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: '协议常量' },
                    ]}
                />
                <div className="bento-card">
                    <Empty
                        description={
                            <span style={{ color: 'var(--ink-500)' }}>
                                设备不存在或已被删除
                            </span>
                        }
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title={mountDev.protocol || '协议常量'}
                subtitle={`PID: ${mountDev.pid} · ${mountDev.mountDev || mountDev.Type}`}
                breadcrumb={[
                    { title: '首页', href: '/main' },
                    { title: '协议常量' },
                ]}
                extra={
                    <a
                        href={`/main?mac=${encodeURIComponent(mountDev.mountDev || '')}`}
                        style={{
                            fontSize: 13,
                            color: 'var(--color-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                        }}
                    >
                        返回设备 <ArrowRightOutlined />
                    </a>
                }
            />

            {/* PageSummary 4 卡 (协议 / 设备 / PID / 在线状态) */}
            <PageSummary
                items={[
                    {
                        label: '协议',
                        value: mountDev.protocol || '—',
                        variant: 'primary',
                    },
                    {
                        label: '挂载设备',
                        value: mountDev.mountDev || mountDev.Type || '—',
                        variant: 'info',
                    },
                    {
                        label: 'PID',
                        value: mountDev.pid,
                        variant: 'purple',
                    },
                    {
                        label: '状态',
                        value: (
                            <StatusTag
                                variant={mountDev.online ? 'online' : 'offline'}
                                size="sm"
                            />
                        ),
                        variant: mountDev.online ? 'success' : 'warning',
                    },
                ]}
            />

            {/* 配置 Tabs (bento-card 容器) */}
            <div className="bento-card" style={{ padding: 0 }}>
                <Tabs
                    style={{ padding: '0 24px' }}
                    items={[
                        {
                            key: 'show',
                            label: '显示参数',
                            children: (
                                <div style={{ padding: '0 0 24px' }}>
                                    <ProtocolShowTagUser
                                        protocolName={mountDev.protocol}
                                        user={user.user!}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'Threld',
                            label: '阈值配置',
                            children: (
                                <div style={{ padding: '0 0 24px' }}>
                                    <ProtocolThresholdUser
                                        protocolName={mountDev.protocol}
                                        user={user.user!}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'stat',
                            label: '状态配置',
                            children: (
                                <div style={{ padding: '0 0 24px' }}>
                                    <ProtocolAlarmStatUser
                                        protocolName={mountDev.protocol}
                                        user={user.user!}
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<Spin />}>
            <UserConstant />
        </Suspense>
    )
}
