'use client'

import { useState } from 'react'
import { Tooltip, Tag, Input, message, Avatar, Modal, Button } from 'antd'
import {
  InfoCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  NumberOutlined,
  WechatOutlined,
  ApiOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  EditOutlined,
  CheckCircleFilled,
  StopOutlined,
  CopyOutlined,
  AppstoreOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { toggleUserGroup, modifyUserRemark } from '@/lib/api/fetchRoot'

interface UserOverviewProps {
  user: Uart.UserInfo
  onChange?: () => void
}

interface KVItem {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  copyable?: string | undefined
  fullWidth?: boolean | undefined
}

const RG_TYPE_LABEL: Record<string, string> = {
  wx: '微信',
  web: '网页',
  app: 'APP',
  pesiv: 'Pesiv',
}

/**
 * UserOverview · 用户信息卡 (v3 hybrid Page B 配套, 跟 TerminalOverview 对齐)
 *
 * 把原本藏在「详细信息」tab 里的 15 字段 (UserDes) 提到主视图, 删掉重复 tab。
 *
 * 15 KV · 3x5 grid (响应式):
 * - 账号 / 昵称 / 用户组
 * - 邮箱 / 电话 / 组织
 * - 注册类型 / userId / wxId
 * - wpId / openId / 状态
 * - 创建时间 / 修改时间 / 登录 IP
 * - 转发配置 / 备注 (full width)
 *
 * 视觉: 玻璃 bento-card 16px padding · 18px 圆角 · 紫光阴影
 * 防御: 所有字段 ?? '-' 兜底, trial mode 缺数据也漂亮渲染
 */
export function UserOverview({ user, onChange }: UserOverviewProps) {
  const u = user
  const active = u.status !== false
  const isAdmin = u.userGroup === 'admin' || u.userGroup === 'root'

  const items: KVItem[] = [
    {
      label: '账号',
      icon: <UserOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.user || '-'}</span>,
      copyable: u.user || undefined,
    },
    {
      label: '昵称',
      value: u.name || '-',
      copyable: u.name || undefined,
    },
    {
      label: '用户组',
      value: u.userGroup ? (
        <Tag color={isAdmin ? 'purple' : 'blue'} style={{ margin: 0 }}>
          {u.userGroup}
        </Tag>
      ) : '-',
    },
    {
      label: '邮箱',
      icon: <MailOutlined />,
      value: u.mail ? (
        <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.mail}
        </span>
      ) : '-',
      copyable: u.mail || undefined,
    },
    {
      label: '电话',
      icon: <PhoneOutlined />,
      value: u.tel != null ? (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{u.tel}</span>
      ) : '-',
      copyable: u.tel != null ? String(u.tel) : undefined,
    },
    {
      label: '组织',
      icon: <BankOutlined />,
      value: u.company || '-',
    },
    {
      label: '注册类型',
      icon: <AppstoreOutlined />,
      value: u.rgtype ? (
        <Tag color="cyan" style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>
          {RG_TYPE_LABEL[u.rgtype] || u.rgtype}
        </Tag>
      ) : '-',
    },
    {
      label: '开放 ID',
      icon: <IdcardOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.userId || '-'}</span>,
      copyable: u.userId || undefined,
    },
    {
      label: '公众号 ID',
      icon: <WechatOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.wxId || '-'}</span>,
      copyable: u.wxId || undefined,
    },
    {
      label: '小程序 ID',
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.wpId || '-'}</span>,
      copyable: u.wpId || undefined,
    },
    {
      label: 'OpenID',
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.openId || '-'}</span>,
      copyable: u.openId || undefined,
    },
    {
      label: '状态',
      icon: <ApiOutlined />,
      value: active ? (
        <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CheckCircleFilled /> 正常
        </span>
      ) : (
        <span style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <StopOutlined /> 停用
        </span>
      ),
    },
    {
      label: '创建时间',
      icon: <ClockCircleOutlined />,
      value: u.creatTime ? (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(u.creatTime).format('YYYY-MM-DD HH:mm')}</span>
      ) : '-',
    },
    {
      label: '修改时间',
      icon: <ClockCircleOutlined />,
      value: u.modifyTime ? (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(u.modifyTime).format('YYYY-MM-DD HH:mm')}</span>
      ) : '-',
    },
    {
      label: '登录 IP',
      icon: <GlobalOutlined />,
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.address || '-'}</span>,
      copyable: u.address || undefined,
    },
    {
      label: '转发配置',
      value: <span style={{ fontFamily: 'var(--font-mono)' }}>{u.proxy || '-'}</span>,
      copyable: u.proxy || undefined,
    },
    {
      label: '备注',
      icon: <EditOutlined />,
      value: <RemarkText user={u} {...(onChange ? { onChange } : {})} />,
      fullWidth: true,
    },
  ]

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg-panel)', fontSize: 16,
          }}
        >
          <InfoCircleOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>用户信息</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            静态资料 · {items.filter((i) => !i.fullWidth).length} KV
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Tag color={isAdmin ? 'purple' : 'default'}>{u.userGroup || '未分组'}</Tag>
        </div>
      </div>

      <div
        className="user-overview-kv"
        style={{
          gap: '4px 18px',
          flex: 1,
          alignContent: 'start',
        }}
      >
        {items.filter((i) => !i.fullWidth).map((it, i) => (
          <KVRow key={i} item={it} />
        ))}
      </div>

      {/* full-width 备注行 */}
      {items.filter((i) => i.fullWidth).map((it, i) => (
        <div
          key={`fw-${i}`}
          style={{
            marginTop: 4,
            paddingTop: 12,
            borderTop: '1px dashed var(--ink-200)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-500)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {it.icon}
            {it.label}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-700)',
              fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {it.value}
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
        }}
      >
        <span>用户 ID: {u._id || '-'}</span>
        <span>rgtype: {u.rgtype || '-'}</span>
      </div>
    </div>
  )
}

function KVRow({ item }: { item: KVItem }) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--ink-100)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-500)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {item.icon}
        {item.label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--ink-900)',
          fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={typeof item.value === 'string' ? item.value : undefined}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
        {item.copyable ? (
          <Tooltip title="复制">
            <CopyOutlined
              style={{ color: 'var(--ink-400)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => {
                navigator.clipboard?.writeText(item.copyable!)
              }}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function RemarkText({ user, onChange }: { user: Uart.UserInfo; onChange?: () => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(user.remark || '')

  const save = () => {
    if (val === (user.remark || '')) {
      setEditing(false)
      return
    }
    modifyUserRemark(user.user, val).then(() => {
      message.success('备注已更新')
      setEditing(false)
      onChange?.()
    })
  }

  if (editing) {
    return (
      <Input.TextArea
        autoFocus
        size="small"
        rows={2}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={(e) => {
          e.preventDefault()
          save()
        }}
        onBlur={save}
        placeholder="点击编辑备注"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        color: user.remark ? 'var(--ink-700)' : 'var(--ink-400)',
        flex: 1,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.remark || '点击编辑备注...'}
      </span>
      <EditOutlined style={{ color: 'var(--ink-400)', fontSize: 12 }} />
    </span>
  )
}
