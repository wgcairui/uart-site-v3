'use client'
import { Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { ServerStatusSection } from './_sections/ServerStatusSection'
import { UserOverviewSection } from './_sections/UserOverviewSection'
import { TerminalOverviewSection } from './_sections/TerminalOverviewSection'
import { AlarmOverviewSection } from './_sections/AlarmOverviewSection'
import { ProtocolOverviewSection } from './_sections/ProtocolOverviewSection'
import { DataOverviewSection } from './_sections/DataOverviewSection'

/**
 * admin 首页 — 系统仪表盘
 * 5 section 拆到 _sections/，本文件只负责组装
 * 服务端运行状态 30s 刷新一次（通过 refreshTick prop 下发）
 */
export default function AdminDashboardPage() {
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setRefreshTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ padding: '0 8px' }}>
      <ServerStatusSection refreshTick={refreshTick} />
      <UserOverviewSection />
      <TerminalOverviewSection />
      <AlarmOverviewSection />
      <ProtocolOverviewSection />
      <DataOverviewSection />
    </div>
  )
}