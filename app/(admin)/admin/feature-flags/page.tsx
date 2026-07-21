'use client'
/**
 * admin 特性开关 (Feature Flags) 配置页 - v3 通用版 (2026-07-22)
 *
 * == 设计原则 ==
 * 本页是通用特性开关管理平台, 跟告警解耦 (告警只是 FF 的一个用例).
 * 用户进来要做的事:
 *   1. 看现有什么开关
 *   2. 创建/编辑一个开关 (普通用户场景)
 *   3. 紧急熔断某个开关
 *   4. 看不懂时点 "使用说明" 弹窗
 *
 * == 视觉层级 ==
 * 1. PageHeader: 标题 + 右上 [使用说明] [刷新] [新建开关]
 * 2. 4 统计卡: 总数 / 启用 / 熔断 / 24h 修改
 * 3. 筛选条 (3 维, 紧凑)
 * 4. 主表格: key / 描述 / 类型 / 当前值 / 状态(启用+熔断) / 修改人 / 时间 / 操作
 *
 * == 弹窗 ==
 * - 使用说明: 介绍 FF 概念 + 字段含义 + 使用流程 (5 步)
 * - 创建/编辑: 4 Tab 分组 — 基础 / 覆盖 / 通知 / 高级
 *
 * == 项目约定 ==
 * - 'use client' 必加
 * - Modal.confirm 不用 Popconfirm
 * - destroyOnHidden + Form.useForm + onOk validateFields
 * - DTO 字段名权威源: types/uart.d.ts
 */

import {
  Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, message, Tabs,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  PlusOutlined, ReloadOutlined, CopyOutlined, EditOutlined, DeleteOutlined,
  QuestionCircleOutlined, ExclamationCircleOutlined, BookOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState, useCallback } from 'react'

import {
  listFeatureFlags, createFeatureFlag, updateFeatureFlag,
  deleteFeatureFlag, duplicateFeatureFlag, setFeatureFlagKillSwitch,
} from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { BentoCard } from '@/components/common/BentoCard'

const MAX_ITEMS = 200

const TYPE_OPTIONS = [
  { value: 'string', label: '字符串', desc: '任意文本值' },
  { value: 'number', label: '数字', desc: '整数或浮点' },
  { value: 'boolean', label: '布尔', desc: 'true / false' },
]

// ─── 筛选 ──────────────────────────────────────────────────
interface FFFilters {
  search: string
  types: string[]
  status: string[]
}

const EMPTY_FILTERS: FFFilters = {
  search: '',
  types: [],
  status: [],
}

// ─── Form DTO ──────────────────────────────────────────────
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

// ─── 主页面 ────────────────────────────────────────────────

export const AdminFeatureFlags: React.FC = () => {
  const [filters, setFilters] = useState<FFFilters>(EMPTY_FILTERS)
  const [fetchKey, setFetchKey] = useState(0)
  const [items, setItems] = useState<Uart.UartFeatureFlag[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ open: boolean; record: Uart.UartFeatureFlag | null }>({ open: false, record: null })
  const [helpOpen, setHelpOpen] = useState(false)

  // ─── 加载 ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listFeatureFlags({ page: 1, pageSize: MAX_ITEMS, needTotal: true })
      .then((res) => {
        if (cancelled) return
        const d: any = res.data
        const list = Array.isArray(d) ? d : d?.items ?? []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('listFeatureFlags failed', err)
        setItems([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

  const triggerFetch = useCallback(() => setFetchKey(k => k + 1), [])

  // ─── 筛选逻辑 (本地, 表格渲染前过滤) ───────────────────
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!it.key.toLowerCase().includes(q) && !(it.description || '').toLowerCase().includes(q)) return false
      }
      if (filters.types.length && !filters.types.includes(it.type)) return false
      if (filters.status.length) {
        const status = it.killSwitch ? 'kill' : (it.enabled ? 'on' : 'off')
        if (!filters.status.includes(status)) return false
      }
      return true
    })
  }, [items, filters])

  // ─── 统计 ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: items.length,
    enabled: items.filter(i => i.enabled && !i.killSwitch).length,
    killOn: items.filter(i => i.killSwitch).length,
    last24h: items.filter(i => i.updatedAt > Date.now() - 24 * 3600 * 1000).length,
  }), [items])

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
        <PageHeader
          title="特性开关 (Feature Flags)"
          subtitle="远程控制系统行为的通用开关平台 · 支持布尔/数字/字符串 · 设备维度覆盖 · 紧急熔断"
          breadcrumb={[{ title: '系统管理' }]}
          extra={
            <Space>
              <Button icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)}>
                使用说明
              </Button>
              <Button icon={<ReloadOutlined />} onClick={triggerFetch}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ open: true, record: null })}>
                新建开关
              </Button>
            </Space>
          }
        />

        <PageSummary
          items={[
            { label: '总开关数', value: stats.total, variant: 'primary' },
            { label: '启用中', value: stats.enabled, variant: 'success' },
            { label: '熔断中', value: stats.killOn, variant: stats.killOn > 0 ? 'danger' : 'info' },
            { label: '24h 修改', value: stats.last24h, variant: 'warning' },
          ]}
        />

        {/* ═══ 筛选条 ═══ */}
        <BentoCard padding="sm" className="mb-5">
          <Space wrap size={12} style={{ width: '100%' }}>
            <Input
              placeholder="按 key 或描述搜索"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              mode="multiple"
              placeholder="类型"
              value={filters.types}
              onChange={(v) => setFilters(f => ({ ...f, types: v as string[] }))}
              options={TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              style={{ minWidth: 130 }}
              maxTagCount="responsive"
            />
            <Select
              mode="multiple"
              placeholder="状态"
              value={filters.status}
              onChange={(v) => setFilters(f => ({ ...f, status: v as string[] }))}
              options={[
                { value: 'on', label: '✅ 启用' },
                { value: 'off', label: '⏸️ 禁用' },
                { value: 'kill', label: '🔴 熔断' },
              ]}
              style={{ minWidth: 160 }}
            />
            <Button onClick={() => setFilters(EMPTY_FILTERS)}>清空筛选</Button>
            <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 'auto' }}>
              共 {filteredItems.length} / {items.length} 条
            </span>
          </Space>
        </BentoCard>

        {/* ═══ 主表格 ═══ */}
        <BentoCard padding="md">
          <Table<Uart.UartFeatureFlag>
            rowKey="id"
            columns={makeColumns({ onEdit: (r) => setEditing({ open: true, record: r }), onRefresh: triggerFetch })}
            dataSource={filteredItems}
            loading={loading}
            size="middle"
            pagination={filteredItems.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            scroll={{ x: 1100 }}
            locale={{ emptyText: items.length === 0 ? '暂无开关, 点击右上角"新建开关"创建' : '没有匹配的开关' }}
          />
        </BentoCard>
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

      {/* 使用说明 Modal */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  )
}

export default AdminFeatureFlags

// ═══════════════════════════════════════════════════════════════
//  表格列定义
// ═══════════════════════════════════════════════════════════════

function makeColumns(opts: { onEdit: (r: Uart.UartFeatureFlag) => void; onRefresh: () => void }): ColumnsType<Uart.UartFeatureFlag> {
  const { onEdit, onRefresh } = opts

  const handleKillSwitch = (record: Uart.UartFeatureFlag) => {
    const next = !record.killSwitch
    Modal.confirm({
      title: next ? `开启 ${record.key} 的熔断?` : `关闭 ${record.key} 的熔断?`,
      icon: next ? <ExclamationCircleOutlined /> : undefined,
      content: (
        <div>
          <div>将 {next ? '开启' : '关闭'} <b>{record.key}</b> 的熔断</div>
          {next && (
            <div style={{ color: '#e84545', marginTop: 8, fontSize: 12 }}>
              ⚠️ 熔断开启后, 任何依赖此开关的代码路径将返回兜底值, 直到手动关闭
            </div>
          )}
        </div>
      ),
      okText: next ? '确认开启熔断' : '确认关闭',
      okButtonProps: next ? { danger: true } : {},
      onOk() {
        return setFeatureFlagKillSwitch(record.id, next, next ? 'admin 手动开启' : 'admin 手动关闭')
          .then((res) => {
            if (res.code) onRefresh()
            else throw new Error((res.data as any)?.error || '切换失败')
          })
      },
    })
  }

  const handleDelete = (record: Uart.UartFeatureFlag) => {
    Modal.confirm({
      title: '软删开关',
      content: (
        <div>
          <div>将 <b>{record.key}</b> 标记为禁用 (软删)</div>
          <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>
            软删后 evaluator 返回 defaultValue=undefined, 数据保留可恢复
          </div>
        </div>
      ),
      okText: '确认软删',
      okButtonProps: { danger: true },
      onOk() {
        return deleteFeatureFlag(record.id)
          .then((res) => { if (res.code) onRefresh() })
      },
    })
  }

  const handleDuplicate = (id: string) => {
    duplicateFeatureFlag(id)
      .then((res) => {
        if (res.code) {
          message.success(`已复制为: ${(res.data as any)?.key}`)
          onRefresh()
        } else {
          message.error((res.data as any)?.error || res.message || '复制失败')
        }
      })
      .catch((err: any) => message.error(err?.message || '复制失败'))
  }

  return [
    {
      title: 'key',
      dataIndex: 'key',
      width: 240,
      fixed: 'left',
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <code style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{v}</code>
          {r.description && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.description}</span>}
        </Space>
      ),
    },
    {
      title: '类型', dataIndex: 'type', width: 70,
      render: (v: string) => <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: '当前值', dataIndex: 'defaultValue', width: 140, ellipsis: true,
      render: (v: any) => <code style={{ fontSize: 12, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}</code>,
    },
    {
      title: '状态', dataIndex: 'enabled', width: 110,
      render: (_: boolean, r) => {
        if (r.killSwitch) return <Tag color="error" style={{ fontSize: 11 }}>🔴 熔断中</Tag>
        if (r.enabled) return <Tag color="success" style={{ fontSize: 11 }}>✅ 启用</Tag>
        return <Tag style={{ fontSize: 11 }}>⏸️ 禁用</Tag>
      },
    },
    {
      title: '设备覆盖', dataIndex: 'perDeviceOverrides', width: 90,
      render: (v: Record<string, any>) => {
        const n = Object.keys(v || {}).length
        return n > 0 ? <Tag color="orange" style={{ fontSize: 11 }}>{n} 台</Tag> : <span style={{ color: '#cbd5e1' }}>—</span>
      },
    },
    {
      title: '修改人', dataIndex: 'updatedBy', width: 100,
      render: (v: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span>,
    },
    {
      title: '更新时间', dataIndex: 'updatedAt', width: 140,
      sorter: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{dayjs(v).format('MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '操作', width: 200, fixed: 'right',
      render: (_: any, r) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)}>复制</Button>
          <Button
            type="link" size="small"
            danger={!r.killSwitch}
            icon={r.killSwitch ? <ExclamationCircleOutlined /> : undefined}
            onClick={() => handleKillSwitch(r)}
          >
            {r.killSwitch ? '解熔断' : '熔断'}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
            软删
          </Button>
        </Space>
      ),
    },
  ]
}

// ═══════════════════════════════════════════════════════════════
//  使用说明弹窗
// ═══════════════════════════════════════════════════════════════

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => (
  <Modal
    open={open}
    onCancel={onClose}
    footer={[<Button key="ok" type="primary" onClick={onClose}>明白了</Button>]}
    width={720}
    title={
      <Space>
        <BookOutlined style={{ color: '#7c3aed' }} />
        <span>特性开关使用说明</span>
      </Space>
    }
  >
    <div style={{ lineHeight: 1.7, fontSize: 13 }}>
      {/* 概念 */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📌 什么是特性开关?</h3>
        <p style={{ color: '#475569' }}>
          特性开关 (Feature Flag) 是一种<strong>远程控制代码行为</strong>的开关, 无需重新部署就能开启/关闭某项功能,
          或调整运行时参数 (如告警模式、超时阈值)。常用于灰度发布、紧急回滚、A/B 测试等场景。
        </p>
      </section>

      {/* 字段 */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🔑 字段含义</h3>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, color: '#334155' }}>
          <div><strong>key</strong>: 开关唯一标识, 代码中通过 key 读取值 (例: <code>ui.new_dashboard</code>)</div>
          <div style={{ marginTop: 6 }}><strong>类型</strong>: string / number / boolean, 决定代码侧取值方式</div>
          <div style={{ marginTop: 6 }}><strong>当前值</strong>: 默认值, 代码拿不到覆盖时使用</div>
          <div style={{ marginTop: 6 }}><strong>设备覆盖</strong>: 针对单个 MAC 地址的值覆盖, 可设置过期时间</div>
          <div style={{ marginTop: 6 }}><strong>熔断 (kill switch)</strong>: 紧急停止, 触发后代码侧拿兜底值</div>
          <div style={{ marginTop: 6 }}><strong>通知接收方</strong>: 审批/熔断事件通知的 email/sms/feishu 目标</div>
        </div>
      </section>

      {/* 状态机 */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🔄 三种状态</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>✅ 启用</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>代码读 defaultValue, 或设备覆盖值</div>
          </div>
          <div style={{ padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: '#64748b', fontSize: 13 }}>⏸️ 禁用</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>软删, evaluator 返回 undefined</div>
          </div>
          <div style={{ padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13 }}>🔴 熔断</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>紧急拦截, 优先级最高</div>
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🛠️ 使用流程 (5 步)</h3>
        <ol style={{ paddingLeft: 20, color: '#475569' }}>
          <li style={{ marginBottom: 6 }}>
            <strong>代码中读取</strong>: 后端代码用 evaluator 拿值, 例 <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 3 }}>evaluator.evaluate('ui.new_dashboard', {`{mac}`})</code>
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>创建开关</strong>: 点"新建开关", 填 key/类型/默认值/描述, 选填设备覆盖/通知接收方
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>启用</strong>: 列表里点"启用" (或编辑时打开 enabled)
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>调整</strong>: 需要改值时点"编辑"; 紧急情况点"熔断"
          </li>
          <li>
            <strong>停用</strong>: 长期不用点"软删" (enabled=false, 不真删数据)
          </li>
        </ol>
      </section>

      {/* 告警 FF 例子 */}
      <section style={{ marginTop: 20, padding: 12, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>💡 典型用例</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          告警系统: <code>alert.dispatch.mode</code> = "auto" | "manual" | "delayed_auto", 控制告警发送方式;
          <br />
          新功能灰度: <code>ui.new_dashboard</code> = true, 给 10% 设备开放测试;
          <br />
          紧急熔断: <code>feature.x</code> 突然出问题, 点"熔断"按钮秒级关闭。
        </div>
      </section>
    </div>
  </Modal>
)

// ═══════════════════════════════════════════════════════════════
//  创建/编辑 Modal (Tab 分组)
// ═══════════════════════════════════════════════════════════════

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
  const watchType = Form.useWatch('type', form)
  const watchKey = Form.useWatch('key', form)

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

      const recipients: Uart.UartApprovalRecipient[] = []
      if (values.recipients?.email) recipients.push({ channel: 'email', target: values.recipients.email, enabled: true })
      if (values.recipients?.sms) recipients.push({ channel: 'sms', target: values.recipients.sms, enabled: true })
      if (values.recipients?.feishu_bot) recipients.push({ channel: 'feishu_bot', target: values.recipients.feishu_bot, enabled: true })

      const perDeviceOverrides: Record<string, any> = {}
      for (const o of values.perDeviceOverrides || []) {
        if (o.mac) perDeviceOverrides[o.mac] = { value: o.value, until: o.until, note: o.note }
      }

      if (isEdit && record) {
        const dto: any = {
          description: values.description,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          killSwitchReason: values.killSwitchReason,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        }
        if (record.key.startsWith('alert.')) dto.severityDurationMap = values.severityDurationMap
        await updateFeatureFlag(record.id, dto)
      } else {
        const dto: any = {
          key: values.key,
          description: values.description,
          type: values.type,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          killSwitchReason: values.killSwitchReason,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        }
        if (values.key?.startsWith('alert.')) dto.severityDurationMap = values.severityDurationMap
        await createFeatureFlag(dto)
      }

      message.success(isEdit ? '更新成功' : '创建成功')
      onSaved()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `编辑开关: ${record?.key}` : '新建开关'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      width={720}
      destroyOnHidden
      okText={isEdit ? '保存' : '创建'}
    >
      <Form form={form} layout="vertical" size="middle" preserve={false}>
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: <span><span style={{ marginRight: 4 }}>📋</span>基础</span>,
              children: (
                <>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 12, color: '#475569', marginBottom: 16 }}>
                    💡 必填项: key / 描述 / 类型 / 默认值
                  </div>
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item
                      label="key (唯一标识)"
                      name="key"
                      rules={[
                        { required: true, message: '必填' },
                        { pattern: /^[a-z][a-z0-9.-]{1,63}$/, message: '小写字母开头, 允许 a-z / 0-9 / . / -, 2-64 字符' },
                      ]}
                      style={{ flex: 1, marginBottom: 16 }}
                    >
                      <Input placeholder="例: ui.new_dashboard, alert.dispatch.mode" disabled={isEdit} />
                    </Form.Item>
                    <Form.Item
                      label="类型"
                      name="type"
                      rules={[{ required: true }]}
                      style={{ width: 130, marginBottom: 16, marginLeft: 8 }}
                    >
                      <Select options={TYPE_OPTIONS} disabled={isEdit} />
                    </Form.Item>
                  </Space.Compact>

                  <Form.Item label="描述 (代码中可读)" name="description" rules={[{ required: true, message: '必填' }]} style={{ marginBottom: 16 }}>
                    <Input placeholder="说明这个开关控制什么, 如「控制新版本仪表盘是否启用」" />
                  </Form.Item>

                  <Form.Item
                    label={watchType === 'boolean' ? '默认值' : '默认值'}
                    name="defaultValue"
                    rules={[{ required: true, message: '必填' }]}
                    style={{ marginBottom: 16 }}
                    extra={watchType === 'string' ? '代码侧读到的字符串' : watchType === 'number' ? '代码侧读到的数字' : '代码侧读到的布尔值'}
                  >
                    {watchType === 'boolean' ? (
                      <Select options={[{ value: true, label: 'true' }, { value: false, label: 'false' }]} />
                    ) : watchType === 'number' ? (
                      <InputNumber style={{ width: '100%' }} placeholder="0" />
                    ) : (
                      <Input placeholder="例: auto" />
                    )}
                  </Form.Item>

                  <Space size={24} style={{ marginBottom: 4 }}>
                    <Form.Item
                      label={<span>启用 <Tag color="default" style={{ fontSize: 10, marginLeft: 4 }}>enabled</Tag></span>}
                      name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}
                      extra="禁用 = 软删, evaluator 返回 undefined"
                    >
                      <Switch />
                    </Form.Item>
                  </Space>
                </>
              ),
            },
            {
              key: 'override',
              label: <span><span style={{ marginRight: 4 }}>📱</span>设备覆盖 (可选)</span>,
              children: (
                <>
                  <div style={{ background: '#f0f9ff', padding: 10, borderRadius: 6, fontSize: 12, color: '#475569', marginBottom: 16 }}>
                    💡 针对单个设备 (MAC 地址) 覆盖默认值. 可设置过期时间, 适合灰度发布.
                  </div>
                  <Form.List name="perDeviceOverrides">
                    {(fields, { add, remove }) => (
                      <div style={{ marginBottom: 8 }}>
                        {fields.map(({ key: fk, name: fname }) => (
                          <Space key={fk} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                            <Form.Item name={[fname, 'mac']} style={{ marginBottom: 0 }}>
                              <Input placeholder="MAC 地址 (12 位)" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item name={[fname, 'value']} style={{ marginBottom: 0 }}>
                              <Input placeholder="覆盖值" style={{ width: 130 }} />
                            </Form.Item>
                            <Form.Item name={[fname, 'until']} style={{ marginBottom: 0 }}>
                              <InputNumber placeholder="过期 (ms, 选填)" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item name={[fname, 'note']} style={{ marginBottom: 0 }}>
                              <Input placeholder="备注" style={{ width: 130 }} />
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
                </>
              ),
            },
            {
              key: 'notify',
              label: <span><span style={{ marginRight: 4 }}>📬</span>通知 (可选)</span>,
              children: (
                <>
                  <div style={{ background: '#faf5ff', padding: 10, borderRadius: 6, fontSize: 12, color: '#475569', marginBottom: 16 }}>
                    💡 审批/熔断事件通知的接收方. 留空不通知. 多个 channel 可同时配置.
                  </div>
                  <Form.Item name={['recipients', 'email']} style={{ marginBottom: 12 }}>
                    <Input addonBefore="📧 Email" placeholder="admin@example.com" />
                  </Form.Item>
                  <Form.Item name={['recipients', 'sms']} style={{ marginBottom: 12 }}>
                    <Input addonBefore="📱 SMS" placeholder="13800138000" />
                  </Form.Item>
                  <Form.Item name={['recipients', 'feishu_bot']} style={{ marginBottom: 0 }}>
                    <Input addonBefore="🤖 飞书" placeholder="chat_id 或 webhook URL" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'advanced',
              label: <span><span style={{ marginRight: 4 }}>🔴</span>高级</span>,
              children: (
                <>
                  <div style={{ background: '#fef2f2', padding: 10, borderRadius: 6, fontSize: 12, color: '#475569', marginBottom: 16 }}>
                    ⚠️ 熔断开启后, 所有依赖此开关的代码路径立即进入拦截态, 直到手动关闭. 仅紧急情况使用.
                  </div>
                  <Form.Item label="熔断 (kill switch)" name="killSwitch" valuePropName="checked" style={{ marginBottom: 16 }}>
                    <Switch />
                  </Form.Item>
                  <Form.Item label="熔断原因" name="killSwitchReason" style={{ marginBottom: 16 }}>
                    <Input placeholder="审计用, 如「线上事故临时关闭」" />
                  </Form.Item>
                  {watchKey?.startsWith('alert.') && (
                    <>
                      <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 8 }}>
                        💡 告警专用: key 以 <code>alert.</code> 开头时显示延时配置
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>告警等级延时 (ms, delayed_auto 模式下生效)</div>
                      <Space>
                        <Form.Item name={['severityDurationMap', 'critical']} style={{ marginBottom: 0 }}>
                          <InputNumber addonBefore="critical" placeholder="ms" style={{ width: 170 }} />
                        </Form.Item>
                        <Form.Item name={['severityDurationMap', 'warning']} style={{ marginBottom: 0 }}>
                          <InputNumber addonBefore="warning" placeholder="ms" style={{ width: 170 }} />
                        </Form.Item>
                        <Form.Item name={['severityDurationMap', 'info']} style={{ marginBottom: 0 }}>
                          <InputNumber addonBefore="info" placeholder="ms" style={{ width: 170 }} />
                        </Form.Item>
                      </Space>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  )
}
