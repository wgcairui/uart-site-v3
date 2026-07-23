'use client'

/**
 * admin AI 调用审计 — /admin/ai/audit
 *
 * == 作用 ==
 * 展示所有 AI (RoleType.AI) 调过 server 的 endpoint 历史, 用于:
 * - 排查 "AI 查了什么" / "AI 是不是在乱搞"
 * - 监管 AI token 活动 (谁在用 / 什么时候用 / 查什么)
 * - 出事时回溯 (e.g. AI 调了写端点被 403, 这里能看到 403 之前的尝试)
 *
 * == 数据源 ==
 * 复用现有 `loguserrequsts` API (POST /api/v2/admin/logs/user-requests),
 * 拉最近 7d 的 user requests, **client-side 过滤** `userGroup === 'ai'`.
 *
 * == 已知限制 ==
 * server 端 `/api/v2/admin/logs/user-requests` 没支持 userGroup filter (cairui 06-23 拍过),
 * 所以走 client filter. 时间窗越大拉的数据越多, 当前默认 7d (pageSize 200) 够用.
 * 后续 server 端加 userGroup filter 后再切 server filter.
 *
 * == 字段名权威源 ==
 * midwayuartserver/src/module/log/controller/admin-log.controller.ts listUserRequestLogs
 * midwayuartserver/src/mongo_entity/log.ts logUserRequest
 * 字段: _id / user / userGroup / type / argument / timeStamp / createdAt
 */
import {
  Button, Empty, Input, Select, Space, Spin, Table, Tag, Tooltip, Typography, Alert, Row, Col,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ReloadOutlined, RobotOutlined, SearchOutlined, ApiOutlined,
  ClockCircleOutlined, FilterOutlined, ThunderboltOutlined, InfoCircleOutlined,
} from '@ant-design/icons'

import { loguserrequsts } from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { BentoCard } from '@/components/common/BentoCard'

const { Text } = Typography

// 默认 7d, 上限 30d (server pagination.helper 强制 31d 上限)
const MAX_ITEMS = 200

// 时间快选
const TIME_QUICK_OPTIONS: { value: string; label: string; hours: number }[] = [
  { value: '1h', label: '最近 1h', hours: 1 },
  { value: '24h', label: '最近 24h', hours: 24 },
  { value: '7d', label: '最近 7d', hours: 24 * 7 },
  { value: '30d', label: '最近 30d', hours: 24 * 30 },
]

/** 推断 argument 是不是 url (AI ops 调用习惯) */
function extractEndpoint(argument: any): string {
  if (!argument || typeof argument !== 'object') return '-'
  // server 端 LogUserRequestService 记录的是 { url, method, params, body }
  if (typeof argument.url === 'string') return argument.url
  if (typeof argument.path === 'string') return argument.path
  // 兜底: 转 string
  return '-'
}

/** 提取 method */
function extractMethod(argument: any): string {
  if (!argument || typeof argument !== 'object') return '-'
  if (typeof argument.method === 'string') return argument.method.toUpperCase()
  return '-'
}

/** 格式化 argument 摘要 (避免超长) */
function formatArgSummary(argument: any): string {
  if (argument === null || argument === undefined) return '-'
  if (typeof argument === 'string') {
    return argument.length > 100 ? argument.slice(0, 100) + '...' : argument
  }
  try {
    const str = JSON.stringify(argument)
    return str.length > 120 ? str.slice(0, 120) + '...' : str
  } catch {
    return String(argument)
  }
}

/** 把 "ai:<name>" 解析成 name, 非 ai user 原样返回 */
function parseAiName(user: string): string {
  if (typeof user !== 'string') return '-'
  if (user.startsWith('ai:')) return user.slice(3)
  return user
}

interface AuditFilters {
  search: string
  aiName: string[]
  hours: number
}

const EMPTY_FILTERS: AuditFilters = {
  search: '',
  aiName: [],
  hours: 24 * 7, // 默认 7d
}

export default function AdminAiAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS)
  const [fetchKey, setFetchKey] = useState(0)
  const [items, setItems] = useState<Uart.logUserRequst[]>([])
  const [loading, setLoading] = useState(false)

  // 拉数据
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const end = Date.now()
    const start = end - filters.hours * 3600 * 1000
    // pageSize=MAX_ITEMS 一次拉满, 7d 范围内数据量可控
    // 后续 server 端支持 userGroup filter 后改成 server filter, 减少数据传输
    loguserrequsts(new Date(start).toISOString(), new Date(end).toISOString(), {
      page: 1,
      pageSize: MAX_ITEMS,
      sortBy: 'timeStamp',
      sortOrder: 'desc',
      needTotal: true,
    })
      .then((res) => {
        if (cancelled) return
        const d: any = res.data
        const list = Array.isArray(d) ? d : d?.items ?? []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('loguserrequsts failed', err)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fetchKey, filters.hours])

  // client-side 过滤 userGroup='ai' (server 不支持 server-side filter)
  const aiItems = useMemo(
    () => items.filter((it) => it.userGroup === 'ai'),
    [items],
  )

  // 进一步按 search + aiName 过滤
  const filtered = useMemo(() => {
    return aiItems.filter((it) => {
      if (filters.aiName.length) {
        const name = parseAiName(it.user)
        if (!filters.aiName.includes(name)) return false
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const haystack = [
          it.user,
          it.userGroup,
          it.type,
          extractEndpoint(it.argument),
          extractMethod(it.argument),
          formatArgSummary(it.argument),
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [aiItems, filters.search, filters.aiName])

  // 统计
  const stats = useMemo(() => ({
    total: aiItems.length,
    names: new Set(aiItems.map((it) => parseAiName(it.user))).size,
    types: new Set(aiItems.map((it) => it.type).filter(Boolean)).size,
    last24h: aiItems.filter((it) => (it.timeStamp || 0) > Date.now() - 24 * 3600 * 1000).length,
  }), [aiItems])

  // aiName 下拉选项 (从已有 aiItems 提取)
  const aiNameOptions = useMemo(() => {
    const set = new Set(aiItems.map((it) => parseAiName(it.user)).filter(Boolean))
    return Array.from(set).sort().map((n) => ({ value: n, label: `ai:${n}` }))
  }, [aiItems])

  // 触发刷新
  const triggerFetch = () => setFetchKey((k) => k + 1)

  // 表格列
  const columns: ColumnsType<Uart.logUserRequst> = [
    {
      dataIndex: 'timeStamp',
      title: '时间',
      width: 170,
      render: (v: number, record) => (
        <Tooltip title={record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
            {v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      dataIndex: 'user',
      title: 'AI 名称',
      width: 160,
      render: (user: string) => {
        const name = parseAiName(user)
        return (
          <Space size={4}>
            <RobotOutlined style={{ color: '#8b5cf6' }} />
            <Tag color="purple" style={{ marginRight: 0, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
              ai:{name}
            </Tag>
          </Space>
        )
      },
    },
    {
      dataIndex: 'type',
      title: '类型',
      width: 100,
      render: (t: string) => {
        if (!t) return '-'
        // t 一般是 endpoint path 摘要 或 'login' 之类的
        const color = t === 'login' ? 'blue' : 'default'
        return <Tag color={color} style={{ fontSize: 11 }}>{t}</Tag>
      },
    },
    {
      title: 'Endpoint / Method',
      width: 280,
      render: (_: any, record) => {
        const ep = extractEndpoint(record.argument)
        const m = extractMethod(record.argument)
        const methodColor = m === 'GET' ? 'green' : m === 'POST' ? 'gold' : m === 'DELETE' ? 'red' : 'default'
        return (
          <Space size={4} wrap>
            <Tag color={methodColor} style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
              {m}
            </Tag>
            <code style={{ fontSize: 11, color: '#475569' }}>{ep}</code>
          </Space>
        )
      },
    },
    {
      title: '参数摘要',
      ellipsis: true,
      render: (_: any, record) => (
        <Tooltip title={record.argument ? JSON.stringify(record.argument) : ''}>
          <code style={{ fontSize: 11, color: '#64748b' }}>
            {formatArgSummary(record.argument)}
          </code>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0, padding: 24 }}>
      <PageHeader
        title="AI 调用审计"
        subtitle="所有 AI (RoleType.AI) 调过 server 的 endpoint 历史 — 复用 user-requests 日志, client 过滤"
        breadcrumb={[
          { title: '系统管理', href: '/admin' },
          { title: 'AI 工具' },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={triggerFetch}>
              刷新
            </Button>
          </Space>
        }
      />

      {/* ═══ 顶部说明 ═══ */}
      <Alert
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        message="数据源说明"
        description={
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            server 端 <code>/api/v2/admin/logs/user-requests</code> 当前不支持 <code>userGroup</code> server-side filter,
            本页走 <strong>client-side 过滤</strong> + 默认 7d 时间窗 + pageSize 200 拉取.
            拉到的 <code>userGroup=&apos;ai&apos;</code> 才是 AI 调用, 其它 user 全部丢弃.
            后续 server 端加 filter 后会切到 server filter (省流量).
          </div>
        }
        style={{ marginBottom: 20, maxWidth: 1100 }}
      />

      {/* ═══ 4 卡统计 ═══ */}
      <PageSummary
        items={[
          { label: 'AI 调用总数', value: stats.total, variant: 'primary' },
          { label: '独立 AI 数', value: stats.names, variant: 'info' },
          { label: '不同类型', value: stats.types, variant: 'warning' },
          { label: '近 24h', value: stats.last24h, variant: stats.last24h > 0 ? 'success' : 'info' },
        ]}
      />

      <BentoCard variant="default" padding="md" style={{ marginTop: 20 }}>
        {/* ═══ 筛选条 ═══ */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Input
              placeholder="搜索 user / endpoint / 参数"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              mode="multiple"
              placeholder="AI 名称"
              value={filters.aiName}
              onChange={(v) => setFilters((f) => ({ ...f, aiName: v as string[] }))}
              options={aiNameOptions}
              style={{ width: '100%' }}
              maxTagCount="responsive"
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="时间窗"
              value={filters.hours}
              onChange={(v) => setFilters((f) => ({ ...f, hours: v }))}
              options={TIME_QUICK_OPTIONS.map((o) => ({
                value: o.hours,
                label: (
                  <span>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {o.label}
                  </span>
                ),
              }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button
              onClick={() => setFilters(EMPTY_FILTERS)}
              icon={<FilterOutlined />}
              block
            >
              清空筛选
            </Button>
          </Col>
        </Row>

        {/* ═══ 表格 ═══ */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin description="加载中..." />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              aiItems.length === 0
                ? `最近 ${Math.round(filters.hours / 24)}d 没有 AI 调用记录`
                : '当前筛选条件下没有数据'
            }
          />
        ) : (
          <Table
            size="small"
            dataSource={filtered}
            rowKey="_id"
            columns={columns}
            pagination={{
              pageSize: 30,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 900 }}
          />
        )}
      </BentoCard>

      {/* ═══ 底部说明 ═══ */}
      <div style={{ marginTop: 16, fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
        {'// 数据源: log.userRequests (server feat/log-user-requests) · 7d 滚动 · '}
        {filtered.length} / {aiItems.length} 条 AI 记录
      </div>
    </div>
  )
}
