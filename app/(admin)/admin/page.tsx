'use client'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { ServerStatusSection } from './_sections/ServerStatusSection'
import { UserOverviewSection } from './_sections/UserOverviewSection'
import { TerminalOverviewSection } from './_sections/TerminalOverviewSection'
import { AlarmOverviewSection } from './_sections/AlarmOverviewSection'
import { ProtocolOverviewSection } from './_sections/ProtocolOverviewSection'
import { DataOverviewSection } from './_sections/DataOverviewSection'

/**
 * admin 首页 — 系统仪表盘
 * 6 section 拆到 _sections/，本文件只负责组装
 * 服务端运行状态 30s 刷新一次（通过 refreshTick prop 下发）
 */
export default function AdminDashboardPage() {
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setRefreshTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      <PageHeader
        title="系统仪表盘"
        subtitle="实时查看设备、用户、告警、协议运行状况"
      />
      <ServerStatusSection refreshTick={refreshTick} />
      <UserOverviewSection />
      <TerminalOverviewSection />
      <AlarmOverviewSection />
      <ProtocolOverviewSection />
      <DataOverviewSection />
    </div>
  )
}