'use client'
import { AppstoreOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Col, Row, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { KVList } from '@/components/common/KVList'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatCard } from '@/components/common/StatCard'
import { getUserDetailedStats } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

/**
 * 用户概览 section
 * - 总数/活跃/用户组 4 个 KPI
 * - 注册方式分布 / 用户组分布
 */
export function UserOverviewSection() {
  const router = useRouter()
  const { data, loading } = usePromise(async () => {
    const { data } = await getUserDetailedStats()
    return data
  }, null)

  if (loading || !data) return <Spin />

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<UserOutlined />} title="用户概览" />
      <Row gutter={[16, 16]}>
        <Col span={12} md={6}>
          <StatCard
            title="总用户数"
            value={data.total}
            icon={<TeamOutlined />}
            variant="primary"
            onClick={() => router.push('/admin/node/user')}
          />
        </Col>
        <Col span={12} md={6}>
          <StatCard
            title="7天活跃用户"
            value={data.activeUsers?.last7Days ?? '-'}
            icon={<UserOutlined />}
            variant="success"
          />
        </Col>
        <Col span={12} md={6}>
          <StatCard
            title="30天活跃用户"
            value={data.activeUsers?.last30Days ?? '-'}
            icon={<UserOutlined />}
            variant="info"
          />
        </Col>
        <Col span={12} md={6}>
          <StatCard
            title="用户组数量"
            value={data.userGroup?.length ?? 0}
            icon={<AppstoreOutlined />}
            variant="purple"
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24} md={12}>
          <KVList
            title="注册方式分布"
            items={(data.rgType || []).map((item: any) => ({
              label: item.label,
              value: <span style={{ fontWeight: 600 }}>{item.value}</span>,
            }))}
          />
        </Col>
        <Col span={24} md={12}>
          <KVList
            title="用户组分布"
            items={(data.userGroup || []).map((item: any) => ({
              label: item.label || '默认',
              value: <span style={{ fontWeight: 600 }}>{item.value}</span>,
            }))}
          />
        </Col>
      </Row>
    </section>
  )
}