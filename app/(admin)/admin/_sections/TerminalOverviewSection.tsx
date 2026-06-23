'use client'
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Col, Row, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { KVList } from '@/components/common/KVList'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatCard } from '@/components/common/StatCard'
import { getTerminalDetailedStats } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

/**
 * 终端概览 section
 * - 6 个 KPI 卡片
 * - 挂载设备 / PID 型号分布
 */
export function TerminalOverviewSection() {
  const router = useRouter()
  const { data, loading } = usePromise(async () => {
    const { data } = await getTerminalDetailedStats()
    return data
  }, null)

  if (loading || !data) return <Spin />

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<DesktopOutlined />} title="终端概览" />
      <Row gutter={[16, 16]}>
        <Col span={12} md={4}>
          <StatCard
            title="总终端数"
            value={data.total}
            icon={<DesktopOutlined />}
            variant="primary"
            onClick={() => router.push('/admin/node/terminal')}
          />
        </Col>
        <Col span={12} md={4}>
          <StatCard title="在线终端" value={data.online} icon={<CheckCircleOutlined />} variant="success" />
        </Col>
        <Col span={12} md={4}>
          <StatCard title="离线终端" value={data.offline} icon={<ClockCircleOutlined />} variant="danger" />
        </Col>
        <Col span={12} md={4}>
          <StatCard
            title="在线率"
            value={data.onlineRate}
            suffix="%"
            variant={data.onlineRate >= 80 ? 'success' : 'warning'}
          />
        </Col>
        <Col span={12} md={4}>
          <StatCard title="超时设备数" value={data.timeoutMountDev} icon={<WarningOutlined />} variant="danger" />
        </Col>
        <Col span={12} md={4}>
          <StatCard title="共享终端" value={data.shared} icon={<ApiOutlined />} variant="purple" />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24} md={12}>
          <KVList
            title="设备挂载情况"
            items={[
              { label: '总挂载设备数', value: data.totalMountDevs },
              { label: '平均挂载设备/终端', value: data.avgMountDevs },
            ]}
          />
        </Col>
        <Col span={24} md={12}>
          <KVList
            title="PID 型号分布 Top10"
            items={(data.pidDistribution || []).map((item: any) => ({
              label: item.label,
              value: item.value,
            }))}
          />
        </Col>
      </Row>
    </section>
  )
}