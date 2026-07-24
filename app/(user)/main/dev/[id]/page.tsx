'use client'

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/store/userStore";
import { Empty, Dropdown, Tabs, Spin, Tooltip } from "antd";
import { Button } from '@/components/common/Button'
import { CopyOutlined, DownOutlined } from '@ant-design/icons'
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { UserScheduledOpTab } from "@/components/terminal/UserScheduledOpTab";
import { useNav } from "@/lib/hooks/useNav";
import { LiveControls } from "@/components/common/LiveControls";
import { DeviceActions } from "@/components/common/DeviceActions";
import { StatusTag } from '@/components/common/StatusTag'

/**
 * /main/dev/[id] 设备详情页 v4 (2026-07-24 redesign · Option A)
 *
 * 旧版 (v3 hybrid):
 *   - 紫渐变 hero 卡片 + 4 张 summary 卡 (设备ID/挂载设备名/协议/网关状态) ← 跟 hero 信息重复
 *   - 12-col grid: LiveControls 8 + DeviceActions 4
 *   - Tabs (设备数据 / 定时操作)
 *
 * 新版 (精简头部 + 4+8 分栏):
 *   - 单层轻量 device header: mountDev 名 + meta inline (DevMac · 协议 · PID) + status badge + 切换设备
 *   - 去掉 4 张 summary 卡 (信息已在 header 体现)
 *   - 保留 12-col grid: LiveControls 8 + DeviceActions 4
 *   - Tabs 不变
 *
 * 视觉规则: header 用 bento-card + ink-100 边框, 不再走 aurora 渐变.
 */
function DevInner() {
    const nav = useNav()
    const params = useParams()
    const searchParams = useSearchParams()
    const id = params.id as string

    const terminals = useUserStore(s => s.terminals)
    const user = useUserStore(s => s.user)

    const [terminal, setTerminal] = useState<Uart.Terminal>()
    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>()

    const [activeKey, setActiveKey] = useState<string>(
        () => searchParams.get('tab') || 'data'
    )

    useEffect(() => {
        const ter = terminals.find(el => RegExp("^" + el.DevMac).test(id || ''))
        if (ter) {
            setTerminal(ter)
            setMountDev(ter.mountDevs.find(el => ter.DevMac + el.pid === id))
        }
    }, [id, terminals])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab) setActiveKey(tab)
    }, [searchParams])

    const handleTabChange = (key: string) => {
        setActiveKey(key)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', key)
        window.history.pushState({}, '', url.toString())
    }

    const copyMac = () => {
        if (!terminal?.DevMac) return
        navigator.clipboard?.writeText(terminal.DevMac)
        // 静默反馈, 不弹 message
    }

    if (!terminal || !mountDev) return <Empty />

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            {/* 精简 device header — 1 行布局: 名 + meta + 状态 + 切换设备 */}
            <div className="bento-card v3-device-header" style={{ marginBottom: 20, padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                        <h2 style={{
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: 'var(--ink-900)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>{mountDev.mountDev}</h2>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--ink-500)',
                            marginTop: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}>
                            <Tooltip title="点击复制 DevMac">
                                <code
                                    onClick={copyMac}
                                    className="v3-device-header-mac"
                                >
                                    {terminal.DevMac}
                                </code>
                            </Tooltip>
                            <span style={{ color: 'var(--ink-300)' }}>·</span>
                            <span>协议 <b style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{mountDev.protocol || '—'}</b></span>
                            <span style={{ color: 'var(--ink-300)' }}>·</span>
                            <span>PID <b style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{mountDev.pid}</b></span>
                            {Array.isArray(terminal.mountDevs) && terminal.mountDevs.length > 1 && (
                                <>
                                    <span style={{ color: 'var(--ink-300)' }}>·</span>
                                    <span style={{ color: 'var(--ink-500)' }}>挂载 {terminal.mountDevs.length} 个</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <StatusTag
                            variant={terminal.online ? 'online' : 'offline'}
                            text={terminal.online ? '实时连接' : '离线'}
                            pulse={!!terminal.online}
                        />
                        {Array.isArray(terminal.mountDevs) && terminal.mountDevs.length > 1 && (
                            <Dropdown menu={{
                                items: terminal.mountDevs.map(({ mountDev: d, pid }) => ({
                                    key: String(pid),
                                    label: (
                                        <Button
                                            variant="link"
                                            onClick={() => nav('/main/dev/' + encodeURIComponent(terminal.DevMac) + '/' + pid)}
                                        >
                                            {d}
                                        </Button>
                                    ),
                                })),
                            }}>
                                <Button>
                                    切换设备 <DownOutlined />
                                </Button>
                            </Dropdown>
                        )}
                    </div>
                </div>
            </div>

            {/* 12-col grid: LiveControls 8 + DeviceActions 4 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
                <div style={{ gridColumn: 'span 8' }}>
                    <LiveControls variant="device" mac={terminal.DevMac} pid={mountDev.pid} title="实时数据" />
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                    <DeviceActions terminal={terminal} title="设备操作" />
                </div>
            </div>

            <Tabs
                activeKey={activeKey}
                onChange={handleTabChange}
                items={[
                    {
                        key: 'data',
                        label: '设备数据',
                        children: (
                            <section style={{ padding: 16 }}>
                                <TerminalDevPage mac={terminal.DevMac} pid={mountDev.pid} {...(user?.user ? { user: user.user } : {})} />
                            </section>
                        ),
                    },
                    {
                        key: 'scheduled-op',
                        label: '定时操作',
                        children: (
                            <section style={{ padding: 16 }}>
                                <UserScheduledOpTab mac={terminal.DevMac} pid={mountDev.pid} />
                            </section>
                        ),
                    },
                ]}
            />
        </div>
    )
}

export default function Dev() {
    return (
        <Suspense fallback={<Spin />}>
            <DevInner />
        </Suspense>
    )
}
