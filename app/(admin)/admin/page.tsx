'use client'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { ServerStatusSection } from './_sections/ServerStatusSection'
import { UserOverviewSection } from './_sections/UserOverviewSection'
import { TerminalOverviewSection } from './_sections/TerminalOverviewSection'
import { AlarmOverviewSection } from './_sections/AlarmOverviewSection'
import { ProtocolOverviewSection } from './_sections/ProtocolOverviewSection'
import { DataOverviewSection } from './_sections/DataOverviewSection'
import { runingState } from '@/lib/api/fetchRoot'

/**
 * admin 首页 — 系统仪表盘 (v2 Bento + Aurora)
 *
 * 6 section 拆到 _sections/，本文件只负责组装 + 顶部 4 个 KPI
 * 服务端运行状态 30s 刷新一次（通过 refreshTick prop 下发）
 *
 * 视觉: bg-bento-canvas (极光晕染) + BentoCard 包装
 */
export default function AdminDashboardPage() {
  const [refreshTick, setRefreshTick] = useState(0)
  const [serverInfo, setServerInfo] = useState<any>(null)

  useEffect(() => {
    const t = setInterval(() => setRefreshTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    const fetch = async () => {
      try {
        const res = await runingState()
        if (alive) setServerInfo(res?.data)
      } catch {}
    }
    fetch()
    return () => { alive = false }
  }, [refreshTick])

  const kpi = useMemo(() => {
    if (!serverInfo) return null
    const nodes = serverInfo.Node?.all ?? 0
    return { nodes }
  }, [serverInfo])

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      <PageHeader
        title="系统仪表盘"
        subtitle="实时查看设备、用户、告警、协议运行状况"
      />
      <div style={{ marginBottom: 24, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <PageSummary
          items={[
            { label: 'DTU 节点', value: kpi?.nodes ?? '-', variant: 'primary' },
            { label: '在线节点', value: serverInfo?.Node?.online ?? '-', variant: 'success' },
            { label: '版本', value: serverInfo?.SysInfo?.version ?? '-', variant: 'info' },
            { label: 'CPU 使用', value: `${Number(serverInfo?.SysInfo?.usecpu ?? 0).toFixed(1)}%`, variant: serverInfo?.SysInfo?.usecpu > 70 ? 'danger' : 'success' },
          ]}
        />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <ServerStatusSection refreshTick={refreshTick} />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <UserOverviewSection />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <TerminalOverviewSection />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <AlarmOverviewSection />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <ProtocolOverviewSection />
      </div>
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <DataOverviewSection />
      </div>
    </div>
  )
}
