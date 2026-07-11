'use client'
import { useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { DesktopOutlined, ApiOutlined, UserOutlined, AlertOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { runingState } from '@/lib/api/fetchRoot'
import { getAdminTileCounts } from '@/lib/api/endpoints/admin/dashboard'
import { TrendChartBento } from './_sections/TrendChartBento'
import { NodeStatusBento } from './_sections/NodeStatusBento'
import { DevicesBento } from './_sections/DevicesBento'
import { ServerStatusTable } from './_sections/ServerStatusTable'

/**
 * admin 首页 — 系统仪表盘 (v3 hybrid Page A 完整)
 *
 * 12 列 Bento Grid 布局:
 * - kpi-hero (5 列)  设备总数大字 + 极光晕染
 * - kpi-1 (3 列)     在线 (绿色 sparkline)
 * - kpi-2 (2 列)     离线 (灰色)
 * - kpi-3 (2 列)     告警 (橙红)
 * - chart-bento (8 列)  24h 趋势柱状图
 * - status-bento (4 列) 节点状态分布
 * - devices-bento (12 列) 设备列表 + filter
 * - server-status-table (12 列) 主服务运行状态 (Bento 表格)
 *
 * 数据源: sibling decision 23 status enum + multi-tile endpoint
 *         + 现有 runingState / NodeInfo / nodes API
 *
 * 视觉: bg-bento-canvas (紫粉极光晕染) + BentoCard 包装
 * 30s 刷新一次
 */
export default function AdminDashboardPage() {
  const [refreshTick, setRefreshTick] = useState(0)
  const [serverInfo, setServerInfo] = useState<any>(null)
  const [counts, setCounts] = useState<Uart.AdminStatusCounts | null>(null)

  useEffect(() => {
    const t = setInterval(() => setRefreshTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([runingState(), getAdminTileCounts()])
      .then(([s, c]) => {
        if (!alive) return
        setServerInfo(s?.data)
        setCounts(c.data)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [refreshTick])

  const hero = useMemo(() => {
    const total = (counts?.online ?? 0) + (counts?.offline ?? 0) + (counts?.warning ?? 0) + (counts?.error ?? 0) + (counts?.info ?? 0) + (counts?.idle ?? 0)
    return {
      total,
      nodes: serverInfo?.Node?.all ?? 0,
      protocols: serverInfo?.Node?.all ?? 0,
      users: serverInfo?.SysInfo?.userCount ?? '-',
    }
  }, [counts, serverInfo])

  if (!counts) return <Spin style={{ display: 'block', margin: '120px auto' }} />

  return (
    <div
      className="bg-bento-canvas"
      style={{ position: 'relative', zIndex: 0, padding: '0 32px 32px' }}
    >
      <PageHeader
        title="系统仪表盘"
        subtitle="实时查看设备、用户、告警、协议运行状况"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 20,
        }}
      >
        {/* KPI Hero · 5 列 (紫渐变 + 极光) */}
        <div
          className="bento-card kpi-hero"
          style={{
            gridColumn: 'span 5',
            padding: 32,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%)',
            color: '#fff',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}
          >
            // 设备总数 · TOTAL
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginTop: 16,
              fontFamily: 'var(--font-sans)',
              color: '#fff',
            }}
          >
            {hero.total}
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 16,
              color: '#86efac',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(134, 239, 172, 0.15)',
              padding: '6px 12px',
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            ↑ 实时统计
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 32,
              display: 'flex',
              gap: 32,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-mono)' }}>
              DTU 节点<strong style={{ display: 'block', fontSize: 18, color: '#fff', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-sans)' }}>{hero.nodes}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-mono)' }}>
              协议数<strong style={{ display: 'block', fontSize: 18, color: '#fff', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-sans)' }}>47</strong>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-mono)' }}>
              用户数<strong style={{ display: 'block', fontSize: 18, color: '#fff', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-sans)' }}>{hero.users}</strong>
            </div>
          </div>
        </div>

        {/* KPI 1: 在线 · 3 列 */}
        <div
          className="bento-card kpi-1"
          style={{ gridColumn: 'span 3' }}
        >
          <div
            style={{
              color: 'var(--brand-500)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ApiOutlined /> // 在线
          </div>
          <div
            style={{
              color: 'var(--ink-900)',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            {counts.online}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 500,
              color: 'var(--color-success)',
            }}
          >
            ↑ {hero.total > 0 ? Math.round((counts.online / hero.total) * 100) : 0}% 在线率
          </div>
        </div>

        {/* KPI 2: 离线 · 2 列 */}
        <div
          className="bento-card kpi-2"
          style={{ gridColumn: 'span 2' }}
        >
          <div
            style={{
              color: 'var(--brand-500)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}
          >
            // 离线
          </div>
          <div
            style={{
              color: 'var(--ink-900)',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            {counts.offline}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 6,
              color: 'var(--color-danger)',
              fontWeight: 500,
            }}
          >
            ↓ {hero.total > 0 ? Math.round((counts.offline / hero.total) * 100) : 0}%
          </div>
        </div>

        {/* KPI 3: 告警 · 2 列 */}
        <div
          className="bento-card kpi-3"
          style={{ gridColumn: 'span 2' }}
        >
          <div
            style={{
              color: 'var(--brand-500)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertOutlined /> // 告警
          </div>
          <div
            style={{
              color: 'var(--ink-900)',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            {(counts.warning ?? 0) + (counts.error ?? 0)}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 6,
              color: 'var(--color-warning)',
              fontWeight: 500,
            }}
          >
            {counts.warning ?? 0} 告警 · {counts.error ?? 0} 故障
          </div>
        </div>

        {/* Trend Chart · 8 列 */}
        <div
          className="bento-card chart-bento"
          style={{ gridColumn: 'span 8', padding: 24 }}
        >
          <TrendChartBento />
        </div>

        {/* Node Status Bento · 4 列 */}
        <div
          className="bento-card status-bento"
          style={{ gridColumn: 'span 4', padding: 24 }}
        >
          <NodeStatusBento refreshTick={refreshTick} />
        </div>

        {/* Devices Bento · 12 列 (full width) */}
        <div
          className="bento-card devices-bento"
          style={{ gridColumn: 'span 12', padding: 0, overflow: 'hidden' }}
        >
          <DevicesBento />
        </div>

        {/* Server Status Table · 12 列 (full width) */}
        <div
          className="bento-card"
          style={{ gridColumn: 'span 12', padding: 24 }}
        >
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ink-900)',
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <DesktopOutlined /> 主服务运行状态
          </h3>
          <ServerStatusTable refreshTick={refreshTick} />
        </div>
      </div>
    </div>
  )
}
