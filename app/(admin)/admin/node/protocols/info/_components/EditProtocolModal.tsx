'use client'

/**
 * EditProtocolModal — 添加 / 编辑协议指令（采集指令 tab 内）
 *
 * 来自原 `addInstruct` 内的 `prompt()` 调用 (line 92-118) — 原代码用 lib/utils/prompt
 * 一个简易 1 行 input modal，UI 极简且跟 v2 风格不搭。这里升级为标准 v3 modal：
 * - antd `<Modal>` (footer 自定义 OK/Cancel 按钮，OK 走 btn-brand)
 * - 表单内含指令名 + 4 个默认字段（转换器 / 启用 / 非标 / 备注）
 * - 取消按钮走 btn-default 中性边框
 * - 用 destroyOnHidden 不用 destroyOnClose (v2 规范)
 *
 * 调用方：
 * ```tsx
 * const [open, setOpen] = useState(false)
 * <Button onClick={() => setOpen(true)}>添加指令</Button>
 * <EditProtocolModal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onSubmit={(name) => { addInstruct(name); setOpen(false) }}
 *   existingNames={instructs.map(i => i.name)}
 * />
 * ```
 */

import { useEffect, useMemo, useState } from 'react'
import { Form, Input, Modal, Switch, message } from 'antd'
import { Button } from '@/components/common/Button'

export interface EditProtocolModalProps {
  open: boolean
  onClose: () => void
  /** 提交时回传指令名 (默认 4 字段由调用方填充) */
  onSubmit: (name: string) => void
  /** 已有指令名列表 (用于重复校验) */
  existingNames?: string[]
  /** 编辑模式时传入的默认值 */
  defaultName?: string
  /** 编辑模式时回传完整 instruct (含字段) */
  initialValues?: Partial<Uart.protocolInstruct>
}

const DEFAULT_RESULT_TYPES = [
  { value: 'hex', label: 'hex' },
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'json', label: 'json' },
] as const

export function EditProtocolModal({
  open,
  onClose,
  onSubmit,
  existingNames = [],
  defaultName,
  initialValues,
}: EditProtocolModalProps) {
  const [form] = Form.useForm<{ name: string; remark?: string; resultType?: string; isUse?: boolean; noStandard?: boolean }>()
  const [submitting, setSubmitting] = useState(false)

  // 每次打开时重置表单 — 用 key 强制 remount 也可，这里走 setFieldsValue
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: defaultName ?? '',
        resultType: initialValues?.resultType ?? 'hex',
        isUse: initialValues?.isUse ?? true,
        noStandard: initialValues?.noStandard ?? false,
        remark: initialValues?.remark ?? '',
      })
    }
  }, [open, defaultName, initialValues, form])

  const title = useMemo(() => (defaultName ? `编辑指令: ${defaultName}` : '添加指令'), [defaultName])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const name = values.name?.trim()
      if (!name) {
        message.warning('指令名称不能为空')
        return
      }
      // 编辑模式同名 / 添加模式重名 — 都提示
      if (!defaultName && existingNames.includes(name)) {
        message.warning(`指令名称 [${name}] 已存在`)
        return
      }
      setSubmitting(true)
      onSubmit(name)
      // 调用方在 onSubmit 内关闭 modal, 这里不主动 close
    } catch {
      // 表单校验失败 — antd 已显示
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={520}
      footer={[
        <Button key="cancel" variant="default" onClick={onClose}>
          取消
        </Button>,
        <Button key="ok" variant="primary" onClick={handleOk} loading={submitting}>
          {defaultName ? '保存' : '添加'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          label="指令名称"
          name="name"
          rules={[
            { required: true, message: '请输入指令名称' },
            { max: 32, message: '名称最长 32 字符' },
          ]}
        >
          <Input
            placeholder="例如: modbus_status"
            className="bg-ink-50 border-0 rounded-xl"
            autoFocus
          />
        </Form.Item>
        <Form.Item label="转换器" name="resultType" tooltip="解析原始字节的方式">
          <Input
            placeholder="hex"
            className="bg-ink-50 border-0 rounded-xl"
          />
        </Form.Item>
        <Form.Item label="启用" name="isUse" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="非标" name="noStandard" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input
            placeholder="(可选)"
            className="bg-ink-50 border-0 rounded-xl"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EditProtocolModal
