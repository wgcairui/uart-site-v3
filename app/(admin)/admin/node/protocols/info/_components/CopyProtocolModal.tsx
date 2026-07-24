'use client'

/**
 * CopyProtocolModal — 复制协议指令（采集指令 tab 内）
 *
 * 来自原 `copyInstruct` 内的 `prompt()` 调用 (line 152-161)。
 * 原代码用 lib/utils/prompt 一个简易 1 行 input modal，UI 极简且跟 v2 风格不搭。
 * 这里升级为标准 v3 modal，title 携带原指令名以提示用户。
 *
 * 视觉规范 (v2):
 * - antd `<Modal>` (footer 自定义 OK/Cancel 按钮，OK 走 btn-brand)
 * - Input 走 v2 token 样式 (bg-ink-50 + border-0 + rounded-xl)
 * - destroyOnHidden 不用 destroyOnClose
 *
 * 调用方:
 * ```tsx
 * <CopyProtocolModal
 *   open={copyOpen}
 *   sourceName="modbus_status"
 *   onClose={() => setCopyOpen(false)}
 *   onSubmit={(newName) => { copyInstruct(source, newName); setCopyOpen(false) }}
 *   existingNames={instructs.map(i => i.name)}
 * />
 * ```
 */

import { useEffect, useMemo, useState } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { Button } from '@/components/common/Button'

export interface CopyProtocolModalProps {
  open: boolean
  /** 源指令名 (用于 title 提示) */
  sourceName: string
  onClose: () => void
  /** 提交时回传新指令名 */
  onSubmit: (newName: string) => void
  /** 已有指令名列表 (用于重复校验) */
  existingNames?: string[]
}

export function CopyProtocolModal({
  open,
  sourceName,
  onClose,
  onSubmit,
  existingNames = [],
}: CopyProtocolModalProps) {
  const [form] = Form.useForm<{ newName: string }>()
  const [submitting, setSubmitting] = useState(false)

  // 每次打开时清空 + 聚焦 (留给 antd default focus)
  useEffect(() => {
    if (open) {
      form.setFieldsValue({ newName: '' })
    }
  }, [open, form])

  const title = useMemo(() => `复制指令 [${sourceName}] → 新名称`, [sourceName])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const newName = values.newName?.trim()
      if (!newName) {
        message.warning('新指令名不能为空')
        return
      }
      if (existingNames.includes(newName)) {
        message.warning(`指令名称 [${newName}] 已存在`)
        return
      }
      setSubmitting(true)
      onSubmit(newName)
    } catch {
      // antd 校验失败已显示
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
      width={460}
      footer={[
        <Button key="cancel" variant="default" onClick={onClose}>
          取消
        </Button>,
        <Button key="ok" variant="primary" onClick={handleOk} loading={submitting}>
          复制
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          label="新指令名称"
          name="newName"
          rules={[
            { required: true, message: '请输入新指令名' },
            { max: 32, message: '名称最长 32 字符' },
            {
              validator: (_, value) => {
                if (value && existingNames.includes(value)) {
                  return Promise.reject(new Error(`指令名称 [${value}] 已存在`))
                }
                return Promise.resolve()
              },
            },
          ]}
          extra={`从 [${sourceName}] 复制所有字段，仅修改名称`}
        >
          <Input
            placeholder={`${sourceName}_v2`}
            className="bg-ink-50 border-0 rounded-xl"
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CopyProtocolModal
