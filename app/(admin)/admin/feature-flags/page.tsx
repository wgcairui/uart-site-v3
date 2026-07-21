'use client'
/**
 * admin 特性开关 (Feature Flags) 页 - v2 重新设计 (2026-07-21)
 *
 * == 设计思路 ==
 * 用户不是来"管理 Feature Flag"的, 是来控制"告警怎么发"的.
 * 所以把 pre-define 的 2 个告警策略 FF 做成直观的策略卡片,
 * 底层操作 (全部开关一览 + 新建/编辑/复制/软删) 放底部.
 *
 * == 视觉层级 ==
 * 1. PageHeader: 告警调度策略 → 副标题说明
 * 2. 4 统计卡: 概览
 * 3. 左卡(告警发送模式) + 右卡(紧急熔断) — 并排, 核心操作
 * 4. 通知接收方 — 横向通栏
 * 5. 全部开关一览 — 紧凑表格, 含编辑/复制/软删/熔断切换
 *
 * == 项目约定 ==
 * - 'use client' 必加
 * - Modal.confirm 不用 Popconfirm
 * - usePromise.fecth 跟着项目 typo 走
 * - 只改 UI 不改 API / DTO
 */

import {
  Button, Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Table, Tag, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  PlusOutlined, ReloadOutlined, CopyOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState, useCallback } from 'react'

import {
  listFeatureFlags, createFeatureFlag, updateFeatureFlag,
  deleteFeatureFlag, duplicateFeatureFlag, setFeatureFlagKillSwitch,
} from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { BentoCard } from '@/components/common/BentoCard'
import { EmptyState } from '@/components/common/EmptyState'

// server MAX_PAGE_SIZE = 200
const MAX_ITEMS = 200

const TYPE_OPTIONS = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
]

// 告警发送模式选项
const MODE_OPTIONS = [
  { value: 'auto', label: '自动发送', desc: '告警生成后立即发送, 无需审批', icon: '🚀' },
  { value: 'manual', label: '人工审批', desc: '告警进入审批队列, 需管理员批准', icon: '✅' },
  { value: 'delayed_auto', label: '延时自动', desc: '告警进入队列, 超时自动发送', icon: '⏱️' },
]

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

// ─── 预置 FF key ─────────────────────────────────────────
const KEY_ALERT_MODE = 'alert.dispatch.mode'
const KEY_ALERT_KILL = 'alert.dispatch.kill_switch'

// ─── 主页面 ──────────────────────────────────────────────

export const AdminFeatureFlags: React.FC = () => {
  const [fetchKey, setFetchKey] = useState(0)
  const [items, setItems] = useState<Uart.UartFeatureFlag[]>([])
  const [loading, setLoading] = useState(false)

  // 编辑 Modal
  const [editing, setEditing] = useState<{ open: boolean; record: Uart.UartFeatureFlag | null }>({
    open: false, record: null,
  })

  // ─── 数据 ──────────────────────────────────────────────
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

  // 拆出预置策略 FF
  const modeFF = useMemo(() => items.find(i => i.key === KEY_ALERT_MODE), [items])
  const killFF = useMemo(() => items.find(i => i.key === KEY_ALERT_KILL), [items])
  const otherFFs = useMemo(
    () => items.filter(i => i.key !== KEY_ALERT_MODE && i.key !== KEY_ALERT_KILL),
    [items],
  )

  // ─── 统计 ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: items.length,
    enabled: items.filter(i => i.enabled).length,
    killOn: items.filter(i => i.killSwitch).length,
    last24h: items.filter(i => i.updatedAt > Date.now() - 24 * 3600 * 1000).length,
  }), [items])

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
        <PageHeader
          title="特性开关"
          subtitle="远程控制告警发送策略和系统行为 · 预置 2 项告警策略, 开箱即用"
          breadcrumb={[{ title: '系统管理' }]}
          extra={
            <Space>
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
            { label: '熔断开启', value: stats.killOn, variant: stats.killOn > 0 ? 'danger' : 'info' },
            { label: '24h 修改', value: stats.last24h, variant: 'warning' },
          ]}
        />

        {/* ═══ 告警策略卡片 (并排) ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <BentoCard padding="lg" variant="default">
            <AlertModeCard ff={modeFF} onSaved={triggerFetch} />
          </BentoCard>
          <BentoCard padding="lg" variant="default">
            <KillSwitchCard ff={killFF} onSaved={triggerFetch} />
          </BentoCard>
        </div>

        {/* ═══ 通知接收方 ═══ */}
        <BentoCard padding="lg" variant="default" style={{ marginBottom: 24 }}>
          <RecipientsCard ff={modeFF} killFF={killFF} onSaved={triggerFetch} />
        </BentoCard>

        {/* ═══ 全部开关一览 ═══ */}
        <BentoCard padding="lg" variant="default">
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>全部开关一览</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                包含预置策略和自定义开关 · 共 {items.length} 项
              </div>
            </div>
          </div>

          <Table<Uart.UartFeatureFlag>
            rowKey="id"
            columns={makeColumns({ onEdit: (r) => setEditing({ open: true, record: r }), onRefresh: triggerFetch })}
            dataSource={items}
            loading={loading}
            size="middle"
            pagination={items.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
            scroll={{ x: 960 }}
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
    </main>
  )
}

export default AdminFeatureFlags

// ═══════════════════════════════════════════════════════════════
//  策略卡片 1: 告警发送模式
// ═══════════════════════════════════════════════════════════════

interface AlertModeCardProps {
  ff: Uart.UartFeatureFlag | undefined
  onSaved: () => void
}

const AlertModeCard: React.FC<AlertModeCardProps> = ({ ff, onSaved }) => {
  const [mode, setMode] = useState<string>('auto')
  const [severityMap, setSeverityMap] = useState({ critical: 0, warning: 300000, info: 1800000 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ff) {
      setMode(String(ff.defaultValue ?? 'auto'))
      setSeverityMap(ff.severityDurationMap ?? { critical: 0, warning: 300000, info: 1800000 })
    }
  }, [ff])

  const handleSave = async () => {
    if (!ff?.id) { message.warning('策略数据加载中, 请稍后'); return }
    setSaving(true)
    try {
      const dto: Uart.UartFeatureFlagUpdateDto = {
        defaultValue: mode,
        ...(mode === 'delayed_auto' ? { severityDurationMap: severityMap as any } : {}),
      }
      const res = await updateFeatureFlag(ff.id, dto)
      if (res.code) {
        message.success('告警发送模式已更新')
        onSaved()
      } else {
        message.error((res.data as any)?.error || res.message || '保存失败')
      }
    } catch (err: any) {
      message.error(err?.message || '网络错误')
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = mode !== (ff?.defaultValue ?? 'auto')

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, lineHeight: 1 }}>⚙️</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>告警发送模式</span>
        </div>
        <Tag color={ff?.enabled ? 'success' : 'default'} style={{ fontSize: 11, borderRadius: 6, marginRight: 0 }}>
          {ff?.enabled ? '已启用' : '未启用'}
        </Tag>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
        决定告警触发后的发送机制: 立即发送 / 人工审批 / 延时自动
      </div>

      {/* mode selector — card-style radio */}
      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {MODE_OPTIONS.map(opt => {
            const selected = mode === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  padding: '10px 14px',
                  border: `1.5px solid ${selected ? '#7c3aed' : '#e2e8f0'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: selected ? '#f5f3ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <Radio value={opt.value} style={{ width: '100%', display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {opt.icon} {opt.label} <code style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({opt.value})</code>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </Radio>
              </div>
            )
          })}
        </Space>
      </Radio.Group>

      {/* delayed_auto: severityDurationMap */}
      {mode === 'delayed_auto' && (
        <div style={{
          marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 10,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 10 }}>
            延时配置 (不同严重等级的等待时长)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([
              { key: 'critical', label: '严重', color: '#e84545' },
              { key: 'warning', label: '警告', color: '#f59e0b' },
              { key: 'info', label: '提示', color: '#3b82f6' },
            ] as const).map(s => (
              <div key={s.key} style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 500, marginBottom: 4 }}>
                  {s.label}
                </div>
                <InputNumber
                  size="small"
                  value={severityMap[s.key]}
                  onChange={(v) => setSeverityMap(p => ({ ...p, [s.key]: v ?? 0 }))}
                  addonAfter="ms"
                  style={{ width: '100%' }}
                  min={0}
                  step={60000}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
            💡 0ms = 立即进入队列, 300000ms(5min) = 5 分钟后自动发送
          </div>
        </div>
      )}

      {/* current status */}
      <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>当前: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{ff?.defaultValue ?? 'auto'}</code></span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span>熔断: {ff?.killSwitch ? <span style={{ color: '#e84545' }}>已开启</span> : '关闭'}</span>
      </div>

      <Button
        type="primary"
        size="small"
        loading={saving}
        disabled={!hasChanged}
        onClick={handleSave}
        style={{ marginTop: 14 }}
      >
        保存模式
      </Button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  策略卡片 2: 紧急熔断
// ═══════════════════════════════════════════════════════════════

interface KillSwitchCardProps {
  ff: Uart.UartFeatureFlag | undefined
  onSaved: () => void
}

const KillSwitchCard: React.FC<KillSwitchCardProps> = ({ ff, onSaved }) => {
  const [saving, setSaving] = useState(false)
  const isOn = ff?.killSwitch ?? false

  const handleToggle = () => {
    if (!ff?.id) { message.warning('策略数据加载中'); return }
    const next = !isOn

    if (next) {
      // 开启 → 需要确认
      let reason = ''
      const ctx = Modal.confirm({
        title: '开启紧急熔断?',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <div style={{ color: '#e84545', marginBottom: 10, fontWeight: 500 }}>
              ⚠️ 开启后, 所有新告警会被拦截 (状态: rejected), 并立即通知运维人员
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
              请在系统恢复后手动关闭熔断. 输入原因存档:
            </div>
            <Input placeholder="熔断原因 (审计用)" onChange={e => { reason = e.target.value }} />
          </div>
        ),
        okText: '确定开启熔断',
        okButtonProps: { danger: true },
        onOk: async () => {
          setSaving(true)
          try {
            const res = await setFeatureFlagKillSwitch(ff.id, true, reason || 'admin 手动开启熔断')
            if (res.code) {
              message.success('⚠️ 紧急熔断已开启')
              onSaved()
            } else {
              throw new Error((res.data as any)?.error || '操作失败')
            }
          } catch (err: any) {
            message.error(err?.message || '网络错误')
          } finally {
            setSaving(false)
          }
        },
      })
    } else {
      // 关闭 — 直接执行
      setSaving(true)
      setFeatureFlagKillSwitch(ff.id, false, 'admin 手动关闭熔断')
        .then((res) => {
          if (res.code) { message.success('熔断已关闭'); onSaved() }
          else throw new Error((res.data as any)?.error || '操作失败')
        })
        .catch((err: any) => message.error(err?.message || '网络错误'))
        .finally(() => setSaving(false))
    }
  }

  if (!ff) {
    return <div style={{ color: '#94a3b8', padding: 20, textAlign: 'center', fontSize: 13 }}>加载中...</div>
  }

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, lineHeight: 1 }}>🔴</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>紧急熔断</span>
        </div>
        <Tag color={ff?.enabled ? 'success' : 'default'} style={{ fontSize: 11, borderRadius: 6, marginRight: 0 }}>
          {ff?.enabled ? '已启用' : '未启用'}
        </Tag>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
        一键拦截所有告警, 紧急熔断时使用; 平时保持关闭
      </div>

      {/* 大开关 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 0', flexDirection: 'column', gap: 10,
      }}>
        <Switch
          checked={isOn}
          onChange={handleToggle}
          loading={saving}
          style={{ transform: 'scale(2.4)', transformOrigin: 'center' }}
          checkedChildren="ON"
          unCheckedChildren="OFF"
        />
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: isOn ? '#e84545' : '#64748b',
        }}>
          {isOn ? '⚠️ 熔断已开启 — 告警已拦截' : '熔断关闭 — 告警正常发送'}
        </div>
      </div>

      {/* 熔断原因 */}
      {isOn && ff.killSwitchReason && (
        <div style={{
          fontSize: 11, color: '#94a3b8', marginTop: 4,
          padding: '6px 10px', background: '#fef2f2', borderRadius: 6,
        }}>
          熔断原因: {ff.killSwitchReason}
        </div>
      )}

      {/* 状态提示 */}
      <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
        {isOn ? (
          <span>系统恢复后请及时关闭熔断; 关闭后新告警恢复发送</span>
        ) : (
          <span>紧急情况时开启此开关, 所有告警立即转 rejected + 运维通知</span>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  通知接收方
// ═══════════════════════════════════════════════════════════════

interface RecipientsCardProps {
  ff: Uart.UartFeatureFlag | undefined
  killFF: Uart.UartFeatureFlag | undefined
  onSaved: () => void
}

const RecipientsCard: React.FC<RecipientsCardProps> = ({ ff, killFF, onSaved }) => {
  const [email, setEmail] = useState('')
  const [sms, setSms] = useState('')
  const [feishu, setFeishu] = useState('')
  const [saving, setSaving] = useState(false)

  const hasData = !!(ff?.recipients?.length)
  const recipients = ff?.recipients ?? []

  useEffect(() => {
    setEmail(recipients.find(r => r.channel === 'email')?.target || '')
    setSms(recipients.find(r => r.channel === 'sms')?.target || '')
    setFeishu(recipients.find(r => r.channel === 'feishu_bot')?.target || '')
  }, [recipients, recipients.length])

  // 同步到两个 alert FF 的 recipients
  const handleSave = async () => {
    const targetIds = [ff?.id, killFF?.id].filter(Boolean) as string[]
    if (!targetIds.length) { message.warning('策略数据加载中'); return }

    setSaving(true)
    try {
      const recipientsArr: Uart.UartApprovalRecipient[] = []
      if (email) recipientsArr.push({ channel: 'email', target: email, enabled: true })
      if (sms) recipientsArr.push({ channel: 'sms', target: sms, enabled: true })
      if (feishu) recipientsArr.push({ channel: 'feishu_bot', target: feishu, enabled: true })

      for (const id of targetIds) {
        const res = await updateFeatureFlag(id, { recipients: recipientsArr })
        if (!res.code) throw new Error((res.data as any)?.error || `同步到 ${id} 失败`)
      }
      message.success('通知接收方已更新')
      onSaved()
    } catch (err: any) {
      message.error(err?.message || '网络错误')
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = (() => {
    const origEmail = recipients.find(r => r.channel === 'email')?.target || ''
    const origSms = recipients.find(r => r.channel === 'sms')?.target || ''
    const origFeishu = recipients.find(r => r.channel === 'feishu_bot')?.target || ''
    return email !== origEmail || sms !== origSms || feishu !== origFeishu
  })()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, lineHeight: 1 }}>📬</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>通知接收方</span>
        {hasData && <Tag color="processing" style={{ fontSize: 10, borderRadius: 6 }}>已配置</Tag>}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
        审批通知 / 熔断告警通知发送目标 (留空不通知). 同步写入所有告警策略.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 540 }}>
        <Input
          addonBefore="📧 Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@example.com"
          allowClear
        />
        <Input
          addonBefore="📱 SMS"
          value={sms}
          onChange={e => setSms(e.target.value)}
          placeholder="13800138000"
          allowClear
        />
        <Input
          addonBefore="🤖 飞书"
          value={feishu}
          onChange={e => setFeishu(e.target.value)}
          placeholder="chat_id 或 webhook URL"
          allowClear
        />
      </div>

      <Button
        type="primary"
        size="small"
        loading={saving}
        disabled={!hasChanged}
        onClick={handleSave}
        style={{ marginTop: 14 }}
      >
        保存通知设置
      </Button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  全部开关表格列定义
// ═══════════════════════════════════════════════════════════════

function makeColumns(opts: { onEdit: (r: Uart.UartFeatureFlag) => void; onRefresh: () => void }): ColumnsType<Uart.UartFeatureFlag> {
  const { onEdit, onRefresh } = opts

  const handleKillSwitch = (record: Uart.UartFeatureFlag) => {
    const next = !record.killSwitch
    Modal.confirm({
      title: next ? '开启 kill switch' : '关闭 kill switch',
      content: (
        <div>
          <div>将 {next ? '开启' : '关闭'} <b>{record.key}</b> 的 kill switch</div>
          {next && <div style={{ color: '#e84545', marginTop: 8 }}>⚠️ 所有依赖此 FF 的代码路径会进入拦截态</div>}
        </div>
      ),
      okText: next ? '确定开启' : '确定关闭',
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
          <div>将 <b>{record.key}</b> 标记为 disabled</div>
          <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>软删后 evaluator 返回 defaultValue=undefined</div>
        </div>
      ),
      okText: '确定软删',
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
          Modal.success({ content: `已复制为: ${(res.data as any)?.key}` })
          onRefresh()
        } else {
          Modal.error({ content: (res.data as any)?.error || res.message || '复制失败' })
        }
      })
      .catch((err: any) => Modal.error({ content: err?.message || '复制失败' }))
  }

  return [
    {
      title: 'key',
      dataIndex: 'key',
      width: 220,
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <code style={{ fontSize: 12, color: '#1e293b' }}>{v}</code>
          {r.description && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.description}</span>}
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'type', width: 64, render: (v: string) => <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag> },
    {
      title: '默认值', dataIndex: 'defaultValue', width: 130, ellipsis: true,
      render: (v: any) => <code style={{ fontSize: 12 }}>{typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}</code>,
    },
    { title: '启用', dataIndex: 'enabled', width: 56, render: (v: boolean) => v ? <Tag color="success">ON</Tag> : <Tag>OFF</Tag> },
    {
      title: '熔断', dataIndex: 'killSwitch', width: 56,
      render: (v: boolean, r) => <Switch size="small" checked={v} onChange={() => handleKillSwitch(r)} />,
    },
    {
      title: '设备覆盖', dataIndex: 'perDeviceOverrides', width: 80,
      render: (v: Record<string, any>) => {
        const n = Object.keys(v || {}).length
        return n > 0 ? <Tag color="orange" style={{ fontSize: 11 }}>{n} 台</Tag> : <span style={{ color: '#cbd5e1' }}>—</span>
      },
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
      title: '操作', width: 170, fixed: 'right',
      render: (_: any, r) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>软删</Button>
        </Space>
      ),
    },
  ]
}

// ═══════════════════════════════════════════════════════════════
//  创建/编辑 Modal
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

      Modal.success({ content: isEdit ? '更新成功' : '创建成功' })
      onSaved()
    } catch (err: any) {
      if (err?.errorFields) return
      Modal.error({ content: err?.message || '操作失败' })
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
    >
      <Form form={form} layout="vertical" size="middle">
        {/* key + type (新建时才可编辑) */}
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
            <Input placeholder="例: alert.dispatch.mode, ui.new_dashboard" disabled={isEdit} />
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

        <Form.Item label="描述" name="description" rules={[{ required: true, message: '必填' }]} style={{ marginBottom: 16 }}>
          <Input placeholder="human-readable 说明, 如「控制告警发送模式」" />
        </Form.Item>

        {/* 默认值 (按类型切换控件) */}
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

        {/* enabled + killSwitch */}
        <Space size={24} style={{ marginBottom: 16 }}>
          <Form.Item label="启用" name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
          <Form.Item label="kill switch" name="killSwitch" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Space>
        <Form.Item label="kill switch 原因" name="killSwitchReason" style={{ marginBottom: 16 }}>
          <Input placeholder="审计用" />
        </Form.Item>

        {/* perDeviceOverrides */}
        <Form.List name="perDeviceOverrides">
          {(fields, { add, remove }) => (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>设备覆盖</div>
              {fields.map(({ key: fk, name: fname }) => (
                <Space key={fk} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item name={[fname, 'mac']} style={{ marginBottom: 0 }}>
                    <Input placeholder="mac 地址" style={{ width: 150 }} />
                  </Form.Item>
                  <Form.Item name={[fname, 'value']} style={{ marginBottom: 0 }}>
                    <Input placeholder="值" style={{ width: 130 }} />
                  </Form.Item>
                  <Form.Item name={[fname, 'until']} style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="过期 (ms)" style={{ width: 150 }} />
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

        {/* recipients */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>审批通知接收方</div>
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
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.key !== curr.key}>
          {({ getFieldValue }) => {
            const k = getFieldValue('key') || ''
            if (!k.startsWith('alert.')) return null
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>告警等级延时 (delayed_auto)</div>
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
              </div>
            )
          }}
        </Form.Item>
      </Form>
    </Modal>
  )
}
