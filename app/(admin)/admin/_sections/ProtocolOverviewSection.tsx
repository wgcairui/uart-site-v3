'use client'
import { ApiOutlined } from '@ant-design/icons'
import { Card, Col, Descriptions, Row, Spin, Table, Tag } from 'antd'
import { useRouter } from 'next/navigation'
import { KVList } from '@/components/common/KVList'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatCard } from '@/components/common/StatCard'
import { getProtocolDetailedStats } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

/**
 * 协议概览 section
 * - 协议总数
 * - 通信类型/设备类型分布
 * - 指令数 Top10
 */
export function ProtocolOverviewSection() {
  const router = useRouter()
  const { data, loading } = usePromise(async () => {
    const { data } = await getProtocolDetailedStats()
    return data
  }, null)

  if (loading || !data) return <Spin />

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<ApiOutlined />} title="协议概览" />
      <Row gutter={[16, 16]}>
        <Col span={12} md={8}>
          <StatCard
            title="协议总数"
            value={data.total}
            icon={<ApiOutlined />}
            variant="primary"
            onClick={() => router.push('/admin/node/protocols')}
          />
        </Col>
        <Col span={24} md={16}>
          <Card size="small" title="通信类型分布">
            <Descriptions column={4} size="small" bordered>
              {(data.commType || []).map((item: any) => (
                <Descriptions.Item label={`${item.label} 型`} key={item.label}>
                  {item.value}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24} md={12}>
          <KVList
            title="设备类型分布"
            column={2}
            items={(data.typeDistribution || []).map((item: any) => ({
              label: item.label,
              value: item.value,
            }))}
          />
        </Col>
        <Col span={24} md={12}>
          <Card size="small" title="指令最多的协议 Top10">
            <Table
              size="small"
              pagination={false}
              dataSource={(data.top10ByInstructCount || []).map((item: any, i: number) => ({
                ...item,
                key: i,
              }))}
              columns={[
                { title: '协议名', dataIndex: 'protocol' },
                {
                  title: '指令数',
                  dataIndex: 'instructCount',
                  render: (v: number) => <Tag color="blue">{v}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </section>
  )
}