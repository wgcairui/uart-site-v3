import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * DeviceLiveStream · tier 1 行为测试 (socket + zustand mock)
 *
 * 参考 UserDropdown.test.tsx 风格: mock socket + mock store.
 * 组件: deviceEvents (zustand) 真源 + socket subscribe + fetchRoot listen API.
 *
 * 测试矩阵:
 *   1) 空状态渲染 (Empty + "暂无事件" 文案)
 *   2) store 有 events 时渲染 StreamRow
 *   3) 开启监听 → subscribeEvent + addListenMac 调用, 推送 event 到 store
 *   4) 关闭监听 / unmount → unSubscribeEvent + delListenMac 调用
 *   5) Segmented filter 切换 → setFilter 被调
 *   6) 清空按钮 → clearEvents
 *   7) 带 meta 的 row 点击展开 JSON
 */

// ─── Mocks ───────────────────────────────────────────────────────────
const {
  mockSubscribeEvent,
  mockUnSubscribeEvent,
  mockAddListenMac,
  mockDelListenMac,
  storeState,
} = vi.hoisted(() => {
  const storeState = {
    events: [] as any[],
    filter: [] as string[],
    setFilter: vi.fn(),
    setMac: vi.fn(),
    clearEvents: vi.fn(() => {
      storeState.events = []
    }),
  }
  return {
    mockSubscribeEvent: vi.fn(),
    mockUnSubscribeEvent: vi.fn(),
    mockAddListenMac: vi.fn(),
    mockDelListenMac: vi.fn(),
    storeState,
  }
})

vi.mock('@/lib/socket', () => ({
  subscribeEvent: (...args: unknown[]) => mockSubscribeEvent(...args),
  unSubscribeEvent: (...args: unknown[]) => mockUnSubscribeEvent(...args),
}))

vi.mock('@/lib/api/fetchRoot', () => ({
  addListenMac: (...args: unknown[]) => mockAddListenMac(...args),
  delListenMac: (...args: unknown[]) => mockDelListenMac(...args),
}))

vi.mock('@/lib/store/deviceEvents', () => ({
  useDeviceEvents: (selector: any) => selector(storeState),
  pushDeviceEvent: (e: any) => {
    storeState.events = [
      { ...e, id: 'pushed-' + storeState.events.length, ts: Date.now() },
      ...storeState.events,
    ]
  },
}))

// ─── Import under test (after mocks) ────────────────────────────────
import { DeviceLiveStream } from './DeviceLiveStream'
import type { DeviceEvent } from '@/lib/store/deviceEvents'

// ─── Helpers ─────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<DeviceEvent> = {}): DeviceEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    kind: 'at_send',
    text: 'AT 指令已发送',
    status: 'info',
    source: 'AT',
    ...overrides,
  } as DeviceEvent
}

function flushEffects() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  storeState.events = []
  storeState.filter = []
  storeState.setFilter.mockReset()
  storeState.setMac.mockReset()
  storeState.clearEvents.mockReset()
  mockSubscribeEvent.mockReset()
  mockUnSubscribeEvent.mockReset()
  // 默认两个 listen API 都 resolve, 避免 cleanup 时 delListenMac().catch 报 undefined
  mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
  mockDelListenMac.mockResolvedValue({ code: 200, data: [] })
  // 默认 subscribeEvent 返回订阅 index 1, 缓存 callback
  let captured: ((data: { events: string; data: any }) => void) | null = null
  mockSubscribeEvent.mockImplementation((_event: string, fn: any) => {
    captured = fn
    return 1
  })
  ;(globalThis as any).__triggerSocket = (data: any) =>
    captured?.({ events: 'mac_live', data })
})

// ─── Tests ───────────────────────────────────────────────────────────
describe('DeviceLiveStream', () => {
  it('renders empty state when no events', () => {
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    expect(screen.getByText(/暂无事件/)).toBeInTheDocument()
  })

  it('renders event rows from store', () => {
    storeState.events = [
      makeEvent({ text: 'AT 指令已发送' }),
      makeEvent({ text: '指令回包 200' }),
    ]
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    expect(screen.getByText('AT 指令已发送')).toBeInTheDocument()
    expect(screen.getByText('指令回包 200')).toBeInTheDocument()
  })

  it('calls setMac on mount to sync store (clears events on mac change)', () => {
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    expect(storeState.setMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
  })

  it('toggle listen switch ON: subscribeEvent + addListenMac are called', async () => {
    mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    // 找到 Switch 控件 (antd Switch 是 button[role="switch"])
    const toggle = document.querySelector(
      'button[role="switch"]'
    ) as HTMLElement
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle)
    await flushEffects()
    expect(mockSubscribeEvent).toHaveBeenCalledWith(
      'AA:BB:CC:DD:EE:01_live',
      expect.any(Function)
    )
    expect(mockAddListenMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
  })

  it('socket callback pushes new event to store', async () => {
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    fireEvent.click(document.querySelector('button[role="switch"]') as HTMLElement)
    await flushEffects()
    // 模拟服务端推一个 mac_log
    act(() => {
      ;(globalThis as any).__triggerSocket('hello-from-server')
    })
    // 注: toggle 切换会同时 push 1 个 action event, 然后 socket callback push 1 个 socket_log
    // 找 socket_log 那个 event (latest push 排在 events[0])
    const socketEvt = storeState.events.find((e) => e.kind === 'socket_log')
    expect(socketEvt).toBeDefined()
    expect(socketEvt!.text).toBe('hello-from-server')
    // 至少有 2 个 events (1 action + 1 socket_log)
    expect(storeState.events.length).toBeGreaterThanOrEqual(2)
  })

  it('toggle listen switch OFF: delListenMac + unSubscribeEvent cleanup', async () => {
    mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
    mockDelListenMac.mockResolvedValue({ code: 200, data: [] })
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    const toggle = document.querySelector(
      'button[role="switch"]'
    ) as HTMLElement
    // ON
    fireEvent.click(toggle)
    await flushEffects()
    expect(mockSubscribeEvent).toHaveBeenCalledTimes(1)
    // OFF
    fireEvent.click(toggle)
    await flushEffects()
    expect(mockUnSubscribeEvent).toHaveBeenCalledWith(
      'AA:BB:CC:DD:EE:01_live',
      1
    )
    expect(mockDelListenMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
  })

  it('unmount while listening: unSubscribeEvent + delListenMac fire', async () => {
    mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
    mockDelListenMac.mockResolvedValue({ code: 200, data: [] })
    const { unmount } = render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    fireEvent.click(document.querySelector('button[role="switch"]') as HTMLElement)
    await flushEffects()
    unmount()
    expect(mockUnSubscribeEvent).toHaveBeenCalled()
    expect(mockDelListenMac).toHaveBeenCalled()
  })

  it('switching Segmented to "AT" calls setFilter with [at_send, at_reply]', () => {
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    // antd Segmented 渲染为 radiogroup, 通过 role="radio" 找
    const atOption = screen.getByRole('radio', { name: 'AT' })
    fireEvent.click(atOption)
    expect(storeState.setFilter).toHaveBeenCalledWith(['at_send', 'at_reply'])
  })

  it('switching Segmented to "全部" calls setFilter with [] (empty = all)', () => {
    // 先切到 AT 让 setFilter 被调, 再切回 "全部"
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    fireEvent.click(screen.getByRole('radio', { name: 'AT' }))
    storeState.setFilter.mockClear()
    fireEvent.click(screen.getByRole('radio', { name: '全部' }))
    expect(storeState.setFilter).toHaveBeenCalledWith([])
  })

  it('clicking "清空" button calls clearEvents', () => {
    storeState.events = [makeEvent({ text: 'x' })]
    const { container } = render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    // 清空按钮是 antd Button type="text" icon=ClearOutlined
    const clearBtn = container.querySelector('button.ant-btn-text') as HTMLElement
    expect(clearBtn).toBeTruthy()
    fireEvent.click(clearBtn)
    expect(storeState.clearEvents).toHaveBeenCalled()
  })

  it('clicking a row with meta expands JSON payload', () => {
    storeState.events = [
      makeEvent({
        text: 'with meta',
        meta: { foo: 'bar', count: 42 },
      }),
    ]
    const { container } = render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    // 展开前无 <pre>
    expect(container.querySelector('pre')).not.toBeInTheDocument()
    const row = screen.getByText('with meta')
    fireEvent.click(row)
    // 展开后出现 <pre> 包含 JSON
    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre?.textContent).toContain('"foo"')
    expect(pre?.textContent).toContain('"bar"')
  })

  it('shows event count tag in header (visible/total)', () => {
    storeState.events = [
      makeEvent({ text: 'a' }),
      makeEvent({ text: 'b' }),
    ]
    render(<DeviceLiveStream mac="AA:BB:CC:DD:EE:01" />)
    // Tag 内容应为 "2/2"
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })
})
