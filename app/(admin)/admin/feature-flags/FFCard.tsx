'use client'
/**
 * 通用 Feature Flag 卡片
 *
 * 根据 flag.type 渲染不同的值控件:
 * - boolean → Switch
 * - string  → Input (或对 alert.dispatch.mode 走 rich Radio)
 * - number  → InputNumber
 *
 * 卡片顶部: key + 类型 tag + 启用状态 tag
 * 卡片中部: 当前值控件 (可即时保存, 调 updateFeatureFlag)
 * 卡片底部: 描述 / 熔断 / 设备覆盖数 / [编辑] 按钮
 *
 * 为什么 inline 控件: 常用 FF 改值高频, 弹窗 edit 体验重; inline 控件点选即保存
 */

import {
  Button, Input, InputNumber, Modal, Radio, Space, Switch, Tag, message,
} from 'antd'
import {
  EditOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import React, { useState } from 'react'

import {
  setFeatureFlagKillSwitch, updateFeatureFlag,
} from '@/lib/api/fetchRoot'

// 告警发送模式选项 — 跟 server 端 schema 保持一致 (auto/manual/delayed_auto)
const MODE_OPTIONS = [
  { value: 'auto', label: '自动发送', desc: '触发后立即发送, 无需审批', icon: '🚀' },
  { value: 'manual', label: '人工审批', desc: '进入审批队列, 需管理员批准', icon: '✅' },
  { value: 'delayed_auto', label: '延时自动', desc: '进入队列, 超时自动发送', icon: '⏱️' },
]

const TYPE_LABEL: Record<string, string> = {
  string: 'string', number: 'number', boolean: 'boolean',
}

interface FFCardProps {
  ff: Uart.UartFeatureFlag
  onSaved: () => void
  onEdit: () => void
}

export const FFCard: React.FC<FFCardProps> = ({ ff, onSaved, onEdit }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
      {/* 顶部: key + 类型 + 启用状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <code style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{ff.key}</code>
        <Tag color="blue" style={{ fontSize: 10, borderRadius: 6, marginRight: 0 }}>{TYPE_LABEL[ff.type] || ff.type}</Tag>
        <Tag
          color={ff.enabled ? 'success' : 'default'}
          style={{ fontSize: 10, borderRadius: 6, marginRight: 0 }}
        >
          {ff.enabled ? '已启用' : '未启用'}
        </Tag>
        {ff.killSwitch && (
          <Tag color="red" style={{ fontSize: 10, borderRadius: 6, marginRight: 0 }}>⚠️ 熔断中</Tag>
        )}
      </div>

      {/* 描述 */}
      {ff.description && (
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, minHeight: 18 }}>
          {ff.description}
        </div>
      )}

      {/* 值控件 */}
      <div style={{ flex: 1, paddingTop: 4 }}>
        <ValueControl ff={ff} onSaved={onSaved} />
      </div>

      {/* 底部信息 + 操作 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          设备覆盖: {Object.keys(ff.perDeviceOverrides || {}).length} 台
        </div>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={onEdit}>
          编辑
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  值控件 — 按 type 路由
// ═══════════════════════════════════════════════════════════════

const ValueControl: React.FC<{ ff: Uart.UartFeatureFlag; onSaved: () => void }> = ({ ff, onSaved }) => {
  // 用 key 把 ff.id + ff.defaultValue 编进去, ff 变化时强制 remount,
  // 子组件的本地 useState 会自动用新初始值. 避免 useEffect + setState 的反模式.
  const k = `${ff.id}-${String(ff.defaultValue)}`
  if (ff.type === 'boolean') return <BooleanValue key={k} ff={ff} onSaved={onSaved} />
  if (ff.key === 'alert.dispatch.mode') return <ModeValue key={k} ff={ff} onSaved={onSaved} />
  if (ff.type === 'string') return <StringValue key={k} ff={ff} onSaved={onSaved} />
  if (ff.type === 'number') return <NumberValue key={k} ff={ff} onSaved={onSaved} />
  return <div style={{ color: '#94a3b8', fontSize: 12 }}>不支持的类型: {ff.type}</div>
}

const useSaving = () => {
  const [saving, setSaving] = useState(false)
  return [saving, setSaving] as const
}

const handleUpdate = async (
  id: string,
  dto: Uart.UartFeatureFlagUpdateDto,
  setSaving: (b: boolean) => void,
  onSaved: () => void,
  successMsg: string,
) => {
  setSaving(true)
  try {
    const res = await updateFeatureFlag(id, dto)
    if (res.code) {
      message.success(successMsg)
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

// ─── boolean ─────────────────────────────────────────

const BooleanValue: React.FC<{ ff: Uart.UartFeatureFlag; onSaved: () => void }> = ({ ff, onSaved }) => {
  const [saving, setSaving] = useSaving()
  const val = Boolean(ff.defaultValue)

  // 告警 kill_switch 走 confirm 弹窗 — 危险操作需要二次确认 + 原因
  if (ff.key === 'alert.dispatch.kill_switch') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <Switch
          checked={val}
          loading={saving}
          onChange={(next) => {
            if (next) {
              let reason = ''
              Modal.confirm({
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
                onOk: () => setFeatureFlagKillSwitch(ff.id, true, reason || 'admin 手动开启熔断')
                  .then((res) => { if (res.code) onSaved(); else throw new Error((res.data as any)?.error || '失败') })
                  .catch((err: any) => message.error(err?.message || '操作失败')) as any,
              })
            } else {
              setFeatureFlagKillSwitch(ff.id, false, 'admin 手动关闭熔断')
                .then((res) => { if (res.code) { message.success('熔断已关闭'); onSaved() } else throw new Error((res.data as any)?.error || '失败') })
                .catch((err: any) => message.error(err?.message || '操作失败'))
            }
          }}
          style={{ transform: 'scale(1.6)', transformOrigin: 'center' }}
          checkedChildren="ON"
          unCheckedChildren="OFF"
        />
        <div style={{ fontSize: 12, fontWeight: 600, color: val ? '#e84545' : '#64748b' }}>
          {val ? '⚠️ 熔断已开启 — 告警已拦截' : '熔断关闭 — 告警正常发送'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Switch
        checked={val}
        loading={saving}
        onChange={(next) => handleUpdate(ff.id, { defaultValue: next }, setSaving, onSaved, next ? '已开启' : '已关闭')}
        checkedChildren="ON"
        unCheckedChildren="OFF"
      />
      <span style={{ fontSize: 12, color: '#64748b' }}>
        {val ? '开启' : '关闭'}
      </span>
    </div>
  )
}

// ─── alert.dispatch.mode (rich Radio) ─────────────────

const ModeValue: React.FC<{ ff: Uart.UartFeatureFlag; onSaved: () => void }> = ({ ff, onSaved }) => {
  const [saving, setSaving] = useSaving()
  const [mode, setMode] = useState<string>(String(ff.defaultValue ?? 'auto'))
  const original = String(ff.defaultValue ?? 'auto')
  const hasChanged = mode !== original

  return (
    <div>
      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ width: '100%' }}
        disabled={!ff.enabled}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {MODE_OPTIONS.map(opt => {
            const selected = mode === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => ff.enabled && setMode(opt.value)}
                style={{
                  padding: '8px 12px',
                  border: `1.5px solid ${selected ? '#7c3aed' : '#e2e8f0'}`,
                  borderRadius: 8,
                  cursor: ff.enabled ? 'pointer' : 'not-allowed',
                  background: selected ? '#f5f3ff' : '#fff',
                  opacity: ff.enabled ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                <Radio value={opt.value} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>
                    {opt.icon} {opt.label} <code style={{ fontSize: 10, color: '#94a3b8' }}>({opt.value})</code>
                  </span>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{opt.desc}</div>
                </Radio>
              </div>
            )
          })}
        </Space>
      </Radio.Group>

      <Button
        type="primary"
        size="small"
        loading={saving}
        disabled={!hasChanged}
        onClick={() => handleUpdate(ff.id, { defaultValue: mode }, setSaving, onSaved, '告警发送模式已更新')}
        style={{ marginTop: 8 }}
      >
        保存模式
      </Button>
    </div>
  )
}

// ─── string (自由文本) ─────────────────────────────────

const StringValue: React.FC<{ ff: Uart.UartFeatureFlag; onSaved: () => void }> = ({ ff, onSaved }) => {
  const [saving, setSaving] = useSaving()
  const [val, setVal] = useState<string>(String(ff.defaultValue ?? ''))
  const original = String(ff.defaultValue ?? '')
  const hasChanged = val !== original

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        disabled={!ff.enabled}
        placeholder="(无默认值)"
        style={{ flex: 1 }}
      />
      <Button
        type="primary"
        size="small"
        loading={saving}
        disabled={!hasChanged}
        onClick={() => handleUpdate(ff.id, { defaultValue: val }, setSaving, onSaved, '已更新')}
      >
        保存
      </Button>
    </div>
  )
}

// ─── number ───────────────────────────────────────────

const NumberValue: React.FC<{ ff: Uart.UartFeatureFlag; onSaved: () => void }> = ({ ff, onSaved }) => {
  const [saving, setSaving] = useSaving()
  const [val, setVal] = useState<number>(Number(ff.defaultValue ?? 0))
  const original = Number(ff.defaultValue ?? 0)
  const hasChanged = val !== original

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <InputNumber
        value={val}
        onChange={(v) => setVal(Number(v ?? 0))}
        disabled={!ff.enabled}
        style={{ flex: 1 }}
      />
      <Button
        type="primary"
        size="small"
        loading={saving}
        disabled={!hasChanged}
        onClick={() => handleUpdate(ff.id, { defaultValue: val }, setSaving, onSaved, '已更新')}
      >
        保存
      </Button>
    </div>
  )
}
