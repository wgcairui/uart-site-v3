'use client'

import { Button, Empty, Input, Space, Table, Typography } from 'antd'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary, type SummaryVariant } from '@/components/common/PageSummary'
import { StatusTag, type StatusTagVariant } from '@/components/common/StatusTag'
import { useNav } from '@/lib/hooks/useNav'
import { usePromise } from '@/lib/hooks/usePromise'
import { getProtocols } from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { MessageOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'

const { Text } = Typography

/**
 * /admin/ai/chat — 协议选择页（决策 11 / 2026-06-24）
 *
 * v3 化 (2026-07-12): Bento device hero + v3-table + bento-card 容器
 *  - device hero 显示 AI 工具状态: 协议总数 / 可用类型 / 累计修改 / 平均版本
 *  - 协议类型用 StatusTag 6 variant 替代 antd Tag
 *  - Table 加 v3-table class (紫光表头 + hover 高亮 + 紫光分页)
 *  - Card → bento-card 容器
 *  - 主容器加 bg-bento-canvas (极光晕染)
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

  // 按 protocolType 聚合 + 累计版本 + 平均版本
  const stats = useMemo(() => {
    const byType: Record<string, number> = {}
    let versionSum = 0
    let versionCount = 0
    items.forEach((it: any) => {
      const t = it.ProtocolType ?? 'unknown'
      byType[t] = (byType[t] ?? 0) + 1
      if (typeof it.version === 'number') {
        versionSum += it.version
        versionCount += 1
      }
    })
    return {
      byType,
      typeCount: Object.keys(byType).length,
      versionSum,
      avgVersion: versionCount > 0 ? Math.round((versionSum / versionCount) * 10) / 10 : 0,
    }
  }, [items])

  const totalProtocols = pagination.total ?? items.length

  // 协议类型 → StatusTag variant 映射（type 值是任意的，所以统一走 info + 自定义 text）
  const variantForType = (type: string): StatusTagVariant => {
    if (type === 'ups') return 'info'
    if (type === 'air') return 'online'
    if (type === 'em') return 'warning'
    if (type === 'th') return 'offline'
    if (type === 'io') return 'idle'
    return 'info'
  }

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      <PageHeader
        title="AI 修改协议"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: 'AI 工具', href: '/admin/ai/generate' },
          { title: 'AI 修改协议' },
        ]}
        extra={
          <Input.Search
            placeholder="搜索协议名"
            allowClear
            style={{ width: 240 }}
            onSearch={setSearch}
          />
        }
      />

      {/* device hero · AI 工具状态 (v3 hybrid Page B 1:1) */}
      <div
        className="bento-card v3-device-hero"
        style={{
          marginBottom: 20,
          padding: '32px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
          color: '#fff',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 320,
            height: 320,
            background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: '20%',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, var(--brand-300) 0%, transparent 70%)',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            // AI 工具状态 · TOOL OVERVIEW
          </div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#fff',
              margin: 0,
            }}
          >
            用 AI 多轮修改现有协议
          </h2>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              marginTop: 8,
              maxWidth: 640,
            }}
          >
            选择下方任一协议，AI 将通过多轮对话理解你的修改诉求，流式更新指令结构。
          </div>
          <div
            style={{
              marginTop: 28,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
            }}
          >
            {[
              { label: '协议总数', value: totalProtocols, suffix: '条' },
              { label: '可用类型', value: stats.typeCount, suffix: '种' },
              { label: '累计版本', value: stats.versionSum, suffix: '次' },
              { label: '平均版本', value: stats.avgVersion, suffix: '' },
            ].map((kpi) => (
              <div key={kpi.label}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.65)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  // {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: '#fff',
                    marginTop: 8,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {kpi.value}
                  <span
                    style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.7)',
                      marginLeft: 4,
                      fontWeight: 400,
                    }}
                  >
                    {kpi.suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageSummary
        items={[
          { label: '协议总数', value: totalProtocols, variant: 'primary' as SummaryVariant },
          ...Object.entries(stats.byType).slice(0, 4).map(([type, count]) => ({
            label: type,
            value: count,
            variant: 'info' as SummaryVariant,
          })),
        ]}
      />

      <div className="bento-card" style={{ marginTop: 20, padding: 24 }}>
        {items.length === 0 && !loading ? (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Empty
              description={
                <Space orientation="vertical" size={8} style={{ alignItems: 'center' }}>
                  <Text type="secondary">暂无协议</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    先在{' '}
                    <a href="/admin/ai/generate" style={{ color: 'var(--color-primary)' }}>
                      AI 生成新协议
                    </a>{' '}
                    或{' '}
                    <a href="/admin/node/protocols" style={{ color: 'var(--color-primary)' }}>
                      协议管理
                    </a>{' '}
                    里创建
                  </Text>
                </Space>
              }
            />
          </div>
        ) : (
          <Table
            className="v3-table"
            loading={loading}
            dataSource={generateTableKey(items, '_id')}
            rowKey="_id"
            scroll={{ x: 720 }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            columns={[
              {
                title: '协议名',
                dataIndex: 'Protocol',
                render: (text: string, record: any) => (
                  <Space size={6}>
                    <StatusTag
                      variant={variantForType(record.ProtocolType ?? 'unknown')}
                      text={record.ProtocolType ?? 'unknown'}
                      size="sm"
                    />
                    <Text strong style={{ fontSize: 14 }}>
                      {text}
                    </Text>
                    {record.version && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'var(--brand-700)',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        v{record.version}
                      </span>
                    )}
                  </Space>
                ),
              },
              {
                title: '串口',
                dataIndex: 'Type',
                width: 80,
                render: (v: number) => (v === 485 || v === 232 ? v : v ?? '-'),
              },
              {
                title: '指令数',
                dataIndex: 'instruct',
                width: 100,
                render: (arr: any[]) => (
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: 'var(--ink-900)',
                    }}
                  >
                    {Array.isArray(arr) ? arr.length : 0}
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-400)',
                        marginLeft: 2,
                        fontWeight: 400,
                      }}
                    >
                      条
                    </span>
                  </span>
                ),
              },
              {
                title: '操作',
                width: 160,
                fixed: 'right',
                render: (_, record: any) => (
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
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}
