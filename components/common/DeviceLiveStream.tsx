'use client'

/**
 * DeviceLiveStream · 设备实时回包流 (sticky top)
 *
 * 替代 4 个 tab 各自的 Timeline (TerminalAT / TerminalOprate / TerminalRunLog / DevRealTimeLog)。
 * 单一真源: deviceEvents store。
 *
 * 4 类源 push 到 store:
 * - AT 调试 → at_send / at_reply
 * - 指令调试 → instruct_send / instruct_reply
 * - DeviceActions → action
 * - socket mac_log → socket_log (需打开"实时监听")
 *
 * 视觉: 玻璃 bento-card · sticky 顶部 · 状态色点 + 单行文本 · 200 条 FIFO
 * 操作: 清空 / 过滤(全部/AT/指令/操作/socket) / 实时监听 toggle
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ClearOutlined,
  AudioOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons'
import { Button, Tag, Tooltip, Switch, Segmented, Empty } from 'antd'
import dayjs from 'dayjs'
import { subscribeEvent, unSubscribeEvent } from '@/lib/socket'
import { addListenMac, delListenMac } from '@/lib/api/fetchRoot'
import { useDeviceEvents, pushDeviceEvent, type DeviceEvent, type DeviceEventKind } from '@/lib/store/deviceEvents'

interface DeviceLiveStreamProps {
  mac: string
  /** sticky top 偏移, 默认 64 (admin header 高度) */
  topOffset?: number
  /** 高度限制, 默认 220px */
  maxHeight?: number
  /** 是否 sticky 顶部 (页面级) — 默认 true; 调试 tab 内部用传 false */
  sticky?: boolean
}

const KIND_LABELS: Record<DeviceEventKind, string> = {
  at_send: 'AT 发送',
  at_reply: 'AT 回包',
  instruct_send: '指令 发送',
  instruct_reply: '指令 回包',
  socket_log: 'socket',
  action: '操作',
}

const KIND_COLOR: Record<DeviceEvent['status'], string> = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  pending: '#f59e0b',
}

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'AT', value: 'at' },
  { label: '指令', value: 'instruct' },
  { label: '操作', value: 'action' },
  { label: 'socket', value: 'socket' },
] as const

type FilterKey = typeof FILTER_OPTIONS[number]['value']

function matchesFilter(e: DeviceEvent, f: FilterKey): boolean {
  if (f === 'all') return true
  if (f === 'at') return e.kind.startsWith('at_')
  if (f === 'instruct') return e.kind.startsWith('instruct_')
  if (f === 'action') return e.kind === 'action'
  if (f === 'socket') return e.kind === 'socket_log'
  return true
}

export function DeviceLiveStream({ mac, topOffset = 64, maxHeight = 220, sticky = true }: DeviceLiveStreamProps) {
  const events = useDeviceEvents((s) => s.events)
  const filter = useDeviceEvents((s) => s.filter)
  const setFilter = useDeviceEvents((s) => s.setFilter)
  const setMac = useDeviceEvents((s) => s.setMac)
  const clearEvents = useDeviceEvents((s) => s.clearEvents)
  const [listening, setListening] = useState(false)
  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // mount 时把 mac 同步到 store (clear events)
  useEffect(() => {
    setMac(mac)
  }, [mac, setMac])

  // socket 监听 — push 到 store
  useEffect(() => {
    if (!listening) return
    const event = mac + '_live'
    const n = subscribeEvent(event, ({ data }: { events: string; data: any }) => {
      pushDeviceEvent({
        kind: 'socket_log',
        source: 'socket',
        status: 'info',
        text: typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200),
        meta: data,
      })
    })
    addListenMac(mac).catch(() => {
      // best-effort
    })
    return () => {
      unSubscribeEvent(event, n)
      delListenMac(mac).catch(() => {})
    }
  }, [listening, mac])

  // 切 filter 同步到 store (空数组 = 全部)
  useEffect(() => {
    if (filterKey === 'all') setFilter([])
    else if (filterKey === 'at') setFilter(['at_send', 'at_reply'])
    else if (filterKey === 'instruct') setFilter(['instruct_send', 'instruct_reply'])
    else if (filterKey === 'action') setFilter(['action'])
    else if (filterKey === 'socket') setFilter(['socket_log'])
  }, [filterKey, setFilter])

  const visible = useMemo(
    () => (filter.length === 0 ? events : events.filter((e) => filter.includes(e.kind))),
    [events, filter]
  )

  const handleToggleListen = () => {
    setListening((v) => !v)
    pushDeviceEvent({
      kind: 'action',
      source: '操作',
      status: 'info',
      text: listening ? '已停止 socket 监听' : '已开启 socket 监听',
    })
  }

  return (
    <div
      className="bento-card device-live-stream"
      style={{
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? topOffset : undefined,
        zIndex: sticky ? 10 : undefined,
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: 12,
        boxShadow: '0 4px 16px -4px rgba(139, 92, 246, 0.1)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
          }}
        >
          <AudioOutlined />
        </div>
        <span style={{ fontWeight: 600, fontSize: 13 }}>实时回包流</span>
        <Tag style={{ marginLeft: 4 }}>{visible.length}/{events.length}</Tag>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Segmented
            size="small"
            value={filterKey}
            onChange={(v) => setFilterKey(v as FilterKey)}
            options={[...FILTER_OPTIONS]}
          />
          <Tooltip title={listening ? '停止实时监听 socket (关闭后只显示已发指令的回包)' : '开始实时监听 socket mac_log 事件'}>
            <Switch
              size="small"
              checked={listening}
              onChange={handleToggleListen}
              checkedChildren={<EyeOutlined />}
              unCheckedChildren={<EyeInvisibleOutlined />}
            />
          </Tooltip>
          <Tooltip title="清空">
            <Button size="small" type="text" icon={<ClearOutlined />} onClick={clearEvents} />
          </Tooltip>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          maxHeight,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          background: 'rgba(248, 250, 252, 0.5)',
          borderRadius: 8,
          padding: '4px 8px',
        }}
      >
        {visible.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                  暂无事件 · 试试 AT 调试 / 指令调试 / 开启 socket 监听
                </span>
              }
            />
          </div>
        ) : (
          visible.map((e) => (
            <StreamRow key={e.id} event={e} />
          ))
        )}
      </div>
    </div>
  )
}

function StreamRow({ event }: { event: DeviceEvent }) {
  const [expanded, setExpanded] = useState(false)
  const hasMeta = event.meta !== undefined && event.meta !== null
  return (
    <>
      <div
        onClick={() => hasMeta && setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 0',
          borderBottom: '1px dashed var(--ink-100)',
          cursor: hasMeta ? 'pointer' : 'default',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: KIND_COLOR[event.status],
            flexShrink: 0,
          }}
        />
        <span style={{ color: 'var(--ink-500)', fontSize: 11, flexShrink: 0, minWidth: 70 }}>
          {dayjs(event.ts).format('HH:mm:ss')}
        </span>
        <span style={{ color: 'var(--ink-700)', fontSize: 11, flexShrink: 0, minWidth: 56 }}>
          {KIND_LABELS[event.kind]}
        </span>
        <span
          style={{
            color: 'var(--ink-900)',
            fontSize: 12,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={event.text}
        >
          {event.text}
        </span>
        {hasMeta && (
          <span style={{ color: 'var(--ink-400)', fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
        )}
      </div>
      {expanded && hasMeta && (
        <pre
          style={{
            margin: '4px 0 4px 24px',
            padding: 8,
            background: 'rgba(0, 0, 0, 0.04)',
            borderRadius: 4,
            fontSize: 11,
            maxHeight: 200,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {JSON.stringify(event.meta, null, 2)}
        </pre>
      )}
    </>
  )
}
