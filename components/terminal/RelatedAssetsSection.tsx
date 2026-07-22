'use client'

/**
 * RelatedAssetsSection · 关联资产 (合并挂载设备 + 绑定用户)
 *
 * 替代原 MountDevicesStrip + BindUsersSection 2 个独立 section:
 * - 单 bento-card, 6+6 col split (12-col grid)
 * - 左: 挂载设备卡 (点击 → MountDevDetailDrawer)
 * - 右: 绑定用户卡 (点击 → 跳用户详情)
 *
 * 视觉: 玻璃 bento-card · 紫蓝渐变 header · 左右 2 区段
 * 减重: 2 section → 1 section, 首屏 section 数 5 → 4
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Tooltip, Empty, Button, Popconfirm, Modal, message, Avatar, Badge } from 'antd'
import {
  AppstoreOutlined,
  TeamOutlined,
  CheckCircleFilled,
  StopOutlined,
  CrownOutlined,
  UserDeleteOutlined,
  PlusOutlined,
  WarningFilled,
  PhoneOutlined,
  MailOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import { getTerminalBindUsers, setTerminalOwner } from '@/lib/api/endpoints/admin/terminals'
import { delUserTerminal } from '@/lib/api/endpoints/admin/users'
import { usePromise } from '@/lib/hooks/usePromise'
import { MyCopy } from '@/components/common/MyCopy'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'
import { TerminalAddMountDev } from './TerminalAddMountDev'
import { delTerminalMountDev } from '@/lib/api/fetch'
import { message as antdMessage } from 'antd'

interface RelatedAssetsSectionProps {
  mac: string
  share: boolean
  ownerId?: string
  mountDevs: Uart.TerminalMountDevs[]
  onChange?: () => void
}

export function RelatedAssetsSection({
  mac, share, ownerId, mountDevs, onChange,
}: RelatedAssetsSectionProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const list = Array.isArray(mountDevs) ? mountDevs : []

  // 绑定用户
  const { data: bindData, loading: bindLoading, fecth: bindFecth } = usePromise<{ items: Uart.UserInfo[]; total: number }>(
    async () => {
      const { data } = await getTerminalBindUsers(mac, { page: 1, pageSize: 50, needTotal: true })
      return { items: (data?.items as any) ?? [], total: (data?.pagination as any)?.total ?? 0 }
    },
    { items: [], total: 0 },
    [mac],
  )
  const userList = bindData.items || []

  // 挂载设备操作
  const delMountDev = (d: Uart.TerminalMountDevs) => {
    Modal.confirm({
      title: '解除挂载',
      content: `确认删除挂载设备: ${mac} / ${d.mountDev} (pid=${d.pid}) ?\n\n此操作不可逆。`,
      okText: '确认删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        const key = 'delMountDev-' + d.pid
        antdMessage.loading({ content: '删除中...', key })
        try {
          await delTerminalMountDev(mac, d.pid)
          antdMessage.success({ content: '已解除挂载', key })
          onChange?.()
        } catch (e: any) {
          antdMessage.error({ content: `失败: ${e?.message || e}`, key })
        }
      },
    })
  }

  // 用户操作
  const handleSetOwner = (user: string) => {
    setTerminalOwner(mac, user).then(() => {
      message.success('已设为主人')
      bindFecth()
      onChange?.()
    })
  }
  const handleUnbind = (user: string) => {
    Modal.confirm({
      title: `解绑用户 [${user}] ?`,
      content: '解绑后该用户无法访问此设备',
      okType: 'danger',
      onOk() {
        delUserTerminal(user, mac).then(() => {
          message.success('解绑成功')
          bindFecth()
          onChange?.()
        })
      },
    })
  }

  return (
    <>
      <div
        className="bento-card"
        style={{
          padding: 20,
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-bento)',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16,
            }}
          >
            <ApiOutlined />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>关联资产</h3>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              挂载 {list.length} · 绑定 {userList.length} · 分享 {share ? '开' : '关'} · 主人 {ownerId || '未设'}
            </div>
          </div>
        </div>

        {/* 6+6 col split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* 左: 挂载设备 */}
          <div style={{ gridColumn: 'span 6' }}>
            <SubHeader
              icon={<AppstoreOutlined />}
              title="挂载设备"
              count={list.length}
              action={
                <Button
                  type="primary" size="small" icon={<PlusOutlined />}
                  onClick={() => setAddOpen(true)}
                  style={{ borderRadius: 8 }}
                >
                  添加
                </Button>
              }
            />
            {list.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                    暂无挂载设备
                  </span>
                }
                style={{ padding: '20px 0' }}
              >
                <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                  添加设备
                </Button>
              </Empty>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                {list.map((d) => (
                  <MountDevMiniCard
                    key={`${mac}-${d.pid}`}
                    mac={mac}
                    dev={d}
                    onDelete={() => delMountDev(d)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 右: 绑定用户 */}
          <div style={{ gridColumn: 'span 6' }}>
            <SubHeader
              icon={<TeamOutlined />}
              title="绑定用户"
              count={userList.length}
            />
            {userList.length === 0 ? (
              bindLoading ? null : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                      暂无绑定用户
                    </span>
                  }
                  style={{ padding: '20px 0' }}
                />
              )
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                {userList.map((u) => (
                  <UserMiniCard
                    key={u.user}
                    user={u}
                    isOwner={u.user === ownerId}
                    onClick={() => router.push(`/admin/node/user/info/${encodeURIComponent(u.user)}`)}
                    onSetOwner={() => handleSetOwner(u.user)}
                    onUnbind={() => handleUnbind(u.user)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer 详情 (保留组件, 暂不主动使用, 留作 quick peek 备用) */}

      {/* 添加挂载设备 modal */}
      <TerminalAddMountDev
        visible={addOpen}
        mac={mac}
        onCancel={() => setAddOpen(false)}
        onChange={() => { onChange?.(); setAddOpen(false) }}
      />
    </>
  )
}

/* ─── 内部子组件 ─────────────────────────────────────── */

function SubHeader({ icon, title, count, action }: { icon: React.ReactNode; title: string; count: number; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ color: 'var(--brand-500)', fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)' }}>{title}</span>
      <Badge count={count} showZero color={count > 0 ? 'var(--brand-500)' : 'var(--ink-300)'} />
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  )
}

function MountDevMiniCard({
  mac, dev, onDelete,
}: {
  mac: string
  dev: Uart.TerminalMountDevs
  onDelete: () => void
}) {
  const router = useRouter()
  const online = !!dev.online
  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />
  const lastEmit = (dev as any).lastEmit
  const lastRecord = (dev as any).lastRecord

  return (
    <div
      onClick={() => router.push(`/admin/node/terminal/${mac}/mount-dev/${dev.pid}`)}
      style={{
        background: online
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.04) 0%, rgba(245, 158, 11, 0.04) 100%)',
        border: online ? '1px solid rgba(16, 185, 129, 0.18)' : '1px solid rgba(245, 158, 11, 0.20)',
        borderRadius: 12,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex', flexDirection: 'column', gap: 6,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 20, color: online ? 'var(--color-success)' : 'var(--color-warning)' }}>{iconEl}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dev.mountDev}>
            {dev.mountDev || '未命名'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
            PID {dev.pid} · {dev.protocol || '未配置'}
          </div>
        </div>
        {online ? <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 12 }} /> : <WarningFilled style={{ color: 'var(--color-warning)', fontSize: 12 }} />}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Tag color="purple" style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          {dev.Type || '?'}
        </Tag>
        {lastRecord ? (
          <Tag style={{ margin: 0, fontSize: 10 }}>
            采集 {new Date(lastRecord).toLocaleTimeString().slice(0, 5)}
          </Tag>
        ) : null}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 2,
          paddingTop: 6,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
          fontSize: 12,
        }}
      >
        <Tooltip title="查看完整详情 (新页)">
          <Button
            size="small"
            type="text"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/admin/node/terminal/${mac}/mount-dev/${dev.pid}`)
            }}
          >
            查看
          </Button>
        </Tooltip>
        <Popconfirm
          title={`确认删除 [${dev.mountDev}] ?`}
          onConfirm={(e) => { e?.stopPropagation(); onDelete() }}
          onCancel={(e) => e?.stopPropagation()}
          okType="danger"
        >
          <Tooltip title="删除">
            <Button size="small" type="text" danger icon={<UserDeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  )
}

function UserMiniCard({
  user, isOwner, onClick, onSetOwner, onUnbind,
}: {
  user: Uart.UserInfo
  isOwner: boolean
  onClick: () => void
  onSetOwner: () => void
  onUnbind: () => void
}) {
  const active = user.status !== false
  return (
    <div
      onClick={onClick}
      style={{
        background: active
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)'
          : 'rgba(241, 245, 249, 0.6)',
        border: isOwner
          ? '1px solid rgba(245, 158, 11, 0.4)'
          : active
          ? '1px solid rgba(99, 102, 241, 0.18)'
          : '1px solid var(--ink-200)',
        borderRadius: 12,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex', flexDirection: 'column', gap: 6,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar
          size={32}
          src={user.avanter}
          style={{
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            fontSize: 12, fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {(user.name || user.user || '?').slice(0, 1).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-900)',
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={user.name || user.user}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.user}
            </span>
            {isOwner ? <CrownOutlined style={{ color: 'var(--color-warning)', fontSize: 11 }} /> : null}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={user.user}>
            {user.user}
          </div>
        </div>
        {active ? <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 11 }} /> : <StopOutlined style={{ color: 'var(--ink-400)', fontSize: 11 }} />}
      </div>

      {(user.tel || user.mail) && (
        <div style={{ fontSize: 10, color: 'var(--ink-700)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {user.tel ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined style={{ color: 'var(--ink-400)' }} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{user.tel}</span>
            </span>
          ) : null}
          {user.mail ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <MailOutlined style={{ color: 'var(--ink-400)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.mail}</span>
            </span>
          ) : null}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 2,
          paddingTop: 6,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
          fontSize: 12,
        }}
      >
        {!isOwner && (
          <Tooltip title="设为主人">
            <Button size="small" type="text" icon={<CrownOutlined style={{ color: 'var(--color-warning)' }} />} onClick={onSetOwner} />
          </Tooltip>
        )}
        <Popconfirm
          title={`解绑 [${user.user}] ?`}
          okType="danger"
          onConfirm={(e) => { e?.stopPropagation(); onUnbind() }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Tooltip title="解绑">
            <Button size="small" type="text" danger icon={<UserDeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  )
}
