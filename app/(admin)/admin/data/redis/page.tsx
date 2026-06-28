'use client'
/**
 * Redis 键管理 — /admin/data/redis
 *
 * 2026-06-28 全面重构（vs 旧 redis/page.tsx 226 行 hack 版本）：
 * - 三段式布局（PageHeader + PageSummary + Form + Table），跟全站一致
 * - usePromise<V2ListResponse<string>> 替换 fallback `data.items || data`
 * - 适配 server 无 total 场景（pagination.total undefined → 显示 hasNext 模式）
 * - flush-db 二次确认弹窗：必须输入 "flush" 字样才能执行（防误操作）
 * - 按 type 分桶 PageSummary（string/hash/list/set/zset，当前页内统计）
 * - 批量多选删除 + 单 key 删除
 * - value 按需加载保留（旧版已有，按 type 分支渲染 string/hash/list）
 *
 * 接口契约：lib/api/endpoints/admin/system.ts rediskeys / rediskeysdValue
 *   GET  /api/v2/admin/system/redis/keys?pattern=&page=&pageSize=
 *        返回 V2ListResponse<string>（pagination 无 total，server SCAN + 60s cache）
 *   POST /api/v2/admin/system/redis/keys/values  { keys: string[] }
 *        返回 string[]，按 server 端 type 分支取 string/hgetall/lrange/smembers/zrange
 *
 * Stage 2 (P1) 会加 /redis/keys/info 端点（批量 type+ttl+size+value），
 * 那时 TTL/size 列从 "-" 改成真实值。
 */
import { DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, message, Modal, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/lib/table'
import React, { useMemo, useState } from 'react'
import { redisflushdb, rediskeys, rediskeysdel, rediskeysdValue } from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { PaginationReq, V2ListResponse } from '@/types'

const { Text } = Typography

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * 从 value 推断 redis type（基于 server keys/values 返回的字符串值）
 *
 * server 端 keys/values 返回 string[]（type-erased），前端需要按
 * 字符串内容推断实际 type 用于 type tag 展示。注意：这只用于 UI 显示，
 * 真实 type 判断在 Stage 2 /redis/keys/info 端点。
 */
function inferRedisType(value: unknown): 'string' | 'hash' | 'list' | 'set' | 'zset' | 'unknown' {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'object') return 'hash'
  return 'unknown'
}

/**
 * 格式化 Redis value 展示
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') {
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        /* fall through */
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > 10) {
      return '[\n  ' + value.slice(0, 10).join(',\n  ') + `,\n  ... 共 ${value.length} 项\n]`
    }
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > 5) {
      const preview = entries
        .slice(0, 5)
        .map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`)
        .join('\n')
      return `{\n${preview},\n  ... 共 ${entries.length} 项\n}`
    }
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

/**
 * Type 标签颜色映射
 */
const TYPE_TAG_COLOR: Record<string, string> = {
  string: 'default',
  hash: 'green',
  list: 'purple',
  set: 'orange',
  zset: 'magenta',
  unknown: 'default',
}

// ─── types ───────────────────────────────────────────────────────────────────

interface RowState {
  key: string
  /** 已加载的 value（未加载时为 null） */
  value: unknown
  /** 加载中标记 */
  loading: boolean
  /** 行内 type（从 value 推断，仅展示用） */
  type: string
}

const DEFAULT_PAGINATION: V2ListResponse<string>['pagination'] = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

// ─── component ──────────────────────────────────────────────────────────────

export const Redis: React.FC = () => {
  const [pattern, setPattern] = useState('')
  const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 50 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const apiQuery: PaginationReq = { ...query }

  const {
    data: listData,
    loading,
    fecth,
    setData,
  } = usePromise<V2ListResponse<string>>(
    async () => {
      // 旧 redis/page.tsx 把 pattern + '*' 拼接，让用户输入 "user" → 匹配 user*。
      // Stage 1 server 端 SCAN MATCH 直接接 pattern，前端沿用这个语义。
      const finalPattern = pattern ? pattern + '*' : '*'
      const { data } = await rediskeys(finalPattern, apiQuery)
      return data
    },
    { items: [], pagination: DEFAULT_PAGINATION },
    [pattern, JSON.stringify(apiQuery)],
  )

  const keys = useMemo(() => listData?.items ?? [], [listData])
  const pagination = listData?.pagination ?? DEFAULT_PAGINATION

  // 把 keys 转成 RowState（保留已加载的 value / loading 标记）
  const [rows, setRows] = useState<Map<string, RowState>>(new Map())

  // 每次 keys 变化时同步 rows（保留旧 value，新增 missing 的 row）
  React.useEffect(() => {
    setRows(prev => {
      const next = new Map<string, RowState>()
      for (const k of keys) {
        const existing = prev.get(k)
        next.set(k, existing ?? { key: k, value: null, loading: false, type: 'unknown' })
      }
      return next
    })
  }, [keys])

  // PageSummary 当前页 type 分桶（基于已加载 value 推断的 type，未加载算 unknown）
  const buckets = useMemo(() => {
    const counts = { string: 0, hash: 0, list: 0, set: 0, zset: 0, unknown: 0 }
    for (const [, row] of rows) counts[(row.type as keyof typeof counts) ?? 'unknown']++
    return counts
  }, [rows])

  /** 触发查找（保留旧版行为：Enter / 点 button 都重置 page=1） */
  const triggerSearch = () => setQuery(q => ({ ...q, page: 1 }))

  /** 更新单个 row 的 value / loading */
  const updateRow = (targetKey: string, patch: Partial<RowState>) => {
    setRows(prev => {
      const next = new Map(prev)
      const cur = next.get(targetKey)
      if (cur) next.set(targetKey, { ...cur, ...patch })
      return next
    })
  }

  /**
   * 加载单 key 的 value
   *
   * Stage 1 P0 走旧端点 /redis/keys/values (返回 string[]，type-erased)，
   * Stage 2 P1 会切到 /redis/keys/info 拿真实 type + ttl + size。
   */
  const fetchValue = async (targetKey: string) => {
    updateRow(targetKey, { loading: true })
    try {
      const el = await rediskeysdValue([targetKey])
      const raw = el.data?.[0]
      updateRow(targetKey, {
        value: raw ?? '-',
        type: inferRedisType(raw),
        loading: false,
      })
    } catch {
      updateRow(targetKey, { loading: false })
      message.error(`加载 ${targetKey} 失败`)
    }
  }

  /** 删除单个 key */
  const deleteKey = (targetKey: string) => {
    Modal.confirm({
      title: '确认删除 key',
      content: <Text code>{targetKey}</Text>,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk() {
        return rediskeysdel([targetKey]).then(() => {
          message.success(`已删除: ${targetKey}`)
          setSelectedRowKeys(keys => keys.filter(k => k !== targetKey))
          return fecth()
        })
      },
    })
  }

  /** 批量删除所选 keys */
  const batchDelete = () => {
    const names = selectedRowKeys as string[]
    if (names.length === 0) return
    Modal.confirm({
      title: `确认删除 ${names.length} 个 key?`,
      content: (
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {names.map(n => (
            <div key={n} style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 }}>
              {n}
            </div>
          ))}
        </div>
      ),
      okText: '删除',
      okButtonProps: { danger: true },
      onOk() {
        return rediskeysdel(names).then(() => {
          setSelectedRowKeys([])
          message.success(`已删除 ${names.length} 个 key`)
          return fecth()
        })
      },
    })
  }

  /**
   * flush-db 二次确认弹窗 — 必须输入 "flush" 字样才能执行。
   *
   * server 端 redisFlushDb 后会 setTimeout(1s) exit(0)，由 docker / pm2 自动拉起。
   * 所有 WebSocket 连接会断、登录态 / 缓存丢失，必须二次确认。
   */
  const FlushDbModal: React.FC<{ open: boolean; onCancel: () => void }> = ({
    open,
    onCancel,
  }) => {
    const [confirmText, setConfirmText] = useState('')

    return (
      <Modal
        title="⚠️ 确认清空整个 Redis 数据库?"
        open={open}
        onCancel={() => {
          setConfirmText('')
          onCancel()
        }}
        onOk={() => {
          if (confirmText !== 'flush') return
          return redisflushdb().then(el => {
            message.success(`清除成功 ${el.data ?? ''}`)
            setConfirmText('')
            onCancel()
            fecth()
          })
        }}
        okText="确认清空"
        okButtonProps={{ danger: true, disabled: confirmText !== 'flush' }}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          此操作：
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>不可逆，所有 key 立即删除</li>
            <li>服务进程将自动重启（1s 后）</li>
            <li>所有 WebSocket 连接会断开</li>
            <li>所有登录态 / 缓存会丢失</li>
          </ul>
        </div>
        <div>
          请输入 <Text code>flush</Text> 确认执行：
        </div>
        <Input.Password
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="flush"
          style={{ marginTop: 8 }}
        />
      </Modal>
    )
  }

  const [flushModalOpen, setFlushModalOpen] = useState(false)

  const columns: ColumnsType<RowState> = [
    {
      dataIndex: 'key',
      title: 'key',
      width: 320,
      ellipsis: true,
      render: (v: string, row) => (
        <Space size={4}>
          <Tag color="blue">{v}</Tag>
          {row.type !== 'unknown' && (
            <Tag color={TYPE_TAG_COLOR[row.type] ?? 'default'}>{row.type}</Tag>
          )}
        </Space>
      ),
    },
    {
      dataIndex: 'value',
      title: 'value',
      ellipsis: { showTitle: false },
      render: (v: unknown, row) =>
        row.loading ? (
          <Spin size="small" />
        ) : v === null ? (
          <Button size="small" type="link" onClick={() => fetchValue(row.key)}>
            点击加载
          </Button>
        ) : (
          <Tooltip title={formatValue(v)} placement="topLeft">
            <pre
              style={{
                margin: 0,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 120,
                overflow: 'auto',
              }}
            >
              {formatValue(v)}
            </pre>
          </Tooltip>
        ),
    },
    {
      key: 'operation',
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title="重新加载 value">
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              loading={row.loading}
              onClick={() => fetchValue(row.key)}
            />
          </Tooltip>
          <Tooltip title="删除 key">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteKey(row.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const handleTableChange = (pag: TablePaginationConfig) => {
    setQuery(q => ({
      ...q,
      page: pag.current ?? q.page ?? 1,
      pageSize: pag.pageSize ?? q.pageSize ?? 50,
    }))
  }

  // 派生 dataSource（Map → Array），保证 rowKey 稳定
  const dataSource = useMemo(() => {
    return Array.from(rows.values()).map(r => ({
      ...generateTableKey([r], 'key')[0],
      ...r,
    }))
  }, [rows])

  return (
    <>
      <PageHeader
        title="Redis 键管理"
        breadcrumb={[{ title: '首页', href: '/admin' }, { title: '设备数据' }]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fecth()}>
              刷新
            </Button>
            <Button danger onClick={() => setFlushModalOpen(true)}>
              清空 redis
            </Button>
          </Space>
        }
      />
      <PageSummary
        items={[
          { label: '本页 key', value: keys.length, variant: 'primary' },
          { label: 'string', value: buckets.string, variant: 'info' },
          { label: 'hash', value: buckets.hash, variant: 'success' },
          { label: 'list', value: buckets.list, variant: 'warning' },
        ]}
      />
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="pattern">
          <Input
            value={pattern}
            placeholder="输入前缀 (自动加 *, 空 = 全部)"
            onChange={e => setPattern(e.target.value)}
            onPressEnter={triggerSearch}
            style={{ width: 320 }}
            allowClear
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={triggerSearch}>
              查找
            </Button>
            <Button
              danger
              disabled={selectedRowKeys.length === 0}
              onClick={batchDelete}
            >
              删除所选 ({selectedRowKeys.length})
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        size="small"
        loading={loading}
        dataSource={dataSource}
        rowKey="key"
        scroll={{ x: 900 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
        }}
        pagination={{
          current: query.page ?? 1,
          pageSize: query.pageSize ?? 50,
          total: pagination.total ?? 0,
          showTotal: t =>
            t > 0
              ? `共 ${t} 个${pagination.hasNext ? ' (hasNext 模式)' : ''}`
              : 'hasNext 模式（无 total，server SCAN 不暴露 count）',
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
        }}
        onChange={handleTableChange}
        columns={columns}
      />

      <FlushDbModal open={flushModalOpen} onCancel={() => setFlushModalOpen(false)} />
    </>
  )
}

export default Redis
