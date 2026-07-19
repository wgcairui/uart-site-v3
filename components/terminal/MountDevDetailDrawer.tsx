'use client'

/**
 * MountDevDetailDrawer · 挂载设备快速预览 Drawer (720px)
 *
 * 跟原"设备详情" 3 段 (详情/实时/历史) 区分 — 这里是"快速瞥一眼"场景,
 * 完整看 → 跳独立页 /admin/node/terminal/[mac]/mount-dev/[pid]
 *
 * 内容精简:
 * - Hero strip: 图标 + 名称 + PID + 协议 + 在线状态
 * - Meta: 设备ID/PID/上行/采集
 * - Descriptions: 6 行 (名称/类型/协议/PID/终端MAC/在线状态)
 * - 实时数据: TerminalCurData (单条最新, TerminalCurData 自身只显示 1 条)
 * - 右上"完整详情"链接 → 独立页
 *
 * 视觉: 紫光 header · 玻璃 bento · 720px 适合不退出当前页 quick peek
 */

import { Drawer, Tag, Descriptions, Button, Spin } from 'antd'
import { AppstoreOutlined, ExportOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getTerminalPidProtocol } from '@/lib/api/fetch'
import { usePromise } from '@/lib/hooks/usePromise'
import { TerminalCurData } from '@/app/(admin)/admin/node/terminal/[mac]/TerminalDataTab'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'

interface MountDevDetailDrawerProps {
  mac: string
  dev: Uart.TerminalMountDevs | null
  open: boolean
  onClose: () => void
}

export function MountDevDetailDrawer({ mac, dev, open, onClose }: MountDevDetailDrawerProps) {
  const router = useRouter()

  const { data: mountDev, loading } = usePromise(async () => {
    if (!dev) return null
    const { data } = await getTerminalPidProtocol(mac, dev.pid)
    return data
  }, null, [mac, dev?.pid, open])

  if (!dev) return null

  const online = !!dev.online
  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />
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
          type="primary"
          size="small"
          icon={<ExportOutlined />}
          onClick={() => {
            onClose()
            router.push(`/admin/node/terminal/${mac}/mount-dev/${dev.pid}`)
          }}
        >
          完整详情
        </Button>
      }
    >
      {/* Meta strip */}
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

      {/* 内容区: Descriptions + 实时数据 (单条) */}
      <div style={{ padding: 20 }}>
        <Spin spinning={loading}>
          {mountDev ? (
            <Descriptions
              size="small"
              column={2}
              bordered
              style={{ marginBottom: 20 }}
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
        </Spin>

        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>实时数据</div>
        <TerminalCurData mac={mac} pid={dev.pid} />
      </div>
    </Drawer>
  )
}
