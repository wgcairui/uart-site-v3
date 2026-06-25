'use client'

import { Button, Card, Empty, Input, Space, Table, Tag, Typography } from 'antd'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary, type SummaryVariant } from '@/components/common/PageSummary'
import { useNav } from '@/lib/hooks/useNav'
import { usePromise } from '@/lib/hooks/usePromise'
import { getProtocols } from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { MessageOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'

const { Text } = Typography

/**
 * /admin/ai/chat — 协议选择页（决策 11 / 2026-06-24）
 *
 * admin 选择已有协议 → 进入 /admin/ai/chat/:name 用 AI 修改。
 * 进入 chat 子页后调用 `POST /api/v2/admin/ai/chat-stream` 流式修改，
 * 同一协议累计 chat 次数无限制（v1 简化），version 每次 +1。
 */
export default function AiChatIndexPage() {
  const nav = useNav()
  const [search, setSearch] = useState('')

  const apiQuery = useMemo(
    () => ({
      page: 1,
      pageSize: 100,
      needTotal: true,
      search: search ? { Protocol: search } : undefined,
    }),
    [search]
  )

  const { data, loading } = usePromise<any>(
    async () => {
      const el = await getProtocols(apiQuery as any)
      return el.data
    },
    { items: [], pagination: {} },
    [JSON.stringify(apiQuery)]
  )

  const items: any[] = useMemo(() => data?.items ?? [], [data?.items])
  const pagination = data?.pagination ?? { total: 0 }

  const stats = useMemo(() => {
    const byType: Record<string, number> = {}
    items.forEach((it: any) => {
      const t = it.ProtocolType ?? 'unknown'
      byType[t] = (byType[t] ?? 0) + 1
    })
    return byType
  }, [items])

  return (
    <>
      <PageHeader
        title="AI 修改协议"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: 'AI 工具', href: '/admin/ai/generate' },
          { title: 'AI 修改协议' },
        ]}
        extra={
          <Space>
            <Input.Search
              placeholder="搜索协议名"
              allowClear
              style={{ width: 240 }}
              onSearch={setSearch}
            />
          </Space>
        }
      />
      <PageSummary
        items={[
          { label: '协议总数', value: pagination.total ?? items.length, variant: 'primary' as SummaryVariant },
          ...Object.entries(stats).slice(0, 4).map(([type, count]) => ({
            label: type,
            value: count,
            variant: 'info' as SummaryVariant,
          })),
        ]}
      />
      <Card style={{ marginTop: 16 }}>
        {items.length === 0 && !loading ? (
          <Empty
            description={
              <Space orientation="vertical" size={8}>
                <Text type="secondary">暂无协议</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  先在 <a href="/admin/ai/generate">AI 生成新协议</a> 或
                  <a href="/admin/node/protocols"> 协议管理 </a>里创建
                </Text>
              </Space>
            }
          />
        ) : (
          <Table
            loading={loading}
            dataSource={generateTableKey(items, '_id')}
            rowKey="_id"
            pagination={{ pageSize: 20 }}
            columns={[
              {
                title: '协议名',
                dataIndex: 'Protocol',
                render: (text: string, record: any) => (
                  <Space>
                    <Tag color="blue">{record.ProtocolType}</Tag>
                    <Text strong>{text}</Text>
                    {record.version && (
                      <Tag color="cyan" style={{ fontSize: 10 }}>
                        v{record.version}
                      </Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: '串口',
                dataIndex: 'Type',
                width: 80,
              },
              {
                title: '指令数',
                dataIndex: 'instruct',
                width: 80,
                render: (arr: any[]) => (Array.isArray(arr) ? arr.length : 0),
              },
              {
                title: '操作',
                width: 180,
                render: (_, record: any) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<MessageOutlined />}
                      onClick={() =>
                        nav(`/admin/ai/chat/${encodeURIComponent(record.Protocol)}`)
                      }
                    >
                      AI 修改
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  )
}