'use client'

/**
 * MountDevDetailDrawer · 挂载设备快速预览 Drawer (720px)
 *
 * 跟原"设备详情" 3 段 (详情/实时/历史) 区分 — 这里是"快速瞥一眼"场景,
 * 完整看 → 跳独立页 /admin/node/terminal/[mac]/mount-dev/[pid]
 *
 * 内容精简:
 * - Hero strip: 图标 + 名称 + PID + 协议 + 在线状态 (StatusTag)
 * - Meta: 设备ID/PID/上行/采集
 * - KVList: 6 行 (名称/类型/协议/PID/终端MAC/在线状态)
 * - 实时数据: TerminalCurData (单条最新, TerminalCurData 自身只显示 1 条)
 * - 右上"完整详情"链接 → 独立页
 *
 * 视觉: 渐变 header · 玻璃 bento · 720px 适合不退出当前页 quick peek
 *
 * Props:
 * - mac  string 终端 MAC
 * - dev  Uart.TerminalMountDevs | null  挂载设备信息（null 时不渲染）
 * - open boolean  控制 drawer 开关
 * - onClose () => void  关闭回调
 */

import { Drawer, Spin } from 'antd'
import { AppstoreOutlined, ExportOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getTerminalPidProtocol } from '@/lib/api/fetch'
import { usePromise } from '@/lib/hooks/usePromise'
import { TerminalCurData } from '@/app/(admin)/admin/node/terminal/[mac]/TerminalDataTab'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'
import { StatusTag } from '@/components/common/StatusTag'
import { Button } from '@/components/common/Button'
import { KVList } from '@/components/common/KVList'

interface MountDevDetailDrawerProps {
  mac: string
  dev: Uart.TerminalMountDevs | null
  open: boolean
  onClose: () => void
}

/** 抽屉宽度（适合"快速瞥一眼"场景：bento KPI + 6 行 KV + 实时数据 1 条刚好一屏） */
const WIDTH = 720

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
  const remark = (mountDev as any)?.remark

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={WIDTH}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: online
                ? 'linear-gradient(135deg, var(--color-success, #10b981) 0%, var(--brand-500, #8b5cf6) 100%)'
                : 'linear-gradient(135deg, var(--color-warning, #f59e0b) 0%, var(--accent-500, #ec4899) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
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
            <StatusTag
              variant={online ? 'online' : 'warning'}
              text={online ? '在线' : '离线'}
              pulse={online}
            />
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
          variant="primary"
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
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 11,
          color: 'var(--ink-500)',
          fontFamily: 'var(--font-mono)',
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

      {/* 内容区: KVList + 实时数据 (单条) */}
      <div style={{ padding: 20 }}>
        <Spin spinning={loading}>
          {mountDev ? (
            <KVList
              items={[
                { label: '设备名', value: dev.mountDev || '-' },
                { label: '类型', value: dev.Type || '-' },
                { label: '协议', value: dev.protocol || '-' },
                { label: 'PID', value: dev.pid },
                { label: '终端 MAC', value: mac },
                {
                  label: '在线状态',
                  value: online ? '在线' : '离线',
                },
                ...(remark ? [{ label: '备注', value: remark }] : []),
              ]}
            />
          ) : null}
        </Spin>

        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8, marginTop: 20 }}>
          实时数据
        </div>
        <TerminalCurData mac={mac} pid={dev.pid} />
      </div>
    </Drawer>
  )
}
