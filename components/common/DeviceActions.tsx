'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  AudioOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  DisconnectOutlined,
  ApiOutlined,
  CheckCircleFilled,
  WarningFilled,
  EyeOutlined,
  EyeInvisibleOutlined,
  WifiOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { Tooltip, Modal, Input, message, Popover, Empty, Spin } from 'antd'
import dayjs from 'dayjs'
import {
  SendProcotolInstructSet,
  sendATInstruct,
  addListenMac,
  delListenMac,
  setTerminalOnline,
  initTerminal,
} from '@/lib/api/fetchRoot'
import { delTerminalMountDev } from '@/lib/api/fetch'

interface DeviceActionsProps {
  terminal: Uart.Terminal
  /** 标题 */
  title?: string
  /** 操作成功后回调 (用于父组件刷新数据) */
  onChange?: () => void
}

/**
 * DeviceActions · 设备操作玻璃卡 v2 (4 区)
 *
 * 之前 v1 是个 5 按钮导航栏, 4/5 按钮是 stub 或跳错 tab。
 * v2 重构: 把卡片拆成 4 区, 每区职责清晰, 操作按钮全部真做事 (调 API)。
 *
 *  ┌─ 1. 状态快照 ────────────┐   4 行 KV, 不依赖滚动到 Tabs 也能看
 *  │  状态 · iotStat · 最近活动 · 挂载设备
 *  ├─ 2. 立即操作 ────────────┤   3 个按钮, 全部直接调 API 不跳 tab
 *  │  立即读取 · 发送 AT · 监听 console 切换
 *  ├─ 3. 跳转链接 ────────────┤   1 行文字链接, 冗余但快
 *  │  AT 调试 · 告警历史 · 指令调试
 *  └─ 4. 危险操作 ────────────┘   红色独立区, 每个按钮单独确认
 *     强制离线 · 重置终端 · 解除挂载 (含 picker)
 */
export function DeviceActions({ terminal, title = '设备操作', onChange }: DeviceActionsProps) {
  const router = useRouter()
  const t = terminal
  const mountDevs = Array.isArray(t.mountDevs) ? t.mountDevs : []
  const online = !!t.online

  // ─── 2. 立即读取 — 多 mountDev 时弹 picker ──────────────────────
  const [readPickerOpen, setReadPickerOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const handleReadNow = async (mountDev: Uart.TerminalMountDevs) => {
    const key = 'readNow-' + mountDev.pid
    setReading(true)
    message.loading({ content: `读取 ${mountDev.mountDev}...`, key })
    try {
      // 通用 "读" 指令 — content 留空, 由 server 解析为协议默认查询
      const { code, message: m } = await SendProcotolInstructSet({
        DevMac: t.DevMac,
        pid: mountDev.pid,
        protocol: mountDev.protocol,
        content: 'READ',
      })
      if (code === 200) {
        message.success({ content: '读取已发送, 请到「指令调试」tab 看回包', key })
      } else {
        message.warning({ content: `读取失败: ${m}`, key })
      }
    } catch (e: any) {
      message.error({ content: `读取异常: ${e?.message || e}`, key })
    } finally {
      setReading(false)
      setReadPickerOpen(false)
    }
  }

  // ─── 2. 发送 AT 指令 ─────────────────────────────────────────
  const [atModalOpen, setAtModalOpen] = useState(false)
  const [atValue, setAtValue] = useState('')
  const [atSending, setAtSending] = useState(false)
  const handleSendAT = async () => {
    const content = atValue.trim()
    if (!content) {
      message.warning('请输入 AT 指令')
      return
    }
    const key = 'sendAT-' + Date.now()
    setAtSending(true)
    message.loading({ content: '发送中...', key })
    try {
      const { code, message: m } = await sendATInstruct(t.DevMac, content)
      if (code === 200) {
        message.success({ content: 'AT 指令已发送', key })
        setAtValue('')
        setAtModalOpen(false)
      } else {
        message.warning({ content: `发送失败: ${m}`, key })
      }
    } catch (e: any) {
      message.error({ content: `发送异常: ${e?.message || e}`, key })
    } finally {
      setAtSending(false)
    }
  }

  // ─── 2. 监听 console 切换 ────────────────────────────────────
  // 当前是否在监听 — 本地 toggle, 没有 server 查询接口, 仅作 UI 状态
  const [listening, setListening] = useState(false)
  const handleToggleListen = async () => {
    const key = 'listen-' + t.DevMac
    message.loading({ content: listening ? '停止监听...' : '开始监听...', key })
    try {
      if (listening) {
        await delListenMac(t.DevMac)
        setListening(false)
        message.success({ content: '已停止监听', key })
      } else {
        await addListenMac(t.DevMac)
        setListening(true)
        message.success({ content: '已开启监听, 到「console」tab 看实时日志', key })
      }
    } catch (e: any) {
      message.error({ content: `操作失败: ${e?.message || e}`, key })
    }
  }

  // ─── 4. 强制离线 ────────────────────────────────────────────
  const handleForceOffline = () => {
    Modal.confirm({
      title: '强制离线',
      content: `确定要把 ${t.DevMac} 强制设为离线吗?\n\n注意: 这只是 admin 端的覆盖标记, 设备真实连接状态由 socket 维护, 等下次心跳会自动恢复。`,
      okText: '强制离线',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const key = 'forceOffline-' + t.DevMac
        message.loading({ content: '处理中...', key })
        try {
          const { code, message: m } = await setTerminalOnline(t.DevMac, false)
          if (code === 200) {
            message.success({ content: '已强制离线', key })
            onChange?.()
          } else {
            message.warning({ content: `失败: ${m}`, key })
          }
        } catch (e: any) {
          message.error({ content: `异常: ${e?.message || e}`, key })
        }
      },
    })
  }

  // ─── 4. 重置终端 ────────────────────────────────────────────
  const handleReset = () => {
    Modal.confirm({
      title: '重置终端',
      content: `确定要重置 ${t.DevMac} 吗?\n\n重置会清空终端的运行时状态并重新初始化, 但不会删除挂载设备和用户绑定。`,
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const key = 'reset-' + t.DevMac
        message.loading({ content: '重置中...', key })
        try {
          const { code, message: m } = await initTerminal(t.DevMac)
          if (code === 200) {
            message.success({ content: '重置完成', key })
            onChange?.()
          } else {
            message.warning({ content: `失败: ${m}`, key })
          }
        } catch (e: any) {
          message.error({ content: `异常: ${e?.message || e}`, key })
        }
      },
    })
  }

  // ─── 4. 解除挂载 (含 picker) ─────────────────────────────────
  const [unmountOpen, setUnmountOpen] = useState(false)
  const handleUnmount = (dev: Uart.TerminalMountDevs) => {
    Modal.confirm({
      title: '解除挂载',
      content: `确认删除挂载设备: ${t.DevMac} / ${dev.mountDev} (pid=${dev.pid}) ?\n\n此操作不可逆。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const key = 'unmount-' + dev.pid
        message.loading({ content: '删除中...', key })
        try {
          const { code, message: m } = await delTerminalMountDev(t.DevMac, dev.pid)
          if (code === 200) {
            message.success({ content: '已解除挂载', key })
            onChange?.()
          } else {
            message.warning({ content: `失败: ${m}`, key })
          }
        } catch (e: any) {
          message.error({ content: `异常: ${e?.message || e}`, key })
        }
      },
    })
  }

  return (
    <div className="device-actions-v3">
      <h3>{title}</h3>

      {/* ─── 1. 状态快照 ──────────────────────────────────────── */}
      <div className="device-actions-status">
        <div className="status-row">
          <span className="status-label">
            <ApiOutlined /> 状态
          </span>
          <span className={`status-value ${online ? 'ok' : 'warn'}`}>
            {online ? <CheckCircleFilled /> : <WarningFilled />} {online ? '实时连接' : '离线'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">
            <WifiOutlined /> iotStat
          </span>
          <span className="status-value">{t.iotStat || '—'}</span>
        </div>
        <div className="status-row">
          <span className="status-label">
            <ClockCircleOutlined /> 最近活动
          </span>
          <span className="status-value">
            {t.uptime ? dayjs(t.uptime).fromNow?.() || dayjs(t.uptime).format('MM-DD HH:mm') : '—'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">
            <AppstoreOutlined /> 挂载设备
          </span>
          <span className="status-value">{mountDevs.length} 个</span>
        </div>
      </div>

      {/* ─── 2. 立即操作 ──────────────────────────────────────── */}
      <div className="device-actions-section-label">⚡ 立即操作</div>

      {(() => {
        const firstDev = mountDevs[0]
        if (mountDevs.length === 0) {
          return (
            <Tooltip title="该终端暂无挂载设备, 无法读取">
              <button className="device-action-btn-v3 primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <span className="ico"><ClockCircleOutlined /></span>
                <span className="grow">立即读取一次数据</span>
                <span className="arrow">→</span>
              </button>
            </Tooltip>
          )
        }
        if (mountDevs.length === 1 && firstDev) {
          return (
            <button
              className="device-action-btn-v3 primary"
              onClick={() => handleReadNow(firstDev)}
              disabled={reading}
            >
              <span className="ico"><ClockCircleOutlined /></span>
              <span className="grow">{reading ? '读取中...' : '立即读取一次数据'}</span>
              <span className="arrow">{reading ? <Spin size="small" /> : '→'}</span>
            </button>
          )
        }
        return (
        <Popover
          open={readPickerOpen}
          onOpenChange={setReadPickerOpen}
          trigger="click"
          placement="bottomLeft"
          content={
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>选择要读取的挂载设备:</div>
              {mountDevs.map((d) => (
                <div
                  key={d.pid}
                  onClick={() => handleReadNow(d)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ink-100)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{d.mountDev}</span>
                  <span style={{ color: 'var(--ink-500)', fontSize: 11 }}>pid {d.pid}</span>
                </div>
              ))}
            </div>
          }
        >
          <button className="device-action-btn-v3 primary">
            <span className="ico"><ClockCircleOutlined /></span>
            <span className="grow">立即读取一次数据</span>
            <span className="arrow">▼</span>
          </button>
        </Popover>
        )
      })()}

      <button
        className="device-action-btn-v3"
        onClick={() => setAtModalOpen(true)}
        disabled={!t.AT}
      >
        <span className="ico"><ThunderboltOutlined /></span>
        <span className="grow">发送 AT 指令</span>
        <span className="arrow">→</span>
      </button>
      {!t.AT ? (
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: -6, marginLeft: 8 }}>
          该终端不支持 AT 指令
        </div>
      ) : null}

      <button className="device-action-btn-v3" onClick={handleToggleListen}>
        <span className="ico">
          {listening ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        </span>
        <span className="grow">{listening ? '停止监听 console' : '监听实时 console'}</span>
        <span className="arrow" style={{ color: listening ? '#10b981' : 'var(--ink-400)' }}>
          {listening ? '◉' : '◯'}
        </span>
      </button>

      {/* ─── 3. 跳转链接 ──────────────────────────────────────── */}
      <div className="device-actions-links">
        <span className="links-label">跳转 →</span>
        <a onClick={() => router.push(`/admin/node/terminal/${t.DevMac}?tab=at`)}>AT 调试</a>
        <span className="dot">·</span>
        <a onClick={() => router.push(`/admin/node/terminal/${t.DevMac}?tab=alarm`)}>告警历史</a>
        <span className="dot">·</span>
        <a onClick={() => router.push(`/admin/node/terminal/${t.DevMac}?tab=query`)}>指令调试</a>
      </div>

      {/* ─── 4. 危险操作 ──────────────────────────────────────── */}
      <div className="device-actions-danger">
        <div className="danger-label">⚠ 危险操作</div>
        <div className="danger-row">
          <Tooltip title="admin 覆盖标记, 真实连接由 socket 维护">
            <button className="danger-btn" onClick={handleForceOffline}>
              <PoweroffOutlined /> 强制离线
            </button>
          </Tooltip>
          <Tooltip title="清空终端运行时状态并重新初始化">
            <button className="danger-btn" onClick={handleReset}>
              <ReloadOutlined /> 重置
            </button>
          </Tooltip>
          <Tooltip
            title={mountDevs.length === 0 ? '无挂载设备' : `查看并解除 ${mountDevs.length} 个挂载`}
          >
            <button
              className="danger-btn"
              onClick={() => setUnmountOpen(true)}
              disabled={mountDevs.length === 0}
            >
              <DisconnectOutlined /> 解除挂载
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────── */}
      <Modal
        title={
          <span>
            <AudioOutlined style={{ marginRight: 8 }} />
            发送 AT 指令 — {t.DevMac}
          </span>
        }
        open={atModalOpen}
        onCancel={() => setAtModalOpen(false)}
        onOk={handleSendAT}
        confirmLoading={atSending}
        okText="发送"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ marginBottom: 8, color: 'var(--ink-500)', fontSize: 12 }}>
          支持的指令取决于固件, 常见: VER / PID / ICCID / IMEI / UART=1,9600,8,1,NONE,HD / IOTEN=on ...
        </div>
        <Input.TextArea
          value={atValue}
          onChange={(e) => setAtValue(e.target.value)}
          placeholder="例如: VER"
          autoSize={{ minRows: 2, maxRows: 4 }}
          autoFocus
        />
      </Modal>

      <Modal
        title={
          <span>
            <DisconnectOutlined style={{ marginRight: 8, color: '#be123c' }} />
            解除挂载 — {t.DevMac}
          </span>
        }
        open={unmountOpen}
        onCancel={() => setUnmountOpen(false)}
        footer={null}
        destroyOnHidden
      >
        {mountDevs.length === 0 ? (
          <Empty description="无挂载设备" />
        ) : (
          <div>
            <div style={{ marginBottom: 12, color: 'var(--ink-500)', fontSize: 12 }}>
              选择要解除的挂载设备, 此操作不可逆。
            </div>
            {mountDevs.map((d) => (
              <div
                key={d.pid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid var(--ink-200)',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
                    {d.mountDev}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                    pid {d.pid} · protocol {d.protocol || '—'}
                  </div>
                </div>
                <button
                  className="danger-btn"
                  onClick={() => handleUnmount(d)}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  <DisconnectOutlined /> 解除
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
