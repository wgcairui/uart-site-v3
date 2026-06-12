'use client'
import { DeleteFilled } from '@ant-design/icons'
import { Form, Input, Select } from 'antd'
// `Uart` 是 global namespace (types/uart.d.ts)，无需 import

interface Props {
  /** 查表函数：根据参数名查已有的 bl/unit 预设 */
  protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined
  /** 指令单个参数 */
  re: Uart.protocolInstructFormrize
  /** 修改指令触发（item = undefined 表示删除） */
  onChange: (item?: Uart.protocolInstructFormrize) => void
}

/**
 * 协议指令单个参数表单（name / regx / bl / unit + 删除）
 * 被 ProtocolInstructParamList 内部使用
 */
export function ProtocolInstructParamInput({ protocolItemFun, re, onChange }: Props) {
  const [form] = Form.useForm<Uart.protocolInstructFormrize>()

  // 初始化表单值
  Form.useWatch([], form)

  const handleChange = (_value: Partial<Uart.protocolInstructFormrize>, item: Uart.protocolInstructFormrize) => {
    const m = protocolItemFun(item.name)
    if (m) {
      item.bl = m.bl
      item.unit = m.unit
    }
    item.isState = Boolean(item.unit && /^{.*}$/.test(item.unit))
    onChange(item)
  }

  return (
    <Form
      layout="inline"
      initialValues={re}
      onValuesChange={handleChange}
      size="small"
      form={form}
    >
      <Form.Item name="name" label="参数名">
        <Input />
      </Form.Item>
      <Form.Item
        name="regx"
        label="分割"
        rules={[
          { type: 'string', required: true, message: 'error' },
          { pattern: /^[0-9]+\-[0-9]+$/ },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="bl" label="系数">
        <Select>
          {[1, 0.1, 10, 100, 1000, 0.01, 0.001].map((el) => (
            <Select.Option value={el} key={el}>
              {el}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        name="unit"
        label="单位"
        rules={[
          {
            validator: (_, value) => {
              if (/{/.test(value)) {
                if (/}$/.test(value)) return Promise.resolve()
                else return Promise.reject(new Error('大括号不完整'))
              } else {
                return Promise.resolve()
              }
            },
          },
        ]}
      >
        <Input.TextArea autoSize />
      </Form.Item>
      <Form.Item>
        <DeleteFilled onClick={() => onChange()} />
      </Form.Item>
    </Form>
  )
}