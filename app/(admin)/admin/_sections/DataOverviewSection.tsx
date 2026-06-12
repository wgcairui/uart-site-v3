'use client'
import { DatabaseOutlined } from '@ant-design/icons'
import { Col, Row, Spin } from 'antd'
import { KVList } from '@/components/common/KVList'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatCard } from '@/components/common/StatCard'
import { getDataStats } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

/**
 * 数据概览 section
 * - 单例数据记录数 / 设备覆盖率
 * - 数据量 Top10 协议
 */
export function DataOverviewSection() {
  const { data, loading } = usePromise(async () => {
    const { data } = await getDataStats()
    return data
  }, null)

  if (loading || !data) return <Spin />

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<DatabaseOutlined />} title="数据概览" />
      <Row gutter={[16, 16]}>
        <Col span={12} md={6}>
          <StatCard
            title="单例数据记录数"
            value={data.singleDataCount}
            icon={<DatabaseOutlined />}
            color="#1890ff"
          />
        </Col>
        <Col span={12} md={6}>
          <StatCard
            title="有数据的设备覆盖率"
            value={data.coverageRate}
            suffix="%"
            color={data.coverageRate >= 70 ? '#52c41a' : '#fa8c16'}
          />
        </Col>
        <Col span={24} md={12}>
          <KVList
            title="数据量最多的协议 Top10"
            column={2}
            items={(data.topProtocolsByData || []).map((item: any) => ({
              label: item.protocol,
              value: item.count,
            }))}
          />
        </Col>
      </Row>
    </section>
  )
}