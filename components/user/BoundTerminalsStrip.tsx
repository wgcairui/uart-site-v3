'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tag,
  Tooltip,
  Empty,
  Button,
  Popconfirm,
  Modal,
  message,
  Dropdown,
} from 'antd'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  WarningFilled,
  PlusOutlined,
  DeleteFilled,
  EyeFilled,
  DownOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { BindDev, delUserTerminal, getTerminals, setTerminalOnline, changeShareApi } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'
import { AddUserTerminalModal } from '@/components/common/AddUserTerminalModal'
import { MyCopy } from '@/components/common/MyCopy'

interface BoundTerminalsStripProps {
  user: string
  onChange?: () => void
}

/**
 * BoundTerminalsStrip · 用户绑定设备主视图 section (v3 hybrid Page B, 仿 MountDevicesStrip)
 *
 * 把原「挂载设备」tab 里的完整管理 (add / delete / view / set online / share)
 * 提到主视图, 1 块玻璃 bento-card 搞定, 删掉重复 tab。
 *
 * 视觉: 玻璃 bento-card · auto-fill grid (minmax 280px) · 紫光 hover
 * 功能: 添加新设备 / 解绑 / 查看 / 切换在线 / 切换共享
 * 防御: 缺字段 '?' 兜底, trial mode 无数据显示空状态
 */
export function BoundTerminalsStrip({ user, onChange }: BoundTerminalsStripProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)

  const { data, loading, fecth } = usePromise<{ items: Uart.Terminal[]; total: number }>(
    async () => {
      const { data: resp } = await BindDev(user)
      const uts = (resp as any)?.UTs || []
      return { items: uts, total: uts.length }
    },
    { items: [], total: 0 },
    [user],
  )

  const list = Array.isArray(data.items) ? data.items : []
  const onlineCount = list.filter((t) => t.online).length

  const handleUnbind = (dev: Uart.Terminal) => {
    Modal.confirm({
      title: `解绑设备 [${dev.name || dev.DevMac}] ?`,
      content: '解绑后该用户无法访问此设备',
      okType: 'danger',
      onOk() {
        delUserTerminal(user, dev.DevMac).then(() => {
          message.success('解绑成功')
          fecth()
          onChange?.()
        })
      },
    })
  }

  const handleToggleOnline = (dev: Uart.Terminal) => {
    setTerminalOnline(dev.DevMac, !dev.online).then(() => {
      message.info('状态已切换')
      fecth()
      onChange?.()
    })
  }

  const handleToggleShare = (dev: Uart.Terminal) => {
    changeShareApi(dev.DevMac).then((el) => {
      if (el.code) {
        message.info('共享状态已切换')
        fecth()
        onChange?.()
      } else {
        message.error(el.message)
      }
    })
  }

  return (
    <>
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>绑定设备</h3>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {list.length} 台 · {onlineCount} 在线 · 完整管理 (增/删/查)
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
          loading ? null : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>
                  暂无绑定设备
                </span>
              }
              style={{ padding: '24px 0' }}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                添加第一台设备
              </Button>
            </Empty>
          )
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
              padding: '4px 2px 8px',
            }}
          >
            {list.map((t) => (
              <TerminalCard
                key={t.DevMac}
                terminal={t}
                onView={() => router.push(`/admin/node/terminal/${encodeURIComponent(t.DevMac)}`)}
                onUnbind={() => handleUnbind(t)}
                onToggleOnline={() => handleToggleOnline(t)}
                onToggleShare={() => handleToggleShare(t)}
              />
            ))}
          </div>
        )}
      </div>

      <AddUserTerminalModal
        visible={addOpen}
        user={user}
        onCancel={() => setAddOpen(false)}
        onSuccess={() => { fecth(); onChange?.() }}
      />
    </>
  )
}

function TerminalCard({
  terminal: t,
  onView,
  onUnbind,
  onToggleOnline,
  onToggleShare,
}: {
  terminal: Uart.Terminal
  onView: () => void
  onUnbind: () => void
  onToggleOnline: () => void
  onToggleShare: () => void
}) {
  const online = !!t.online
  const mountDevCount = t.mountDevs?.length ?? 0

  return (
    <div
      style={{
        background: online
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(99, 102, 241, 0.04) 100%)'
          : 'rgba(241, 245, 249, 0.6)',
        border: online
          ? '1px solid rgba(16, 185, 129, 0.25)'
          : '1px solid var(--ink-200)',
        borderRadius: 14,
        padding: 14,
        transition: 'all 0.2s var(--ease)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
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
      {/* 顶部: 设备图 + 状态 + 名称 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20, flexShrink: 0,
            boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.3)',
          }}
        >
          <ApiOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              display: 'flex', alignItems: 'center', gap: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={t.name || t.DevMac}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name || t.DevMac}</span>
            {online ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-success)' }}>
                <CheckCircleFilled style={{ fontSize: 11 }} />
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-warning)' }}>
                <WarningFilled style={{ fontSize: 11 }} />
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title={t.DevMac}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.DevMac}</span>
            <MyCopy value={t.DevMac} />
          </div>
        </div>
      </div>

      {/* 设备 KV 缩略 */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
          fontSize: 11, color: 'var(--ink-700)',
        }}
      >
        <KV label="节点" value={t.mountNode || '-'} />
        <KV label="型号" value={t.PID || '-'} mono />
        <KV label="协议" value={(t as any).protocol || (t.mountDevs?.[0]?.protocol) || '-'} />
        <KV label="挂载" value={`${mountDevCount} 个`} />
      </div>

      {/* 标签 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {online ? (
          <Tag color="success" style={{ margin: 0, fontSize: 10 }} icon={<CheckCircleFilled />}>
            在线
          </Tag>
        ) : (
          <Tag style={{ margin: 0, fontSize: 10 }} icon={<WarningFilled />}>
            离线
          </Tag>
        )}
        {t.share ? (
          <Tag color="processing" style={{ margin: 0, fontSize: 10 }}>共享</Tag>
        ) : null}
        {t.disable ? (
          <Tag color="error" style={{ margin: 0, fontSize: 10 }}>已停用</Tag>
        ) : null}
        {t.AT ? (
          <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>AT</Tag>
        ) : null}
      </div>

      {/* 更新时间 */}
      <div
        style={{
          fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)',
          display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>更新: {t.uptime ? dayjs(t.uptime).format('MM-DD HH:mm') : '-'}</span>
        {t.ip ? <span style={{ color: 'var(--ink-500)' }}>{t.ip}</span> : null}
      </div>

      {/* actions 行 */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
          fontSize: 13,
        }}
      >
        <Tooltip title="查看详情">
          <Button
            size="small"
            type="text"
            icon={<EyeFilled style={{ color: 'var(--brand-500)' }} />}
            onClick={onView}
          />
        </Tooltip>
        <Dropdown
          menu={{
            items: [
              { key: 'online', label: `设置${t.online ? '离' : '在'}线`, onClick: onToggleOnline },
              { key: 'share', label: `切换${t.share ? '为非' : ''}共享`, onClick: onToggleShare },
            ],
          }}
        >
          <Button size="small" type="text" icon={<DownOutlined style={{ fontSize: 11 }} />} />
        </Dropdown>
        <Popconfirm
          title={`解绑 [${t.DevMac}] ?`}
          okType="danger"
          onConfirm={onUnbind}
        >
          <Tooltip title="解绑">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteFilled />}
            />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ color: 'var(--ink-400)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}:</span>
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          color: 'var(--ink-700)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 11, fontWeight: 500,
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}
