'use client'
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { Badge, Card, Col, Row, Spin, Table, Tag } from 'antd'
import { useRouter } from 'next/navigation'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatCard } from '@/components/common/StatCard'
import { getAlarmStats } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

/**
 * 告警概览 section
 * - 4 个 KPI
 * - Top10 告警设备 / 最近 30 天趋势
 */
export function AlarmOverviewSection() {
  const router = useRouter()
  const { data, loading } = usePromise(async () => {
    const { data } = await getAlarmStats()
    return data
  }, null)

  if (loading || !data) return <Spin />

  const handleRate = data.total ? Math.round((data.confirmed / data.total) * 1000) / 10 : 0

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<WarningOutlined />} title="告警概览" />
      <Row gutter={[16, 16]}>
        <Col span={12} md={6}>
          <StatCard
            title="历史告警总数"
            value={data.total}
            variant="warning"
            onClick={() => router.push('/admin/log/alarm')}
          />
        </Col>
        <Col span={12} md={6}>
          <StatCard title="未处理告警" value={data.unconfirmed} icon={<WarningOutlined />} variant="danger" />
        </Col>
        <Col span={12} md={6}>
          <StatCard title="已确认告警" value={data.confirmed} icon={<CheckCircleOutlined />} variant="success" />
        </Col>
        <Col span={12} md={6}>
          <StatCard title="处理率" value={handleRate} suffix="%" variant="info" />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24} md={12}>
          <Card size="small" title="告警最多的设备 Top10">
            <Table
              size="small"
              pagination={false}
              dataSource={(data.topMacs || []).map((item: any, i: number) => ({ ...item, key: i }))}
              columns={[
                { title: '排名', render: (_: any, __: any, idx: number) => idx + 1, width: 60 },
                { title: '设备 MAC', dataIndex: 'mac' },
                { title: '告警次数', dataIndex: 'count', render: (v: number) => <Tag color="red">{v}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col span={24} md={12}>
          <Card size="small" title="最近30天每日告警趋势">
            <Table
              size="small"
              scroll={{ y: 220 }}
              pagination={false}
              dataSource={(data.dailyLast30Days || []).map((item: any, i: number) => ({ ...item, key: i }))}
              columns={[
                { title: '日期', dataIndex: 'date' },
                {
                  title: '告警数',
                  dataIndex: 'count',
                  render: (v: number) => (
                    <Badge
                      count={v}
                      style={{ backgroundColor: v > 10 ? '#dc2626' : '#059669' }}
                      overflowCount={9999}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </section>
  )
}