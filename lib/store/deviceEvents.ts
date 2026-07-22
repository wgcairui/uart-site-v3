'use client'

/**
 * deviceEvents · 设备事件总线 (zustand)
 *
 * 解决 4 区共享同一份"实时回包流"的问题:
 * - AT 调试 push at_send / at_reply
 * - 指令调试 push instruct_send / instruct_reply
 * - DeviceActions push action (操作结果)
 * - socket mac_log 自动 push socket_log
 *
 * 上限 200 条 (FIFO 裁剪), 避免内存膨胀。
 * 切 mac 时 call setMac(newMac) 自动 clearEvents。
 *
 * 渲染: <DeviceLiveStream /> 在任何 section 都能挂, 共享同一份。
 */

import { create } from 'zustand'

export type DeviceEventKind =
  | 'at_send'
  | 'at_reply'
  | 'instruct_send'
  | 'instruct_reply'
  | 'socket_log'
  | 'action'

export interface DeviceEvent {
  id: string
  ts: number
  kind: DeviceEventKind
  /** 主显示文本 (1 行, 调试/告警摘要) */
  text: string
  /** 详细 payload (展开后显示, JSON) */
  meta?: any
  /** 状态: success/error/info — 决定 timeline 颜色 */
  status: 'success' | 'error' | 'info' | 'pending'
  /** 来源组件: AT / 指令 / 操作 / socket */
  source: string
}

const MAX_EVENTS = 200

interface DeviceEventsStore {
  mac: string
  events: DeviceEvent[]
  /** 过滤: 留空 = 全部 */
  filter: DeviceEventKind[]

  setMac: (mac: string) => void
  addEvent: (e: Omit<DeviceEvent, 'id' | 'ts'>) => void
  clearEvents: () => void
  setFilter: (kinds: DeviceEventKind[]) => void
}

let counter = 0
const newId = () => `${Date.now()}-${counter++}`

export const useDeviceEvents = create<DeviceEventsStore>((set) => ({
  mac: '',
  events: [],
  filter: [],

  setMac: (mac) =>
    set((state) => (state.mac === mac ? state : { mac, events: [], filter: [] })),

  addEvent: (e) =>
    set((state) => {
      const event: DeviceEvent = { ...e, id: newId(), ts: Date.now() }
      const events = [event, ...state.events]
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
      return { events }
    }),

  clearEvents: () => set({ events: [] }),

  setFilter: (filter) => set({ filter }),
}))

/** push helper, 让组件少打 5 行 */
export const pushDeviceEvent = (e: Omit<DeviceEvent, 'id' | 'ts'>) =>
  useDeviceEvents.getState().addEvent(e)
