'use client'
/**
 * admin 告警审批跟踪页 (feat/feature-flag-platform 2026-07-21)
 *
 * 三段式 (PageHeader + PageSummary + BentoTable)
 *
 * 视觉:
 * - 顶部 6 卡 (pending / approved / rejected / auto_sent / 24h 创建 / 24h 处理)
 * - 4 维筛选 (mac 模糊 / msg 模糊 / mode 多选 / status 多选)
 * - Table 10 列: severity / mac / devName / msg / mode / status / scheduledAt / 审批人 / 创建时间 / 操作
 * - 行内操作 (按 status 联动):
 *   - pending: 批准 / 拒绝
 *   - delayed_auto + pending: 批准 / 取消
 *   - approved/rejected/auto_sent/cancelled/timed_out: 只读
 * - 批量操作: 选中多条 pending → 批量批准 / 批量拒绝
 * - 详情 Modal (点击行)
 *
 * ⚠️ 继承项目约定 (docs/style-guide.md):
 * - 危险操作走 Modal.confirm
 * - 'use client' 必加
 * - Modal + Form.useForm + destroyOnHidden
 */

import {
  Button, Input, Modal, Select, Space, Table, Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  StopOutlined, EyeOutlined, SearchOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import {
  listAlertApprovals, getAlertApprovalStats,
  approveAlertApproval, rejectAlertApproval, cancelAlertApproval,
  batchApproveAlertApprovals, batchRejectAlertApprovals,
} from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'

// server MAX_PAGE_SIZE = 200
const MAX_ITEMS = 200

// ─── mode / status 选项 ──────────────────────────────────────────────────────
const MODE_OPTIONS = [
  { value: 'auto', label: <Tag color="success" style={{ margin: 0 }}>auto</Tag> },
  { value: 'manual', label: <Tag color="warning" style={{ margin: 0 }}>manual</Tag> },
  { value: 'delayed_auto', label: <Tag color="processing" style={{ margin: 0 }}>delayed_auto</Tag> },
  { value: 'rejected_via_kill_switch', label: <Tag color="error" style={{ margin: 0 }}>kill_switch</Tag> },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: <Tag color="warning" style={{ margin: 0 }}>pending</Tag> },
  { value: 'approved', label: <Tag color="success" style={{ margin: 0 }}>approved</Tag> },
  { value: 'rejected', label: <Tag color="error" style={{ margin: 0 }}>rejected</Tag> },
  { value: 'auto_sent', label: <Tag color="blue" style={{ margin: 0 }}>auto_sent</Tag> },
  { value: 'cancelled', label: <Tag style={{ margin: 0 }}>cancelled</Tag> },
  { value: 'timed_out', label: <Tag color="default" style={{ margin: 0 }}>timed_out</Tag> },
]

const SEVERITY_TAG: Record<Uart.AlarmSeverity, { color: string; text: string }> = {
  critical: { color: 'error', text: '严重' },
  warning: { color: 'warning', text: '警告' },
  info: { color: 'default', text: '信息' },
}

// ─── 筛选条件 type ──────────────────────────────────────────────────────────
interface QueueFilters {
  mac: string
  msg: string
  modes: string[]
  statuses: string[]
}

const EMPTY_FILTERS: QueueFilters = {
  mac: '',
  msg: '',
  modes: [],
  statuses: [],
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const AdminAlertQueue: React.FC = () => {
  // 筛选 state
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS)
  const [fetchKey, setFetchKey] = useState(0)

  // 详情 Modal
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: Uart.UartAlertApprovalQueue | null }>({
    open: false,
    record: null,
  })

  // 选中的行 (批量操作)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // ─── 数据 ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Uart.UartAlertApprovalQueue[]>([])
  const [realTotal, setRealTotal] = useState(0)
  const [stats, setStats] = useState<Uart.UartAlertApprovalStats | null>(null)
  const [loading, setLoading] = useState(false)

  const triggerFetch = () => setFetchKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    // Phase 6 B2: filters 变化时清空选择, 避免选中的非 pending 行残留变灰
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRowKeys([])
    setLoading(true)

    const req: Uart.UartAlertApprovalQueueListReq = {
      page: 1,
      pageSize: MAX_ITEMS,
      needTotal: true,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
    const search: Record<string, string> = {}
    if (filters.mac.trim()) search.mac = filters.mac.trim()
    if (filters.msg.trim()) search.msg = filters.msg.trim()
    if (Object.keys(search).length) req.search = search
    const f: any = {}
    if (filters.modes.length) f.mode = filters.modes
    if (filters.statuses.length) f.status = filters.statuses
    if (Object.keys(f).length) req.filters = f

    Promise.all([
      listAlertApprovals(req),
      getAlertApprovalStats().catch(() => null),
    ])
      .then(([listRes, statsRes]) => {
        if (cancelled) return
        const d: any = listRes.data
        const list = Array.isArray(d) ? d : d?.items ?? []
        setItems(Array.isArray(list) ? list : [])
        setRealTotal(d?.pagination?.total ?? list.length ?? 0)
        if (statsRes) setStats((statsRes.data as any) || null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('listAlertApprovals failed', err)
        setItems([])
        setRealTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filters, fetchKey])

  // ─── 操作 ───────────────────────────────────────────────────────────────
  const doApprove = (id: string, reason?: string) => {
    return approveAlertApproval(id, reason ? { reason } : {})
      .then((res) => {
        if (res.code) {
          Modal.success({ content: '已批准, 告警将立即发送' })
          triggerFetch()
        } else {
          throw new Error((res.data as any)?.error || res.message || '批准失败')
        }
      })
  }

  const doReject = (id: string, reason: string) => {
    return rejectAlertApproval(id, { reason })
      .then((res) => {
        if (res.code) {
          Modal.success({ content: '已拒绝' })
          triggerFetch()
        } else {
          throw new Error((res.data as any)?.error || res.message || '拒绝失败')
        }
      })
  }

  const doCancel = (id: string, reason?: string) => {
    return cancelAlertApproval(id, reason ? { reason } : {})
      .then((res) => {
        if (res.code) {
          Modal.success({ content: '已取消' })
          triggerFetch()
        } else {
          throw new Error((res.data as any)?.error || res.message || '取消失败')
        }
      })
  }

  const onApprove = (record: Uart.UartAlertApprovalQueue) => {
    Modal.confirm({
      title: '批准告警',
      content: (
        <div>
          <div>批准 <code>{record.mac}</code> pid={record.pid} 的告警 <b>{record.alertEvent?.msg}</b> ?</div>
          <div style={{ marginTop: 8, color: '#e84545' }}>⚠️ 批准后告警将立即通过 SMS/email 发送给用户</div>
        </div>
      ),
      okText: '确定批准',
      okButtonProps: { danger: true },
      onOk() { return doApprove(record.id) },
    })
  }

  const onReject = (record: Uart.UartAlertApprovalQueue) => {
    let reason = ''
    Modal.confirm({
      title: '拒绝告警',
      content: (
        <div>
          <div>拒绝 <code>{record.mac}</code> pid={record.pid} 的告警 <b>{record.alertEvent?.msg}</b> ?</div>
          <Input.TextArea
            placeholder="拒绝原因 (必填, 至少 5 字)"
            rows={3}
            onChange={(e) => { reason = e.target.value }}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '确定拒绝',
      okButtonProps: { danger: true },
      onOk() {
        if (reason.trim().length < 5) {
          return Promise.reject(new Error('拒绝原因至少 5 字'))
        }
        return doReject(record.id, reason.trim())
      },
    })
  }

  const onCancel = (record: Uart.UartAlertApprovalQueue) => {
    let reason = ''
    Modal.confirm({
      title: '取消延迟告警',
      content: (
        <div>
          <div>取消 <code>{record.mac}</code> pid={record.pid} 的延迟告警 <b>{record.alertEvent?.msg}</b> ?</div>
          <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>scheduledAt: {dayjs(record.scheduledAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          <Input.TextArea
            placeholder="取消原因 (可选)"
            rows={2}
            onChange={(e) => { reason = e.target.value }}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '确定取消',
      onOk() { return doCancel(record.id, reason.trim() || undefined) },
    })
  }

  const onBatchApprove = () => {
    if (selectedRowKeys.length === 0) return
    Modal.confirm({
      title: `批量批准 ${selectedRowKeys.length} 条告警`,
      content: <div>这 {selectedRowKeys.length} 条 pending 告警将立即通过 SMS/email 发送</div>,
      okText: '确定批量批准',
      okButtonProps: { danger: true },
      onOk() {
        return batchApproveAlertApprovals({ ids: selectedRowKeys.map(String) })
          .then((res) => {
            if (res.code) {
              const r = res.data as any
              Modal.success({
                content: `成功 ${r?.succeeded?.length || 0} 条, 失败 ${r?.failed?.length || 0} 条`,
              })
              setSelectedRowKeys([])
              triggerFetch()
            } else {
              throw new Error((res.data as any)?.error || res.message || '批量操作失败')
            }
          })
      },
    })
  }

  const onBatchReject = () => {
    if (selectedRowKeys.length === 0) return
    let reason = ''
    Modal.confirm({
      title: `批量拒绝 ${selectedRowKeys.length} 条告警`,
      content: (
        <Input.TextArea
          placeholder="批量拒绝原因 (必填, 至少 5 字)"
          rows={3}
          onChange={(e) => { reason = e.target.value }}
        />
      ),
      okText: '确定批量拒绝',
      okButtonProps: { danger: true },
      onOk() {
        if (reason.trim().length < 5) {
          return Promise.reject(new Error('拒绝原因至少 5 字'))
        }
        return batchRejectAlertApprovals({ ids: selectedRowKeys.map(String), reason: reason.trim() })
          .then((res) => {
            if (res.code) {
              const r = res.data as any
              Modal.success({
                content: `成功 ${r?.succeeded?.length || 0} 条, 失败 ${r?.failed?.length || 0} 条`,
              })
              setSelectedRowKeys([])
              triggerFetch()
            } else {
              throw new Error((res.data as any)?.error || res.message || '批量操作失败')
            }
          })
      },
    })
  }

  // ─── 表格列 ────────────────────────────────────────────────────────────
  const columns: ColumnsType<Uart.UartAlertApprovalQueue> = [
    {
      title: '等级',
      dataIndex: 'severity',
      width: 80,
      render: (v: Uart.AlarmSeverity) => <Tag color={SEVERITY_TAG[v]?.color}>{SEVERITY_TAG[v]?.text || v}</Tag>,
    },
    {
      title: '设备',
      dataIndex: 'mac',
      width: 200,
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <code style={{ fontSize: 12 }}>{v}</code>
          {r.alertEvent?.devName && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.alertEvent.devName} · pid={r.pid}</span>}
        </Space>
      ),
    },
    {
      title: '告警消息',
      dataIndex: ['alertEvent', 'msg'],
      width: 280,
      ellipsis: true,
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <span style={{ fontSize: 12 }}>{v}</span>
          {r.alertEvent?.tag && <span style={{ fontSize: 10, color: '#94a3b8' }}>tag: {r.alertEvent.tag}</span>}
        </Space>
      ),
    },
    {
      title: 'mode',
      dataIndex: 'mode',
      width: 100,
      render: (v: string) => {
        const m = MODE_OPTIONS.find((o) => o.value === v)
        return m ? m.label : <Tag>{v}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => {
        const s = STATUS_OPTIONS.find((o) => o.value === v)
        return s ? s.label : <Tag>{v}</Tag>
      },
    },
    {
      title: '定时发送',
      dataIndex: 'scheduledAt',
      width: 160,
      render: (v: number) => v ? (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
          {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: '审批人',
      dataIndex: 'approver',
      width: 100,
      render: (v: string) => v ? <code style={{ fontSize: 12 }}>{v}</code> : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      sorter: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
          {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_: any, r) => {
        const isPending = r.status === 'pending'
        return (
          <Space size={4}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDetailModal({ open: true, record: r })}>
              详情
            </Button>
            {isPending && (
              <>
                <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => onApprove(r)}>
                  批准
                </Button>
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => onReject(r)}>
                  拒绝
                </Button>
                {r.mode === 'delayed_auto' && (
                  <Button type="link" size="small" icon={<StopOutlined />} onClick={() => onCancel(r)}>
                    取消
                  </Button>
                )}
              </>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
        <PageHeader
          title="告警审批队列"
          subtitle="Feature Flag 拦截的告警事件, 人工 / 自动 / 延迟 三态处理"
          breadcrumb={[{ title: '日志记录' }]}
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={triggerFetch}>刷新</Button>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button type="primary" danger icon={<CheckCircleOutlined />} onClick={onBatchApprove}>
                    批量批准 ({selectedRowKeys.length})
                  </Button>
                  <Button danger icon={<CloseCircleOutlined />} onClick={onBatchReject}>
                    批量拒绝 ({selectedRowKeys.length})
                  </Button>
                </>
              )}
            </Space>
          }
        />

        <PageSummary
          items={[
            { label: 'pending', value: stats?.pending ?? '—', variant: 'warning' },
            { label: 'approved', value: stats?.approved ?? '—', variant: 'success' },
            { label: 'rejected', value: stats?.rejected ?? '—', variant: 'danger' },
            { label: 'auto_sent', value: stats?.autoSent ?? '—', variant: 'primary' },
            { label: '24h 创建', value: stats?.last24h?.created ?? '—', variant: 'info' },
            { label: '24h 处理', value: stats?.last24h?.decided ?? '—', variant: 'info' },
          ]}
        />

        {/* 4 维筛选条 */}
        <div className="bento-card mb-5" style={{ padding: 16 }}>
          <Space wrap size={12}>
            <Input
              placeholder="按 mac 搜"
              value={filters.mac}
              onChange={(e) => setFilters((f) => ({ ...f, mac: e.target.value }))}
              style={{ width: 200 }}
              allowClear
            />
            <Input
              placeholder="按告警消息搜"
              prefix={<SearchOutlined />}
              value={filters.msg}
              onChange={(e) => setFilters((f) => ({ ...f, msg: e.target.value }))}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              mode="multiple"
              placeholder="mode"
              value={filters.modes}
              onChange={(v) => setFilters((f) => ({ ...f, modes: v as string[] }))}
              options={MODE_OPTIONS}
              style={{ minWidth: 180 }}
              maxTagCount="responsive"
            />
            <Select
              mode="multiple"
              placeholder="状态"
              value={filters.statuses}
              onChange={(v) => setFilters((f) => ({ ...f, statuses: v as string[] }))}
              options={STATUS_OPTIONS}
              style={{ minWidth: 180 }}
              maxTagCount="responsive"
            />
            <Button onClick={() => setFilters(EMPTY_FILTERS)}>清空筛选</Button>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>共 {realTotal} 条</span>
          </Space>
        </div>

        {/* 主 Table */}
        <div className="bento-card" style={{ padding: 16 }}>
          {items.length === 0 && !loading ? (
            <EmptyState description="暂无审批记录" />
          ) : (
            <Table<Uart.UartAlertApprovalQueue>
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={loading}
              size="middle"
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (record) => ({
                  disabled: record.status !== 'pending',
                }),
              }}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 1400 }}
            />
          )}
        </div>
      </div>

      {/* 详情 Modal */}
      <DetailModal
        open={detailModal.open}
        record={detailModal.record}
        onClose={() => setDetailModal({ open: false, record: null })}
      />
    </main>
  )
}

// ─── 详情 Modal 子组件 ──────────────────────────────────────────────────────

interface DetailModalProps {
  open: boolean
  record: Uart.UartAlertApprovalQueue | null
  onClose: () => void
}

const DetailModal: React.FC<DetailModalProps> = ({ open, record, onClose }) => {
  if (!record) return null

  const ffSnap = record.ffSnapshot
  const notifiedResults = record.recipientsNotified || []

  return (
    <Modal
      open={open}
      title={`告警审批详情 #${record.id}`}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={780}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Section title="基础信息">
          <KV k="id" v={<code>{record.id}</code>} />
          <KV k="mac" v={<code>{record.mac}</code>} />
          <KV k="pid" v={record.pid} />
          <KV k="severity" v={<Tag color={SEVERITY_TAG[record.severity]?.color}>{SEVERITY_TAG[record.severity]?.text}</Tag>} />
          <KV k="mode" v={MODE_OPTIONS.find((o) => o.value === record.mode)?.label} />
          <KV k="status" v={STATUS_OPTIONS.find((o) => o.value === record.status)?.label} />
          <KV k="创建时间" v={dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')} />
          {record.scheduledAt && <KV k="定时发送" v={dayjs(record.scheduledAt).format('YYYY-MM-DD HH:mm:ss')} />}
          {record.approver && <KV k="审批人" v={<code>{record.approver}</code>} />}
          {record.approvedAt && <KV k="审批时间" v={dayjs(record.approvedAt).format('YYYY-MM-DD HH:mm:ss')} />}
        </Section>

        <Section title="告警事件">
          <KV k="devName" v={record.alertEvent?.devName} />
          <KV k="tag" v={<code>{record.alertEvent?.tag}</code>} />
          <KV k="msg" v={record.alertEvent?.msg} />
          <KV k="timeStamp" v={dayjs(record.alertEvent?.timeStamp).format('YYYY-MM-DD HH:mm:ss')} />
        </Section>

        <Section title="Feature Flag 快照">
          <KV k="key" v={<code>{ffSnap?.key}</code>} />
          <KV k="value" v={<code>{JSON.stringify(ffSnap?.value)}</code>} />
          <KV k="killSwitch" v={ffSnap?.killSwitch ? <Tag color="error">ON</Tag> : <Tag>OFF</Tag>} />
          <KV k="ts" v={dayjs(ffSnap?.ts).format('YYYY-MM-DD HH:mm:ss')} />
        </Section>

        {(record.rejectReason || record.cancelReason) && (
          <Section title="原因">
            {record.rejectReason && <KV k="拒绝原因" v={record.rejectReason} />}
            {record.cancelReason && <KV k="取消原因" v={record.cancelReason} />}
          </Section>
        )}

        {notifiedResults.length > 0 && (
          <Section title={`通知发送结果 (${notifiedResults.length})`}>
            {notifiedResults.map((n, i) => (
              <KV
                key={i}
                k={`${n.channel} → ${n.target}`}
                v={
                  <Space size={4}>
                    {n.success ? <Tag color="success">✓ {dayjs(n.sentAt).format('HH:mm:ss')}</Tag> : <Tag color="error">✗ {n.errorMessage}</Tag>}
                  </Space>
                }
              />
            ))}
          </Section>
        )}
      </Space>
    </Modal>
  )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {title}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
      {children}
    </div>
  </div>
)

const KV: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
    <span style={{ color: '#94a3b8', minWidth: 100 }}>{k}</span>
    <span style={{ flex: 1, color: '#1e293b' }}>{v}</span>
  </div>
)

export default AdminAlertQueue
