'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Tooltip, Empty, Button, Popconfirm, Modal, message, Dropdown, Descriptions } from 'antd'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  WarningFilled,
  PlusOutlined,
  EyeFilled,
  DeleteFilled,
  DownOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'
import { delTerminalMountDev, refreshDevTimeOut } from '@/lib/api/fetch'
import { getNodeInstructQueryMac } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'
import { prompt } from '@/lib/utils/prompt'
import { TerminalAddMountDev } from './TerminalAddMountDev'
import { TerminalDevPage } from './TerminalDevPage'

interface MountDevicesStripProps {
  mac: string
  mountDevs: Uart.TerminalMountDevs[]
  onChange?: () => void
}

/**
 * MountDevicesStrip · 终端挂载设备完整管理 (v3 hybrid Page B 配套, #32 增强)
 *
 * 把原本藏在「挂载设备」tab 里的完整管理 (image / add / delete / refresh / view)
 * 提到主视图, 1 块玻璃 bento-card 搞定, 删掉重复 tab。
 *
 * 视觉: 玻璃 bento-card · 3-4 col grid (自动 wrap) · 紫光 hover
 * 功能: 添加 / 删除 / 编辑查看 (弹窗) / 查询间隔调整
 * 防御: 缺字段 '?' 兜底, trial mode 无 mountDevs 显示空状态
 */
export function MountDevicesStrip({ mac, mountDevs, onChange }: MountDevicesStripProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [devModal, setDevModal] = useState<{ pid: number } | null>(null)
  const list = Array.isArray(mountDevs) ? mountDevs : []

  const delMountDev = (dev: Uart.TerminalMountDevs) => {
    Modal.confirm({
      content: `确认删除挂载设备:${mac}/${dev.pid} ?`,
      okType: 'danger',
      onOk() {
        const key = 'delTerminalMountDev' + mac + dev.pid
        message.loading({ content: '加载中...', key })
        delTerminalMountDev(mac, dev.pid).then(() => {
          message.success({ content: '删除成功', key })
          onChange?.()
        })
      },
    })
  }

  return (
    <div
      className="bento-card"
      style={{
        padding: 20,
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'var(--shadow-bento)',
        borderRadius: 'var(--radius-2xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #06b6d4 0%, var(--brand-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <AppstoreOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>挂载设备</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {list.length} 个子设备 · 完整管理 (增/删/查/间隔)
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
            style={{ borderRadius: 8 }}
          >
            添加设备
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>
              暂无挂载设备 · 点击右上「添加设备」注册
            </span>
          }
          style={{ padding: '24px 0' }}
        >
          <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            添加设备
          </Button>
        </Empty>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
            padding: '4px 2px 8px',
          }}
        >
          {list.map((dev) => (
            <MountDevCard
              key={`${mac}-${dev.pid}`}
              mac={mac}
              dev={dev}
              onView={() => setDevModal({ pid: dev.pid })}
              onDelete={() => delMountDev(dev)}
              onDetailTab={() => router.push(`/admin/node/terminal/${mac}?tab=${dev.pid}`)}
            />
          ))}
        </div>
      )}

      <Modal
        title="设备详情"
        open={!!devModal}
        onCancel={() => setDevModal(null)}
        footer={null}
        width={900}
      >
        {devModal ? <TerminalDevPage mac={mac} pid={devModal.pid} /> : null}
      </Modal>

      <TerminalAddMountDev
        visible={addOpen}
        mac={mac}
        onCancel={() => setAddOpen(false)}
        onChange={() => { onChange?.(); setAddOpen(false) }}
      />
    </div>
  )
}

/** 单个挂载设备完整卡 (含 image / actions / refresh interval) */
function MountDevCard({
  mac,
  dev,
  onView,
  onDelete,
  onDetailTab,
}: {
  mac: string
  dev: Uart.TerminalMountDevs
  onView: () => void
  onDelete: () => void
  onDetailTab: () => void
}) {
  const online = !!dev.online
  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />
  const imgSrc = (devType as Record<string, string>)[dev.Type]
  const lastEmit = (dev as any).lastEmit
  const lastRecord = (dev as any).lastRecord
  const minQueryLimit = (dev as any).minQueryLimit

  return (
    <div
      onClick={onDetailTab}
      style={{
        background: online
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.04) 0%, rgba(245, 158, 11, 0.04) 100%)',
        border: online
          ? '1px solid rgba(16, 185, 129, 0.18)'
          : '1px solid rgba(245, 158, 11, 0.20)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-bento-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* image cover (fallback to icon) */}
      {imgSrc ? (
        <div
          style={{
            height: 80,
            background: `url(${imgSrc}) center/cover no-repeat, rgba(255,255,255,0.5)`,
            borderBottom: '1px solid var(--ink-100)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 999, padding: '2px 8px',
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
              color: online ? 'var(--color-success)' : 'var(--color-warning)',
              boxShadow: '0 2px 6px -2px rgba(0,0,0,0.15)',
            }}
          >
            {online ? '● ONLINE' : '● OFFLINE'}
          </div>
        </div>
      ) : (
        <div
          style={{
            height: 60,
            background: 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: '1px solid var(--ink-100)',
            color: online ? 'var(--color-success)' : 'var(--color-warning)',
            fontSize: 32,
          }}
        >
          {iconEl}
        </div>
      )}

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 18, color: 'var(--ink-700)' }}>{iconEl}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13, fontWeight: 600, color: 'var(--ink-900)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title={dev.mountDev}
            >
              {dev.mountDev || '未命名'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
              PID {dev.pid} · {dev.Type || '?'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Tag color="purple" style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            {dev.protocol || '未配置'}
          </Tag>
          {minQueryLimit != null ? (
            <Tag style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              间隔 {minQueryLimit}ms
            </Tag>
          ) : null}
        </div>

        {(lastEmit || lastRecord) && (
          <div style={{ fontSize: 10, color: 'var(--ink-500)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lastEmit ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CloudUploadOutlined /> 上行: {dayjs(lastEmit).format('MM-DD HH:mm:ss')}
              </span>
            ) : null}
            {lastRecord ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CloudDownloadOutlined /> 采集: {dayjs(lastRecord).format('MM-DD HH:mm:ss')}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '8px 12px',
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
          fontSize: 12, color: 'var(--ink-500)',
          background: 'rgba(255,255,255,0.4)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ink-500)' }}>
          {online ? <CheckCircleFilled style={{ color: 'var(--color-success)' }} /> : <WarningFilled style={{ color: 'var(--color-warning)' }} />}
          {online ? '在线' : '离线'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <Tooltip title="编辑查看">
            <EyeFilled
              style={{ color: '#67c23b', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onView() }}
            />
          </Tooltip>
          <Popconfirm
            title={`确认删除设备[${dev.mountDev}]?`}
            onConfirm={(e) => { e?.stopPropagation(); onDelete() }}
            onCancel={(e) => e?.stopPropagation()}
            okType="danger"
          >
            <Tooltip title="删除">
              <DeleteFilled
                style={{ color: '#e6a23b', cursor: 'pointer' }}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
          <InterValToop mac={mac} pid={dev.pid} />
        </span>
      </div>
    </div>
  )
}

/** 查询间隔下拉 (复用 TerminalMountDevs 逻辑) */
function InterValToop({ mac, pid }: { mac: string; pid: number }) {
  const { data: interval, loading, fecth } = usePromise(
    async () => {
      const { data } = await getNodeInstructQueryMac(mac, pid)
      return data
    },
    0,
    [mac, pid],
  )

  const refreshInterval = () => {
    prompt({
      title: '设置设备查询间隔',
      placeholder: '输入间隔毫秒数,(值为x1000的倍数),未设置则为默认值',
      onOk(val) {
        let v: string | undefined = val
        const n = Number(val)
        if (val && !Number.isNaN(n)) {
          if (n < 1000) v = undefined
          else if (n % 1000 > 0) v = String(n - (n % 1000))
        }
        refreshDevTimeOut(mac, pid, Number(v)).then(() => {
          message.success('重置完成,等待数据刷新')
        })
        return true
      },
    })
  }

  if (loading) return <span style={{ color: 'var(--ink-300)' }}>…</span>

  return (
    <Tooltip title="查询间隔">
      <Dropdown
        menu={{
          items: [
            { key: 'refresh', label: '刷新', onClick: ({ domEvent }) => { domEvent.stopPropagation(); fecth() } },
            { key: 'reset', label: '重置', danger: true, onClick: ({ domEvent }) => { domEvent.stopPropagation(); refreshInterval() } },
          ],
        }}
        trigger={['click']}
      >
        <span onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', color: 'var(--ink-700)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {interval / 1000}秒<DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
        </span>
      </Dropdown>
    </Tooltip>
  )
}
