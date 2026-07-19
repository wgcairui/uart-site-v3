'use client'

/**
 * MountDevDetailDrawer · 挂载设备详情 Drawer
 *
 * 替代原"mount device tab 嵌套 sub-tab"三层结构, 改成:
 * - 点击挂载设备卡 → Drawer 720px 弹出 (上下文不丢, 卡列表仍在左侧)
 * - Drawer 内分 3 段: 基本信息 / 实时数据 / 历史数据 (Segmented 切换)
 * - "设备详情" 段: 复用 TerminalDevPage (按设备类型分: 温湿度/IO/空调/UPS)
 *
 * 视觉: 紫光 header · Segmented 切换 · 滚动承载长内容
 */

import { useState } from 'react'
import { Drawer, Segmented, Tag, Descriptions, Spin, Button } from 'antd'
import {
  AppstoreOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { getTerminalPidProtocol } from '@/lib/api/fetch'
import { usePromise } from '@/lib/hooks/usePromise'
import { TerminalDevPage } from './TerminalDevPage'
import { TerminalCurData, TerminalHistoryData } from '@/app/(admin)/admin/node/terminal/[mac]/TerminalDataTab'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'

interface MountDevDetailDrawerProps {
  mac: string
  dev: Uart.TerminalMountDevs | null
  open: boolean
  onClose: () => void
}

type Segment = 'detail' | 'cur' | 'history'

export function MountDevDetailDrawer({ mac, dev, open, onClose }: MountDevDetailDrawerProps) {
  const [seg, setSeg] = useState<Segment>('detail')

  const { data: mountDev, loading } = usePromise(async () => {
    if (!dev) return null
    const { data } = await getTerminalPidProtocol(mac, dev.pid)
    return data
  }, null, [mac, dev?.pid, open])

  if (!dev) return null

  const online = !!dev.online
  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />
  const imgSrc = (devType as Record<string, string>)[dev.Type]
  const lastEmit = (dev as any).lastEmit
  const lastRecord = (dev as any).lastRecord

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: online
                ? 'linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20,
              flexShrink: 0,
            }}
          >
            {iconEl}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>
              {dev.mountDev || '未命名'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              PID {dev.pid} · {dev.protocol || '未配置协议'} · {dev.Type || '未知类型'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag
              color={online ? 'success' : 'warning'}
              style={{ margin: 0, fontFamily: 'var(--font-mono)' }}
            >
              {online ? '● 在线' : '● 离线'}
            </Tag>
          </div>
        </div>
      }
      styles={{
        header: {
          padding: '16px 20px',
          borderBottom: '1px solid var(--ink-100)',
        },
        body: {
          padding: 0,
          background: 'var(--bg-bento-canvas, #fafafa)',
        },
      }}
      extra={
        <Button
          type="text"
          size="small"
          icon={<ExportOutlined />}
          onClick={() => {
            // 跳到独立 mount device page 兜底
            window.open(`/admin/node/terminal/${mac}?tab=${dev.pid}`, '_blank')
          }}
        >
          全屏查看
        </Button>
      }
    >
      {/* 顶部 meta strip */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.7)',
          borderBottom: '1px solid var(--ink-100)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
        }}
      >
        <span>设备ID: {mac}</span>
        <span>·</span>
        <span>PID: {dev.pid}</span>
        {lastEmit ? (
          <>
            <span>·</span>
            <span>上行: {new Date(lastEmit).toLocaleString()}</span>
          </>
        ) : null}
        {lastRecord ? (
          <>
            <span>·</span>
            <span>采集: {new Date(lastRecord).toLocaleString()}</span>
          </>
        ) : null}
      </div>

      {/* Segmented 切换 */}
      <div
        style={{
          padding: '12px 20px 0',
          background: 'rgba(255, 255, 255, 0.7)',
          borderBottom: '1px solid var(--ink-100)',
        }}
      >
        <Segmented
          value={seg}
          onChange={(v) => setSeg(v as Segment)}
          options={[
            { label: '设备详情', value: 'detail' },
            { label: '实时数据', value: 'cur' },
            { label: '历史数据', value: 'history' },
          ]}
        />
      </div>

      {/* 内容区 */}
      <div style={{ padding: 20 }}>
        {seg === 'detail' && (
          <Spin spinning={loading}>
            {mountDev ? (
              <Descriptions
                size="small"
                column={2}
                bordered
                items={[
                  { key: 'name', label: '设备名', children: dev.mountDev || '-' },
                  { key: 'type', label: '类型', children: dev.Type || '-' },
                  { key: 'protocol', label: '协议', children: dev.protocol || '-' },
                  { key: 'pid', label: 'PID', children: dev.pid },
                  { key: 'mac', label: '终端 MAC', children: mac },
                  { key: 'status', label: '在线状态', children: online ? '在线' : '离线' },
                  ...(mountDev as any).remark ? [{ key: 'remark', label: '备注', children: (mountDev as any).remark }] : [],
                ]}
              />
            ) : null}
            {/* 设备类型特定组件 (温湿度/IO/空调/UPS) */}
            <div style={{ marginTop: 16 }}>
              <TerminalDevPage mac={mac} pid={dev.pid} />
            </div>
          </Spin>
        )}
        {seg === 'cur' && <TerminalCurData mac={mac} pid={dev.pid} />}
        {seg === 'history' && <TerminalHistoryData mac={mac} pid={dev.pid} />}
      </div>
    </Drawer>
  )
}
