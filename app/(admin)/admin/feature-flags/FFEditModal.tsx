'use client'
/**
 * 创建/编辑 Feature Flag 弹窗 (3 tab 设计 2026-07-21)
 *
 * 旧版 15+ 字段堆一起, 用户体验差. 改为 3 tab:
 *  1. 基本 — key (新建时) / type (新建时) / description / defaultValue
 *  2. 高级 — enabled / killSwitch / killSwitchReason / perDeviceOverrides
 *  3. 通知 — recipients / severityDurationMap (仅 alert.* 可见)
 *
 * 拆分理由:
 * - 基本 — 99% 的修改都集中在这 tab
 * - 高级 — 危险操作, 单独一个 tab 防止误改
 * - 通知 — 跟"接收方"和"延时"绑在一起, 但只有 alert.* 才需要
 *
 * 项目约定:
 * - 'use client' 必加
 * - Modal.confirm 不用 Popconfirm
 * - 只改 UI 不改 API / DTO
 */

import {
  Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Tabs, message,
} from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import React, { useEffect } from 'react'

import {
  createFeatureFlag, updateFeatureFlag,
} from '@/lib/api/fetchRoot'

const TYPE_OPTIONS = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
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

interface FFEditModalProps {
  open: boolean
  record: Uart.UartFeatureFlag | null
  onClose: () => void
  onSaved: () => void
}

export const FFEditModal: React.FC<FFEditModalProps> = ({ open, record, onClose, onSaved }) => {
  const isEdit = !!record
  const [form] = Form.useForm<FFFormValues>()
  const [submitting, setSubmitting] = React.useState(false)
  const keyVal = Form.useWatch('key', form)
  const typeVal = Form.useWatch('type', form)
  const isAlertFF = typeof keyVal === 'string' && keyVal.startsWith('alert.')

  // 初始化 form
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

      // 整理 recipients
      const recipients: Uart.UartApprovalRecipient[] = []
      if (values.recipients?.email) recipients.push({ channel: 'email', target: values.recipients.email, enabled: true })
      if (values.recipients?.sms) recipients.push({ channel: 'sms', target: values.recipients.sms, enabled: true })
      if (values.recipients?.feishu_bot) recipients.push({ channel: 'feishu_bot', target: values.recipients.feishu_bot, enabled: true })

      // 整理 perDeviceOverrides
      const perDeviceOverrides: Record<string, any> = {}
      for (const o of values.perDeviceOverrides || []) {
        if (o.mac) perDeviceOverrides[o.mac] = { value: o.value, until: o.until, note: o.note }
      }

      if (isEdit && record) {
        const dto: Uart.UartFeatureFlagUpdateDto = {
          description: values.description,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        }
        if (values.killSwitchReason) dto.killSwitchReason = values.killSwitchReason
        if (isAlertFF) dto.severityDurationMap = values.severityDurationMap
        await updateFeatureFlag(record.id, dto)
      } else {
        const dto: Uart.UartFeatureFlagCreateDto = {
          key: values.key,
          description: values.description,
          type: values.type,
          defaultValue: values.defaultValue,
          killSwitch: values.killSwitch,
          perDeviceOverrides,
          recipients,
          enabled: values.enabled,
        }
        if (values.killSwitchReason) dto.killSwitchReason = values.killSwitchReason
        if (isAlertFF) dto.severityDurationMap = values.severityDurationMap
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

  // ── Tab 1: 基本 ─────────────────────────────────────────
  const basicTab = (
    <Form form={form} layout="vertical" size="middle" component={false}>
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

      <Form.Item
        label="默认值"
        name="defaultValue"
        rules={[{ required: true, message: '必填' }]}
        style={{ marginBottom: 0 }}
      >
        {(() => {
          const t = (typeVal || (isEdit ? record?.type : 'string')) as 'string' | 'number' | 'boolean'
          if (t === 'boolean') return (
            <Select
              options={[
                { value: true, label: 'true' },
                { value: false, label: 'false' },
              ]}
              placeholder="true / false"
            />
          )
          if (t === 'number') return <InputNumber style={{ width: '100%' }} placeholder="number 默认值" />
          return <Input placeholder="string 默认值" />
        })()}
      </Form.Item>
    </Form>
  )

  // ── Tab 2: 高级 ─────────────────────────────────────────
  const advancedTab = (
    <Form form={form} layout="vertical" size="middle" component={false}>
      <div style={{
        padding: 12, marginBottom: 16, background: '#fef3c7', borderRadius: 8,
        border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.6,
      }}>
        ⚠️ 高危操作: <b>kill switch</b> 会拦截所有依赖此 FF 的代码路径, <b>设备覆盖</b> 会按 MAC 强制覆盖默认值. 改前请确认.
      </div>

      <Space size={24} style={{ marginBottom: 16 }}>
        <Form.Item label="启用" name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch />
        </Form.Item>
        <Form.Item label="kill switch" name="killSwitch" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch />
        </Form.Item>
      </Space>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.killSwitch !== curr.killSwitch}
      >
        {({ getFieldValue }) =>
          getFieldValue('killSwitch') ? (
            <Form.Item
              label="kill switch 原因"
              name="killSwitchReason"
              style={{ marginBottom: 16 }}
              rules={[{ required: true, message: '开启 kill switch 必须填写原因 (审计用)' }]}
            >
              <Input placeholder="例: 2026-07-21 短信通道异常" />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>设备覆盖 (per device)</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>
        按 MAC 强制覆盖默认值. 优先级: device override &gt; default. 留 until 不填表示永久.
      </div>

      <Form.List name="perDeviceOverrides">
        {(fields, { add, remove }) => (
          <div style={{ marginBottom: 0 }}>
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
                <Button danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(fname)}>
                  删除
                </Button>
              </Space>
            ))}
            <Button type="dashed" onClick={() => add({ mac: '', value: '' })} block icon={<PlusOutlined />}>
              添加设备覆盖
            </Button>
          </div>
        )}
      </Form.List>
    </Form>
  )

  // ── Tab 3: 通知 ─────────────────────────────────────────
  const notifyTab = (
    <Form form={form} layout="vertical" size="middle" component={false}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
        通知接收方: 审批通知 / 熔断告警通知 / 自定义通知统一发送目标. 留空表示该通道不通知.
      </div>

      <Form.Item name={['recipients', 'email']} label="📧 Email" style={{ marginBottom: 12 }}>
        <Input placeholder="admin@example.com" allowClear />
      </Form.Item>
      <Form.Item name={['recipients', 'sms']} label="📱 SMS" style={{ marginBottom: 12 }}>
        <Input placeholder="13800138000" allowClear />
      </Form.Item>
      <Form.Item name={['recipients', 'feishu_bot']} label="🤖 飞书" style={{ marginBottom: 16 }}>
        <Input placeholder="chat_id 或 webhook URL" allowClear />
      </Form.Item>

      {isAlertFF && (
        <>
          <div style={{
            padding: 12, marginBottom: 16, background: '#f1f5f9', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6,
          }}>
            💡 <b>告警等级延时</b>仅在 <code>delayed_auto</code> 模式下生效. 0ms = 立即发送.
          </div>
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>告警等级延时 (delayed_auto)</div>
          <Space size={8} wrap>
            <Form.Item name={['severityDurationMap', 'critical']} label="critical" style={{ marginBottom: 0 }}>
              <InputNumber addonAfter="ms" style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name={['severityDurationMap', 'warning']} label="warning" style={{ marginBottom: 0 }}>
              <InputNumber addonAfter="ms" style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name={['severityDurationMap', 'info']} label="info" style={{ marginBottom: 0 }}>
              <InputNumber addonAfter="ms" style={{ width: 170 }} />
            </Form.Item>
          </Space>
        </>
      )}
    </Form>
  )

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
      <Form form={form} component={false}>
        <Tabs
          defaultActiveKey="basic"
          items={[
            { key: 'basic', label: '基本', children: basicTab },
            { key: 'advanced', label: '高级', children: advancedTab },
            { key: 'notify', label: '通知', children: notifyTab },
          ]}
        />
      </Form>
    </Modal>
  )
}
