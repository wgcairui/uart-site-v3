'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Tooltip, Empty, Button, Popconfirm, Modal, message, Avatar } from 'antd'
import {
  TeamOutlined,
  CheckCircleFilled,
  StopOutlined,
  CrownOutlined,
  UserDeleteOutlined,
  CopyOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { getTerminalBindUsers, setTerminalOwner } from '@/lib/api/endpoints/admin/terminals'
import { delUserTerminal } from '@/lib/api/endpoints/admin/users'
import { usePromise } from '@/lib/hooks/usePromise'
import { MyCopy } from '@/components/common/MyCopy'

interface BindUsersSectionProps {
  mac: string
  share: boolean
  ownerId?: string
  onChange?: () => void
}

/**
 * BindUsersSection · 设备绑定用户主视图 section (v3 hybrid Page B, #32 简化)
 *
 * 不要原 TerminalBindUsers 那种全表 (10+ 列 + 分页 + 搜索), 跟挂载设备对齐风格:
 * - compact card 列表, 每用户 1 张
 * - 头像 + 昵称 + 账号 + 手机 + 邮箱 + 状态
 * - actions on hover: 设为主人 / 解绑
 * - 主视图直接展示, 不进 tab
 *
 * 视觉: 玻璃 bento-card · auto-fill grid · 紫光 hover
 * 数据: getTerminalBindUsers (server endpoint, 1 页拉完即可)
 */
export function BindUsersSection({ mac, share, ownerId, onChange }: BindUsersSectionProps) {
  const router = useRouter()
  const { data, loading, fecth } = usePromise<{ items: Uart.UserInfo[]; total: number }>(
    async () => {
      const { data } = await getTerminalBindUsers(mac, { page: 1, pageSize: 50, needTotal: true })
      return { items: (data?.items as any) ?? [], total: (data?.pagination as any)?.total ?? 0 }
    },
    { items: [], total: 0 },
    [mac],
  )

  const list = data.items || []

  const handleSetOwner = (user: string) => {
    setTerminalOwner(mac, user).then(() => {
      message.success('已设为主人')
      fecth()
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
          fecth()
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
            background: 'linear-gradient(135deg, var(--color-info) 0%, var(--brand-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <TeamOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>设备绑定用户</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {list.length} 个用户 · 分享: {share ? '开启' : '关闭'} · 主人: {ownerId ? <Tag color="gold" style={{ margin: 0, fontSize: 10 }}><CrownOutlined /> {ownerId}</Tag> : '未设'}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        loading ? null : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: 'var(--ink-500)', fontSize: 13 }}>
                暂无绑定用户
              </span>
            }
            style={{ padding: '24px 0' }}
          />
        )
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
            padding: '4px 2px 8px',
          }}
        >
          {list.map((u) => (
            <UserCard
              key={u.user}
              user={u}
              isOwner={u.user === ownerId}
              onSetOwner={() => handleSetOwner(u.user)}
              onUnbind={() => handleUnbind(u.user)}
              onClick={() => router.push(`/admin/node/user/info/${encodeURIComponent(u.user)}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({
  user,
  isOwner,
  onSetOwner,
  onUnbind,
  onClick,
}: {
  user: Uart.UserInfo
  isOwner: boolean
  onSetOwner: () => void
  onUnbind: () => void
  onClick: () => void
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
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar
          size={40}
          src={user.avanter}
          style={{
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            fontSize: 14, fontWeight: 600,
          }}
        >
          {(user.name || user.user || '?').slice(0, 1).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            title={user.name || user.user}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.user}
            </span>
            {isOwner ? <CrownOutlined style={{ color: 'var(--color-warning)', fontSize: 12 }} /> : null}
          </div>
          <div
            style={{
              fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title={user.user}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.user}</span>
            <MyCopy value={user.user} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Tag
          color={active ? 'success' : 'default'}
          style={{ margin: 0, fontSize: 10 }}
          icon={active ? <CheckCircleFilled /> : <StopOutlined />}
        >
          {active ? '正常' : '停用'}
        </Tag>
        {user.rgtype ? (
          <Tag style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            {user.rgtype}
          </Tag>
        ) : null}
        {user.userGroup ? (
          <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
            {user.userGroup}
          </Tag>
        ) : null}
      </div>

      {(user.tel || user.mail) && (
        <div style={{ fontSize: 11, color: 'var(--ink-700)', display: 'flex', flexDirection: 'column', gap: 3 }}>
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
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
          fontSize: 13,
        }}
      >
        {!isOwner ? (
          <Tooltip title="设为主人">
            <Button
              size="small"
              type="text"
              icon={<CrownOutlined style={{ color: 'var(--color-warning)' }} />}
              onClick={onSetOwner}
            />
          </Tooltip>
        ) : null}
        <Popconfirm
          title={`解绑 [${user.user}] ?`}
          okType="danger"
          onConfirm={(e) => { e?.stopPropagation(); onUnbind() }}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Tooltip title="解绑">
            <Button
              size="small"
              type="text"
              danger
              icon={<UserDeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  )
}
