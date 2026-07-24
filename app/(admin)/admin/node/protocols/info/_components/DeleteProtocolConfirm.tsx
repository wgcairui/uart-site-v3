'use client'

/**
 * DeleteProtocolConfirm — 删除协议指令确认 (采集指令 tab 内)
 *
 * 来自原 `deleteInstruct` 内的 `Modal.confirm()` 调用 (line 139-150)。
 * 提取为标准 v3 modal 而非 antd `Modal.confirm` 静态调用 (后者不便复用 + 按钮样式不统一)。
 *
 * 视觉规范 (v2):
 * - antd `<Modal>` (footer 自定义 OK/Cancel 按钮)
 * - OK 按钮走 btn-danger (红色, okButtonProps.danger)
 * - Cancel 按钮走 btn-default 中性边框
 * - destroyOnHidden
 *
 * 调用方:
 * ```tsx
 * <DeleteProtocolConfirm
 *   open={delOpen}
 *   name={pendingDelete?.name ?? ''}
 *   onClose={() => setDelOpen(false)}
 *   onConfirm={() => { doDelete(pendingDelete); setDelOpen(false) }}
 * />
 * ```
 */

import { useMemo, useState } from 'react'
import { Modal, Space } from 'antd'
import { DeleteFilled, ExclamationCircleOutlined } from '@ant-design/icons'
import { Button } from '@/components/common/Button'

export interface DeleteProtocolConfirmProps {
  open: boolean
  name: string
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function DeleteProtocolConfirm({
  open,
  name,
  onClose,
  onConfirm,
}: DeleteProtocolConfirmProps) {
  const [submitting, setSubmitting] = useState(false)

  const title = useMemo(() => `确认删除指令 [${name}] ?`, [name])

  const handleOk = async () => {
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: 'var(--color-danger, #f43f5e)' }} />
          {title}
        </Space>
      }
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={440}
      footer={[
        <Button key="cancel" variant="default" onClick={onClose} disabled={submitting}>
          取消
        </Button>,
        <Button
          key="ok"
          variant="danger"
          icon={<DeleteFilled />}
          onClick={handleOk}
          loading={submitting}
        >
          确认删除
        </Button>,
      ]}
    >
      <div style={{ padding: '8px 0', color: 'var(--ink-700)', fontSize: 14, lineHeight: 1.7 }}>
        将从协议定义中移除指令 <code style={{ fontFamily: 'var(--font-mono)' }}>{name}</code>。
        <br />
        请确认该指令未在设备 / 阈值 / 常量配置中引用。
      </div>
    </Modal>
  )
}

export default DeleteProtocolConfirm
