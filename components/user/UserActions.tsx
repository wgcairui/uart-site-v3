'use client'

import { useState } from 'react'
import { Input, Modal, message } from 'antd'
import {
  SwapOutlined,
  KeyOutlined,
  RetweetOutlined,
  LoginOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { toggleUserGroup, resetUserPassword, simulateLogin } from '@/lib/api/fetchRoot'

interface UserActionsProps {
  user: Uart.UserInfo
  onChange?: () => void
}

/**
 * UserActions · 用户操作玻璃卡 (v3 hybrid Page B, 跟 DeviceActions 对齐)
 *
 * 4 操作按钮 (跟原 PageHeader extra + UserDes Space 合并):
 * - primary: 模拟登录
 * - 切换用户组 (admin ↔ user)
 * - 修改密码
 * - danger: 资源迁移 (hidden if userGroup === 'root')
 *
 * 视觉: 复用 globals.css 的 .device-actions-v3 玻璃风
 */
export function UserActions({ user, onChange }: UserActionsProps) {
  const [pwdOpen, setPwdOpen] = useState(false)
  const [newPwd, setNewPwd] = useState('')

  const handleSwitchGroup = () => {
    Modal.confirm({
      content: `是否变更用户 ${user.name || user.user} 为 [${user.userGroup === 'admin' ? 'user' : 'admin'}]`,
      onOk() {
        return toggleUserGroup(user.user).then((el) => {
          if (el.code) {
            message.success(el.data || '已切换')
            onChange?.()
          } else {
            message.error(el.message || '切换失败')
          }
        })
      },
    })
  }

  const handleSimulateLogin = () => {
    simulateLogin(user.user).then(({ code, data: tokenData, message: msg }) => {
      if (code === 200 && tokenData?.token) {
        window.open(`/simulate-login?token=${encodeURIComponent(tokenData.token)}`, '_blank')
      } else {
        message.error(msg || '模拟登录失败')
      }
    })
  }

  const handleResetPwd = () => {
    if (!newPwd || newPwd.length < 6) {
      message.error('密码不能少于 6 位')
      return Promise.reject()
    }
    return resetUserPassword(user.user, newPwd).then((el) => {
      if (el.code) {
        message.success('密码修改成功')
        setPwdOpen(false)
        setNewPwd('')
      } else {
        message.error(el.message || '修改失败')
      }
    })
  }

  return (
    <>
      <div className="device-actions-v3">
        <h3>用户操作</h3>

        <button
          className="device-action-btn-v3 primary"
          onClick={handleSimulateLogin}
        >
          <span className="ico"><LoginOutlined /></span>
          <span className="grow">模拟登录</span>
          <span className="arrow">→</span>
        </button>

        <button
          className="device-action-btn-v3"
          onClick={handleSwitchGroup}
        >
          <span className="ico"><SwapOutlined /></span>
          <span className="grow">切换为 {user.userGroup === 'admin' ? 'user' : 'admin'}</span>
          <span className="arrow">→</span>
        </button>

        <button
          className="device-action-btn-v3"
          onClick={() => setPwdOpen(true)}
        >
          <span className="ico"><KeyOutlined /></span>
          <span className="grow">重置密码</span>
          <span className="arrow">→</span>
        </button>

        {user.userGroup !== 'root' && (
          <button
            className="device-action-btn-v3"
            onClick={() => {
              // 资源迁移 — dispatch custom event 给 page 弹 MigrateUserResourcesModal
              window.dispatchEvent(new CustomEvent('user-page:open-migrate', { detail: { user: user.user } }))
            }}
          >
            <span className="ico"><RetweetOutlined /></span>
            <span className="grow">资源迁移</span>
            <span className="arrow">→</span>
          </button>
        )}
      </div>

      <Modal
        title={`修改 [${user.user}] 的密码`}
        open={pwdOpen}
        onOk={handleResetPwd}
        onCancel={() => { setPwdOpen(false); setNewPwd('') }}
        okText="确认修改"
        cancelText="取消"
        destroyOnClose
      >
        <Input.Password
          autoFocus
          placeholder="请输入新密码 (至少 6 位)"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          onPressEnter={handleResetPwd}
        />
      </Modal>
    </>
  )
}
