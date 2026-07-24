'use client'

/**
 * 设备类型 (AddDevModel) Modal — 添加 / 编辑设备类型
 *
 * 提取自原 app/(admin)/admin/node/devmodel/page.tsx 内联子组件 (P1-2 前 line 21-84),
 * 升级到 v2 视觉规范 + 标准 Modal API (open / onClose).
 *
 * 业务:
 * - 添加模式 (initialValue = null): 用户输入 DevModel + 选 Protocols, 调 addDevType
 * - 编辑模式 (initialValue 有值): 只允许改 Protocols (DevModel 字段 disabled),
 *   调 addDevType (后端无 update endpoint, 走 add + 旧记录覆盖, 由 server 端处理)
 *
 * Props (v2 风格):
 * - open: 控制可见
 * - onClose: 关闭回调 (取消 / Esc / 点空白)
 * - initialValue: 编辑模式传当前 DevsType, 添加模式传 null
 * - onSaved: 保存成功回调, 父组件 refetch 列表
 *
 * 视觉规范: 跟 app/(admin)/admin/node/devmodel/[model]/_components/DevTypeEditModal.tsx
 *          (PR-04 ship) 同源 — 走 btn-brand / btn-default 按钮 class, destroyOnHidden.
 */

import { useEffect, useState } from 'react'
import { Form, Input, message, Modal } from 'antd'

import { ProtocolsCascader } from '@/components/protocol/ProtocolsCascader'
import { addDevType } from '@/lib/api/endpoints/admin/protocols'

/** 设备类型 code → 中文名 映射 (UPS / 空调 / 电量仪 / 温湿度 / IO) */
const DEV_TYPE_LABELS: Record<string, string> = {
  ups: 'UPS',
  air: '空调',
  em: '电量仪',
  th: '温湿度',
  io: 'IO',
}

export interface AddDevModelModalProps {
  /** Modal 可见性 (v2 antd API, 替代旧 visible) */
  open: boolean
  /** 关闭回调 (取消 / Esc / 点空白) */
  onClose: () => void
  /** 编辑模式传当前 DevsType; null = 添加模式 */
  initialValue?: Uart.DevsType | null
  /** 保存成功回调, 父组件用来 refetch 列表 */
  onSaved?: () => void
}

export const AddDevModelModal: React.FC<AddDevModelModalProps> = ({
  open,
  onClose,
  initialValue,
  onSaved,
}) => {
  const [model, setModel] = useState('')
  const [protocol, setProtocol] = useState<[Uart.protocolType, string][]>([])

  useEffect(() => {
    if (open) {
      if (initialValue) {
        setModel(initialValue.DevModel)
        const p =
          initialValue.Protocols?.map(
            el =>
              [el.Type as unknown as Uart.protocolType, el.Protocol] as [Uart.protocolType, string],
          ) || []
        setProtocol(p)
      } else {
        setModel('')
        setProtocol([])
      }
    }
  }, [open, initialValue])

  const handleOk = () => {
    if (!protocol.length) return message.warning('请至少选择一个协议')
    const Type = protocol[0]?.[0]
    if (!Type) return
    const Protocols = protocol.map(el => el[1])
    addDevType(
      DEV_TYPE_LABELS[Type] || 'UPS',
      model,
      Protocols.map(el => ({ ProtocolType: Type, Protocol: el })),
    ).then(() => {
      message.success('保存成功')
      onClose()
      onSaved?.()
    })
  }

  return (
    <Modal
      title={initialValue ? '编辑设备配置' : '添加设备类型'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      destroyOnHidden
      width={520}
      okButtonProps={{ className: 'btn-brand' }}
      cancelButtonProps={{ className: 'btn-default' }}
    >
      <Form labelCol={{ span: 5 }} style={{ marginTop: 16 }}>
        <Form.Item label="设备型号">
          <Input
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={!!initialValue}
            placeholder="输入设备型号"
          />
        </Form.Item>
        <Form.Item label="设备协议">
          <ProtocolsCascader
            value={protocol}
            onChange={(val: any) => setProtocol(val)}
            multiple
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddDevModelModal
