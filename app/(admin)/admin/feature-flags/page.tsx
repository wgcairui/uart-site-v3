'use client'
/**
 * admin Feature Flag 配置页 (feat/feature-flag-platform 2026-07-21)
 *
 * 三段式 (PageHeader + PageSummary + BentoTable), 跟 sms/mail/alarm 一致
 *
 * 视觉:
 * - 顶部 4 卡 (总开关 / kill switch 开启 / 启用中 / 过去 24h 修改)
 * - 4 维筛选 (key 模糊 + type + enabled + killSwitch)
 * - Table 8 列: key / description / type / defaultValue / killSwitch / perDeviceOverrides 数 / 启用 / 更新时间
 * - 行内操作: 编辑 / 复制 / 切换 killSwitch (Modal.confirm) / 软删 (Modal.confirm)
 * - 创建/编辑 Modal (Form.useForm + destroyOnHidden)
 *   - perDeviceOverrides: 内嵌 KV 列表 (mac → value + until + note)
 *   - recipients: 3 个 channel 单独 input (email / sms / feishu_bot target)
 *   - severityDurationMap: 仅 key 形如 alert.* 时显示
 *
 * ⚠️ 继承项目约定 (docs/style-guide.md):
 * - 危险操作走 Modal.confirm, 不用 Popconfirm
 * - 'use client' 必加
 * - usePromise().fecth 是项目 typo, 跟着用
 */

import {
  Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { PlusOutlined, ReloadOutlined, CopyOutlined, EditOutlined, DeleteOutlined, PoweroffOutlined } from '@ant-design/icons'
import React, { useEffect, useMemo, useState } from 'react'

import {
  listFeatureFlags, createFeatureFlag, updateFeatureFlag,
  deleteFeatureFlag, duplicateFeatureFlag, setFeatureFlagKillSwitch,
} from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { EmptyState } from '@/components/common/EmptyState'

// server MAX_PAGE_SIZE = 200
const MAX_ITEMS = 200

// ─── 类型选项 (server filters.type 白名单) ──────────────────────────────────
const TYPE_OPTIONS = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
]

// ─── 筛选条件 type ──────────────────────────────────────────────────────────
interface FFFilters {
  key: string
  types: string[]
  enabled: string[]
  killSwitch: string[]
}

const EMPTY_FILTERS: FFFilters = {
  key: '',
  types: [],
  enabled: [],
  killSwitch: [],
}

// ─── 创建/编辑 Form DTO ─────────────────────────────────────────────────────
interface FFFormValues {
  key: string
  description: string
  type: 'string' | 'number' | 'boolean'
  defaultValue: any
  killSwitch: boolean
  killSwitchReason?: string
  enabled: boolean
  perDeviceOverrides: { mac: string; value: any; until?: number; note?: string }[]
  recipients: { email: string; sms: string; feishu_bot: string }
  severityDurationMap: { critical: number; warning: number; info: number }
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const AdminFeatureFlags: React.FC = () => {
  // 筛选 state
  const [filters, setFilters] = useState<FFFilters>(EMPTY_FILTERS)
  const [fetchKey, setFetchKey] = useState(0)

  // 详情/编辑 Modal
  const [editing, setEditing] = useState<{ open: boolean; record: Uart.UartFeatureFlag | null }>({
    open: false,
    record: null,
  })

  // ─── 数据 ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Uart.UartFeatureFlag[]>([])
  const [realTotal, setRealTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const req: Uart.UartFeatureFlagListReq = {
      page: 1,
      pageSize: MAX_ITEMS,
      needTotal: true,
    }
    if (filters.key.trim()) req.search = { key: filters.key.trim() }
    const f: any = {}
    if (filters.types.length) f.type = filters.types
    if (filters.enabled.length) f.enabled = filters.enabled
    if (filters.killSwitch.length) f.killSwitch = filters.killSwitch
    if (Object.keys(f).length) req.filters = f

    listFeatureFlags(req)
      .then((res) => {
        if (cancelled) return
        const d: any = res.data
        const list = Array.isArray(d) ? d : d?.items ?? []
        setItems(Array.isArray(list) ? list : [])
        setRealTotal(d?.pagination?.total ?? list.length ?? 0)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('listFeatureFlags failed', err)
        setItems([])
        setRealTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filters, fetchKey])

  // ─── 派生数据 (顶部 4 卡) ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length
    const killOn = items.filter((i) => i.killSwitch).length
    const enabled = items.filter((i) => i.enabled).length
    // eslint-disable-next-line react-hooks/purity
    const last24h = items.filter((i) => i.updatedAt > Date.now() - 24 * 3600 * 1000).length
    return { total, killOn, enabled, last24h }
  }, [items])

  // ─── 操作 ───────────────────────────────────────────────────────────────
  const triggerFetch = () => setFetchKey((k) => k + 1)

  const openCreate = () => setEditing({ open: true, record: null })

  const openEdit = (record: Uart.UartFeatureFlag) => setEditing({ open: true, record })

  const onDuplicate = (id: string) => {
    duplicateFeatureFlag(id)
      .then((res) => {
        if (res.code) {
          Modal.success({ content: `已复制为: ${(res.data as any)?.key}` })
          triggerFetch()
        } else {
          Modal.error({ content: (res.data as any)?.error || res.message || '复制失败' })
        }
      })
      .catch((err: any) => Modal.error({ content: err?.message || '复制失败' }))
  }

  const onToggleKillSwitch = (record: Uart.UartFeatureFlag) => {
    const next = !record.killSwitch
    Modal.confirm({
      title: next ? '开启 kill switch' : '关闭 kill switch',
      content: (
        <div>
          <div>
            将 {next ? '开启' : '关闭'} <b>{record.key}</b> 的 kill switch
          </div>
          {next && (
            <div style={{ color: '#e84545', marginTop: 8 }}>
              ⚠️ 开启后, 所有依赖此 FF 的代码路径会进入拦截态, 实际效果以 evaluator 行为为准
            </div>
          )}
        </div>
      ),
      okText: next ? '确定开启' : '确定关闭',
      okButtonProps: next ? { danger: true } : {},
      onOk() {
        return setFeatureFlagKillSwitch(record.id, next, next ? 'admin 手动开启' : 'admin 手动关闭')
          .then((res) => {
            if (res.code) {
              triggerFetch()
            } else {
              throw new Error((res.data as any)?.error || res.message || '切换失败')
            }
          })
      },
    })
  }

  const onDelete = (record: Uart.UartFeatureFlag) => {
    Modal.confirm({
      title: '软删 Feature Flag',
      content: (
        <div>
          <div>将 <b>{record.key}</b> 标记为 disabled</div>
          <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>
            软删后 evaluator 会返回 defaultValue=undefined, 不会真删数据
          </div>
        </div>
      ),
      okText: '确定软删',
      okButtonProps: { danger: true },
      onOk() {
        return deleteFeatureFlag(record.id)
          .then((res) => {
            if (res.code) {
              triggerFetch()
            } else {
              throw new Error((res.data as any)?.error || res.message || '软删失败')
            }
          })
      },
    })
  }

  // ─── 表格列 ────────────────────────────────────────────────────────────
  const columns: ColumnsType<Uart.UartFeatureFlag> = [
    {
      title: 'key',
      dataIndex: 'key',
      width: 240,
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <code style={{ fontSize: 12, color: '#1e293b' }}>{v}</code>
          {r.description && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      width: 160,
      ellipsis: true,
      render: (v: any) => (
        <code style={{ fontSize: 12 }}>
          {typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}
        </code>
      ),
    },
    {
      title: 'kill switch',
      dataIndex: 'killSwitch',
      width: 100,
      render: (v: boolean, r) => (
        <Switch
          size="small"
          checked={v}
          onChange={() => onToggleKillSwitch(r)}
        />
      ),
    },
    {
      title: '设备覆盖',
      dataIndex: 'perDeviceOverrides',
      width: 100,
      render: (v: Record<string, any>) => {
        const n = Object.keys(v || {}).length
        return n > 0 ? <Tag color="orange">{n} 台</Tag> : <span style={{ color: '#cbd5e1' }}>—</span>
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => v ? <Tag color="success">ON</Tag> : <Tag>OFF</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
      sorter: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
          {dayjs(v).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_: any, r) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => onDuplicate(r.id)}>
            复制
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(r)}>
            软删
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
        <PageHeader
          title="Feature Flags"
          subtitle="通用特性开关平台 (alert.dispatch.mode 是首个用例)"
          breadcrumb={[{ title: '系统管理' }]}
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={triggerFetch}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新建 Feature Flag
              </Button>
            </Space>
          }
        />

        <PageSummary
          items={[
            { label: '总开关数', value: stats.total, variant: 'primary' },
            { label: 'kill switch 开启', value: stats.killOn, variant: stats.killOn > 0 ? 'danger' : 'info' },
            { label: '启用中', value: stats.enabled, variant: 'success' },
            { label: '过去 24h 修改', value: stats.last24h, variant: 'warning' },
          ]}
        />

        {/* 4 维筛选条 */}
        <div className="bento-card mb-5" style={{ padding: 16 }}>
          <Space wrap size={12}>
            <Input
              placeholder="按 key 模糊搜"
              value={filters.key}
              onChange={(e) => setFilters((f) => ({ ...f, key: e.target.value }))}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              mode="multiple"
              placeholder="类型"
              value={filters.types}
              onChange={(v) => setFilters((f) => ({ ...f, types: v as string[] }))}
              options={TYPE_OPTIONS}
              style={{ minWidth: 140 }}
              maxTagCount="responsive"
            />
            <Select
              mode="multiple"
              placeholder="启用状态"
              value={filters.enabled}
              onChange={(v) => setFilters((f) => ({ ...f, enabled: v as string[] }))}
              options={[{ value: 'true', label: 'ON' }, { value: 'false', label: 'OFF' }]}
              style={{ minWidth: 120 }}
            />
            <Select
              mode="multiple"
              placeholder="kill switch"
              value={filters.killSwitch}
              onChange={(v) => setFilters((f) => ({ ...f, killSwitch: v as string[] }))}
              options={[{ value: 'true', label: '开启' }, { value: 'false', label: '关闭' }]}
              style={{ minWidth: 120 }}
            />
            <Button onClick={() => setFilters(EMPTY_FILTERS)}>清空筛选</Button>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>共 {realTotal} 条</span>
          </Space>
        </div>

        {/* 主 Table */}
        <div className="bento-card" style={{ padding: 16 }}>
          {items.length === 0 && !loading ? (
            <EmptyState description="暂无 Feature Flag, 点击右上角新建" />
          ) : (
            <Table<Uart.UartFeatureFlag>
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={loading}
              size="middle"
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 1100 }}
            />
          )}
        </div>
      </div>

      {/* 创建/编辑 Modal */}
      <FFEditModal
        open={editing.open}
        record={editing.record}
        onClose={() => setEditing({ open: false, record: null })}
        onSaved={() => {
          setEditing({ open: false, record: null })
          triggerFetch()
        }}
      />
    </main>
  )
}

// ─── 创建/编辑 Modal 子组件 ──────────────────────────────────────────────

interface FFEditModalProps {
  open: boolean
  record: Uart.UartFeatureFlag | null
  onClose: () => void
  onSaved: () => void
}

const FFEditModal: React.FC<FFEditModalProps> = ({ open, record, onClose, onSaved }) => {
  const isEdit = !!record
  const [form] = Form.useForm<FFFormValues>()
  const [submitting, setSubmitting] = useState(false)

  // 初始化 form (Phase 6 B1: 先 resetFields 再 setFieldsValue, 避免切换 record 时残留旧值)
  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (record) {
      const overrides = Object.entries(record.perDeviceOverrides || {}).map(([mac, v]) => ({
        mac,
        value: typeof v === 'object' && 'value' in v ? v.value : v,
        until: (v as any)?.until,
        note: (v as any)?.note,
      }))
      form.setFieldsValue({
        key: record.key,
        description: record.description,
        type: record.type,
        defaultValue: record.defaultValue,
        killSwitch: record.killSwitch,
        killSwitchReason: record.killSwitchReason,
        enabled: record.enabled,
        perDeviceOverrides: overrides,
        recipients: {
          email: record.recipients?.find((r) => r.channel === 'email')?.target || '',
          sms: record.recipients?.find((r) => r.channel === 'sms')?.target || '',
          feishu_bot: record.recipients?.find((r) => r.channel === 'feishu_bot')?.target || '',
        },
        severityDurationMap: record.severityDurationMap || { critical: 0, warning: 300000, info: 1800000 },
      } as any)
    } else {
      form.setFieldsValue({
        type: 'string',
        enabled: true,
        killSwitch: false,
        perDeviceOverrides: [],
        recipients: { email: '', sms: '', feishu_bot: '' },
        severityDurationMap: { critical: 0, warning: 300000, info: 1800000 },
      } as any)
    }
  }, [open, record, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 组装 recipients
      const recipients: Uart.UartApprovalRecipient[] = []
      if (values.recipients?.email) recipients.push({ channel: 'email', target: values.recipients.email, enabled: true })
      if (values.recipients?.sms) recipients.push({ channel: 'sms', target: values.recipients.sms, enabled: true })
      if (values.recipients?.feishu_bot) recipients.push({ channel: 'feishu_bot', target: values.recipients.feishu_bot, enabled: true })

      // 组装 perDeviceOverrides (mac → { value, until, note })
      const perDeviceOverrides: Record<string, any> = {}
      for (const o of values.perDeviceOverrides || []) {
        if (o.mac) {
          perDeviceOverrides[o.mac] = { value: o.value, until: o.until, note: o.note }
        }
      }

      if (isEdit && record) {
        const dto = {
          description: values.description,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          killSwitchReason: values.killSwitchReason,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        } as Uart.UartFeatureFlagUpdateDto
        // 仅 alert.* key 显示 severityDurationMap
        if (record.key.startsWith('alert.')) {
          (dto as any).severityDurationMap = values.severityDurationMap
        }
        await updateFeatureFlag(record.id, dto)
      } else {
        const dto = {
          key: values.key,
          description: values.description,
          type: values.type,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          killSwitchReason: values.killSwitchReason,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        } as Uart.UartFeatureFlagCreateDto
        if (values.key?.startsWith('alert.')) {
          (dto as any).severityDurationMap = values.severityDurationMap
        }
        await createFeatureFlag(dto)
      }

      Modal.success({ content: isEdit ? '更新成功' : '创建成功' })
      onSaved()
    } catch (err: any) {
      if (err?.errorFields) return // antd 自动展示校验错误
      Modal.error({ content: err?.message || '操作失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `编辑 Feature Flag: ${record?.key}` : '新建 Feature Flag'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="middle">
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item
            label="key"
            name="key"
            rules={[
              { required: true, message: '必填' },
              { pattern: /^[a-z][a-z0-9.-]{1,63}$/, message: '小写字母开头, 小写字母/数字/./-, 2-64 字符' },
            ]}
            style={{ flex: 1, marginBottom: 16 }}
          >
            <Input placeholder="如 alert.dispatch.mode" disabled={isEdit} />
          </Form.Item>
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true }]}
            style={{ width: 140, marginBottom: 16, marginLeft: 8 }}
          >
            <Select options={TYPE_OPTIONS} disabled={isEdit} />
          </Form.Item>
        </Space.Compact>

        <Form.Item
          label="描述"
          name="description"
          rules={[{ required: true, message: '必填' }]}
          style={{ marginBottom: 16 }}
        >
          <Input placeholder="human-readable 说明" />
        </Form.Item>

        <Form.Item
          label="默认值"
          name="defaultValue"
          rules={[{ required: true, message: '必填' }]}
          style={{ marginBottom: 16 }}
          dependencies={['type']}
        >
          {({ getFieldValue }) => {
            const type = getFieldValue('type') as 'string' | 'number' | 'boolean'
            if (type === 'boolean') return <Select options={[{ value: true, label: 'true' }, { value: false, label: 'false' }]} />
            if (type === 'number') return <InputNumber style={{ width: '100%' }} />
            return <Input placeholder="string 默认值" />
          }}
        </Form.Item>

        <Space size={24} style={{ marginBottom: 16 }}>
          <Form.Item label="启用" name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
          <Form.Item label="kill switch" name="killSwitch" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item
          label="kill switch 原因"
          name="killSwitchReason"
          style={{ marginBottom: 16 }}
        >
          <Input placeholder="审计用" />
        </Form.Item>

        {/* per-device overrides */}
        <Form.List name="perDeviceOverrides">
          {(fields, { add, remove }) => (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
                设备覆盖 (per-device overrides)
              </div>
              {fields.map(({ key: fk, name: fname }) => (
                <Space key={fk} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item name={[fname, 'mac']} style={{ marginBottom: 0 }}>
                    <Input placeholder="mac 地址" style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item name={[fname, 'value']} style={{ marginBottom: 0 }}>
                    <Input placeholder="值" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item name={[fname, 'until']} style={{ marginBottom: 0 }}>
                    <InputNumber
                      placeholder="过期时间 (ms)"
                      style={{ width: 160 }}
                    />
                  </Form.Item>
                  <Form.Item name={[fname, 'note']} style={{ marginBottom: 0 }}>
                    <Input placeholder="备注" style={{ width: 160 }} />
                  </Form.Item>
                  <Button danger size="small" onClick={() => remove(fname)}>删除</Button>
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ mac: '', value: '' })} block icon={<PlusOutlined />}>
                添加设备覆盖
              </Button>
            </div>
          )}
        </Form.List>

        {/* recipients (3 channel) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
            审批通知接收方 (留空表示不通知)
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name={['recipients', 'email']} style={{ marginBottom: 0, flex: 1 }}>
              <Input addonBefore="📧 Email" placeholder="admin@example.com" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Form.Item name={['recipients', 'sms']} style={{ marginBottom: 0, flex: 1 }}>
              <Input addonBefore="📱 SMS" placeholder="13800138000" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Form.Item name={['recipients', 'feishu_bot']} style={{ marginBottom: 0, flex: 1 }}>
              <Input addonBefore="🤖 Feishu" placeholder="chat_id 或 webhook" />
            </Form.Item>
          </Space.Compact>
        </div>

        {/* severityDurationMap (仅 alert.*) */}
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.key !== curr.key}
        >
          {({ getFieldValue }) => {
            const k = getFieldValue('key') || ''
            if (!k.startsWith('alert.')) return null
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
                  告警等级延时 (delayed_auto 模式下, 仅 alert.* 显示)
                </div>
                <Space>
                  <Form.Item name={['severityDurationMap', 'critical']} style={{ marginBottom: 0 }}>
                    <InputNumber addonBefore="critical" placeholder="ms" style={{ width: 180 }} />
                  </Form.Item>
                  <Form.Item name={['severityDurationMap', 'warning']} style={{ marginBottom: 0 }}>
                    <InputNumber addonBefore="warning" placeholder="ms" style={{ width: 180 }} />
                  </Form.Item>
                  <Form.Item name={['severityDurationMap', 'info']} style={{ marginBottom: 0 }}>
                    <InputNumber addonBefore="info" placeholder="ms" style={{ width: 180 }} />
                  </Form.Item>
                </Space>
              </div>
            )
          }}
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AdminFeatureFlags
