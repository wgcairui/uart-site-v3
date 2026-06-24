'use client'

import { Card, Empty, Form, Input, InputNumber, Radio, Select, Space, Tag, Typography } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useEffect, useMemo } from 'react'

const { Text } = Typography

/**
 * ProtocolPreviewForm（中间栏）— 协议预览表单
 *
 * 数据来源：LLM tool_done 事件 input（已落正式 + 双清缓存完成）
 * 也可在生成后由 admin 手动编辑字段（但 v1 不写回后端，决策 v2 加 /edit-stream）
 *
 * 字段结构对齐 `src/mongo_entity/protocol.ts` Protocols entity：
 * - Type: 485 | 232
 * - Protocol: PascalCase 协议名
 * - ProtocolType: ups | air | em | th | io
 * - instruct[]: 每条含 name + formResize[] + 可选 isUse / noStandard 等
 */
export interface ProtocolPreviewFormProps {
  /** 当前协议（来自 LLM tool_done.input 或 db 加载） */
  value: Partial<Uart.protocol> | null
  /** form 字段变化（v1 仅展示用） */
  onChange?: (v: Partial<Uart.protocol>) => void
  /** 当前 mode（决定顶部提示语） */
  mode: 'generate' | 'chat' | 'dry-run'
  /** admin 是否可编辑（v1 默认 false，v2 加 /edit-stream 后开 true） */
  editable?: boolean
}

export function ProtocolPreviewForm({ value, onChange, mode, editable = false }: ProtocolPreviewFormProps) {
  const [form] = Form.useForm<Partial<Uart.protocol>>()

  // 协议变化时同步 form
  useEffect(() => {
    if (value) {
      form.setFieldsValue(value)
    } else {
      form.resetFields()
    }
  }, [value, form])

  const instructCount = value?.instruct?.length ?? 0
  const formResizeCount = useMemo(
    () => (value?.instruct ?? []).reduce((acc, i) => acc + (i.formResize?.length ?? 0), 0),
    [value?.instruct]
  )

  const headerTip =
    mode === 'generate'
      ? '生成新协议：tool_done 后此处实时绑定 LLM 输出（admin 可检查后保存）'
      : mode === 'chat'
        ? 'AI 修改协议：每次 chat 后此处实时显示最新 version 的协议'
        : 'Dry-run 验证：此处仅展示协议快照，不修改'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--colorBorderSecondary, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          协议预览
        </Text>
        <Tag color="blue">指令 {instructCount}</Tag>
        <Tag color="cyan">字段 {formResizeCount}</Tag>
        {value?.Protocol && <Tag color="green">{value.Protocol}</Tag>}
      </div>
      <div style={{ padding: '8px 16px', background: 'var(--colorBgLayout, #fafafa)' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {headerTip}
        </Text>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {!value ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">
                等待 LLM 输出 tool_done 事件后此处会实时绑定 Protocols schema
              </Text>
            }
          />
        ) : (
          <Form
            form={form}
            layout="vertical"
            size="small"
            disabled={!editable}
            onValuesChange={(_, all) => onChange?.(all)}
          >
            <Space size={16} wrap>
              <Form.Item label="串口类型" name="Type" style={{ marginBottom: 12 }}>
                <Radio.Group>
                  <Radio.Button value={485}>485</Radio.Button>
                  <Radio.Button value={232}>232</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                label="设备类型"
                name="ProtocolType"
                style={{ marginBottom: 12 }}
              >
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: 'ups', label: 'UPS 电源' },
                    { value: 'air', label: '精密空调' },
                    { value: 'em', label: '电表' },
                    { value: 'th', label: '温湿度' },
                    { value: 'io', label: '开关量' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="协议名" name="Protocol" style={{ marginBottom: 12 }}>
                <Input style={{ width: 240 }} placeholder="PascalCase 唯一名" />
              </Form.Item>
            </Space>
            <Form.Item label="备注" name="remark" style={{ marginBottom: 12 }}>
              <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
            </Form.Item>
            <Text strong style={{ fontSize: 13 }}>
              指令列表（instruct[]）
            </Text>
            <div style={{ marginTop: 8 }}>
              {(value.instruct ?? []).map((inst, idx) => (
                <Card
                  key={`${inst.name}-${idx}`}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={
                    <Space>
                      <Text strong style={{ fontSize: 13 }}>
                        {inst.name || `(指令 ${idx + 1})`}
                      </Text>
                      <Tag color="purple">{inst.resultType ?? 'hex'}</Tag>
                      {!inst.isUse && <Tag color="default">停用</Tag>}
                      {inst.noStandard && <Tag color="warning">非标</Tag>}
                    </Space>
                  }
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {(inst.formResize ?? []).map((f, fi) => (
                      <Space key={fi} size={4} wrap>
                        <CheckOutlined style={{ color: '#52c41a', fontSize: 11 }} />
                        <Text style={{ fontSize: 12 }}>{f.name || '(未命名)'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          [{f.enName ?? f.regx ?? '-'}]
                        </Text>
                        {f.unit && <Tag style={{ fontSize: 10 }}>{f.unit}</Tag>}
                        {f.bl && f.bl !== '1' && (
                          <Tag style={{ fontSize: 10 }}>×{f.bl}</Tag>
                        )}
                      </Space>
                    ))}
                    {(!inst.formResize || inst.formResize.length === 0) && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        (无字段)
                      </Text>
                    )}
                  </Space>
                </Card>
              ))}
              {instructCount === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  暂无指令
                </Text>
              )}
            </div>
          </Form>
        )}
      </div>
    </div>
  )
}