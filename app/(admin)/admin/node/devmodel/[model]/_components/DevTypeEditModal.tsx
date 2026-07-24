'use client'

/**
 * 设备型号改名 Modal
 *
 * 提取自原 page.tsx 内联 RenameInput (line 491-519),
 * 升级为 proper Modal 组件, 走 v2 视觉规范.
 *
 * 业务: 改名 = addDevType(new) + deleteDevModel(old) 组合
 * (后端无 rename endpoint, 只能 add + delete)
 *
 * Props:
 * - open: 控制可见
 * - onClose: 关闭回调 (取消 / Esc / 点空白)
 * - model: 当前设备型号 (作为 default value + 旧名)
 * - type: 当前设备类型 (UPS / 温湿度 / 通用 ...), 新建时沿用
 * - protocols: 关联协议列表, 新设备类型沿用
 * - onRenamed: 改名成功回调, 接收新 model 名 (由父组件 push 新 URL)
 */

import { useEffect, useState } from 'react'
import { Form, Input, message, Modal } from 'antd'

import { addDevType, deleteDevModel } from '@/lib/api/endpoints/admin/protocols'

export interface DevTypeEditModalProps {
  open: boolean
  onClose: () => void
  /** 当前型号 (用作 default value) */
  model: string
  /** 当前类型 (UPS / 温湿度 / ...) */
  type?: string
  /** 关联的协议列表 (新 device type 用) */
  protocols: Uart.DevsType['Protocols']
  /** 改名成功后回调, 传新 model 名 */
  onRenamed: (newModel: string) => void
}

export const DevTypeEditModal: React.FC<DevTypeEditModalProps> = ({
  open,
  onClose,
  model,
  type = '通用',
  protocols,
  onRenamed,
}) => {
  const [newModel, setNewModel] = useState(model)
  const [submitting, setSubmitting] = useState(false)

  // 每次打开时重置 input
  useEffect(() => {
    if (open) {
      setNewModel(model)
    }
  }, [open, model])

  const trimmed = newModel.trim()
  const unchanged = !trimmed || trimmed === model

  const handleOk = () => {
    if (unchanged) {
      onClose()
      return
    }
    setSubmitting(true)
    const protocolList = (protocols || []).map(p => ({
      ProtocolType: p.Type as unknown as Uart.protocolType,
      Protocol: p.Protocol,
    }))
    addDevType(type, trimmed, protocolList)
      .then(() => deleteDevModel(model))
      .then(el => {
        if (el.code) {
          message.success('已改名')
          onRenamed(trimmed)
          onClose()
        } else {
          message.error('改名失败: ' + (el.message || (el.data as any) || '未知错误'))
        }
      })
      .catch((err: any) => {
        message.error('改名失败: ' + (err?.message || '网络异常'))
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <Modal
      title="改名设备型号"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="确认改名"
      cancelText="取消"
      okButtonProps={{ className: 'btn-brand' }}
      cancelButtonProps={{ className: 'btn-default' }}
      destroyOnHidden
      maskClosable={!submitting}
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="新设备型号" required>
          <Input
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            placeholder="输入新的设备型号名"
            autoFocus
            onPressEnter={handleOk}
            disabled={submitting}
            maxLength={64}
          />
        </Form.Item>
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-500)',
            padding: '8px 12px',
            background: 'var(--ink-50)',
            border: '1px solid var(--ink-100)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
          }}
        >
          原 <code style={{ color: 'var(--ink-700)' }}>{model}</code>
          {' → '}
          新 <code style={{ color: 'var(--brand-500)' }}>{trimmed || '(空)'}</code>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-400)',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          ⚠ 后端无 rename endpoint, 改名将通过 add + delete 实现: 先创建新型号, 再删除旧型号. 如新创建失败, 旧型号不受影响.
        </div>
      </Form>
    </Modal>
  )
}

export default DevTypeEditModal
