'use client'

import { useRouter } from 'next/navigation'
import { ClockCircleOutlined, EditOutlined, ReloadOutlined, FileTextOutlined, DisconnectOutlined } from '@ant-design/icons'

interface DeviceActionsProps {
  mac: string
  /** 标题 */
  title?: string
}

/**
 * DeviceActions · 设备操作玻璃卡 (v3 hybrid Page B 配套)
 *
 * 5 操作按钮: 立即读取 / 校准参数 / 修改采集周期 / 查看告警历史 / 解除挂载
 * 视觉: Glass 玻璃感 12px 圆角 + 紫粉渐变主操作 + 红色危险操作
 */
export function DeviceActions({ mac, title = '设备操作' }: DeviceActionsProps) {
  const router = useRouter()

  return (
    <div className="device-actions-v3">
      <h3>{title}</h3>

      <button
        className="device-action-btn-v3 primary"
        onClick={() => router.push(`/admin/node/terminal/${mac}?tab=instruct&action=query`)}
      >
        <span className="ico"><ClockCircleOutlined /></span>
        <span className="grow">立即读取一次数据</span>
        <span className="arrow">→</span>
      </button>

      <button
        className="device-action-btn-v3"
        onClick={() => router.push(`/admin/node/terminal/${mac}?tab=at&action=calibrate`)}
      >
        <span className="ico"><EditOutlined /></span>
        <span className="grow">校准参数</span>
        <span className="arrow">→</span>
      </button>

      <button
        className="device-action-btn-v3"
        onClick={() => router.push(`/admin/node/terminal/${mac}?tab=at&action=cycle`)}
      >
        <span className="ico"><ReloadOutlined /></span>
        <span className="grow">修改采集周期</span>
        <span className="arrow">→</span>
      </button>

      <button
        className="device-action-btn-v3"
        onClick={() => router.push(`/admin/node/terminal/${mac}?tab=alarm`)}
      >
        <span className="ico"><FileTextOutlined /></span>
        <span className="grow">查看告警历史</span>
        <span className="arrow">→</span>
      </button>

      <button
        className="device-action-btn-v3 danger"
        onClick={() => {
          if (confirm(`确定要解除挂载 ${mac} 吗?`)) {
            // 实际 unbind 逻辑后续接
            console.warn('[DeviceActions] unbind not implemented yet', mac)
          }
        }}
      >
        <span className="ico"><DisconnectOutlined /></span>
        <span className="grow">解除挂载</span>
        <span className="arrow">→</span>
      </button>
    </div>
  )
}
