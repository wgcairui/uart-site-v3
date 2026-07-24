'use client'

/**
 * UploadProtocolModal — 从本地 JSON 文件更新协议配置
 *
 * 来自原 page.tsx 内的 `ProtocolUploadModal` 组件 (T2 改造, line 287-358)。
 * 这里提取到 _components/ 子目录，逻辑保持不变 (上传 + 二次确认 + 更新 + 关闭)。
 *
 * 视觉规范：
 * - 标题栏 title=`上传本地 JSON 更新协议: ${protocolName}`
 * - width=900 (较宽, 放 ProtocolDesLocal 大表)
 * - 二次确认仍走 `confirm()` wrapper (v2 token: btn-brand) — 但 PR-01 的 lib/utils/modal
 *   wrapper 还在 parallel 工作流中, 此处保留 antd `Modal.confirm` 由 PR-00 sweep
 *
 * 调用方：
 * ```tsx
 * const [open, setOpen] = useState(false)
 * <UploadProtocolModal
 *   protocolName="modbus"
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onSuccess={() => fecth()}
 * />
 * ```
 */

import { useState } from 'react'
import { Card, Modal, Space, Upload, message, Modal as AntdModal } from 'antd'
import type { RcFile } from 'antd/lib/upload'
import { UploadOutlined } from '@ant-design/icons'
import { Button } from '@/components/common/Button'
import { updateProtocol } from '@/lib/api/fetchRoot'
import { ProtocolDesLocal } from './ProtocolDesLocal'

export interface UploadProtocolModalProps {
  protocolName: string
  open: boolean
  onClose: () => void
  /** 上传 + 更新成功后回调 (用于刷新父级) */
  onSuccess?: () => void
}

export function UploadProtocolModal({
  protocolName,
  open,
  onClose,
  onSuccess,
}: UploadProtocolModalProps) {
  const [protocol, setProtocol] = useState<Uart.protocol>()

  const upfile = (file: RcFile) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = (event) => {
      const [result] = JSON.parse(event.target?.result as string) as Uart.protocol[]
      if (typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'Protocol')) {
        if (result.Protocol === protocolName) {
          setProtocol(result)
        } else {
          message.warning('协议名称不一致')
        }
      } else {
        message.error('协议文件出错')
      }
    }
    return false
  }

  const updateP = () => {
    AntdModal.confirm({
      content: '确定使用本地文件配置更新云端协议配置吗?',
      onOk() {
        const loading = message.loading('更新中...')
        updateProtocol(protocol!).then(() => {
          loading()
          AntdModal.info({ content: '更新完成,更新页面查看最新的协议配置' })
          setProtocol(undefined)
          onSuccess?.()
          onClose()
        })
      },
    })
  }

  const handleClose = () => {
    setProtocol(undefined)
    onClose()
  }

  return (
    <Modal
      title={`上传本地 JSON 更新协议: ${protocolName}`}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Upload beforeUpload={upfile}>
          <Button icon={<UploadOutlined />}>选择本地 JSON 文件</Button>
        </Upload>
        {protocol && (
          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Button variant="primary" onClick={updateP}>
                更新协议
              </Button>
              <Button variant="default" onClick={() => setProtocol(undefined)}>
                清除
              </Button>
            </Space>
            <ProtocolDesLocal Protocol={protocol} />
          </Card>
        )}
      </Space>
    </Modal>
  )
}

export default UploadProtocolModal
