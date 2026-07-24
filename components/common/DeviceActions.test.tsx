import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

/**
 * DeviceActions · tier 1 行为测试
 *
 * 参考 AddUserTerminalModal.test.tsx 风格: mock 业务 API + mock Modal.confirm 捕获 onOk.
 * 组件有 4 区 (状态快照 / 立即操作 / 跳转链接 / 危险操作), 测试重点:
 *   1) 防御性 ?? 兜底 (mountDevs / iotStat / uptime)
 *   2) 业务 API 真调 (SendProcotolInstructSet / sendATInstruct / addListenMac / delListenMac)
 *   3) Modal.confirm 流 (setTerminalOnline / initTerminal / delTerminalMountDev) — 拦截 confirm 抽 onOk
 *   4) disabled / loading 状态
 *   5) router.push 跳转
 */

// ─── Mocks ───────────────────────────────────────────────────────────
const {
  mockSendProcotolInstructSet,
  mockSendATInstruct,
  mockAddListenMac,
  mockDelListenMac,
  mockSetTerminalOnline,
  mockInitTerminal,
  mockDelTerminalMountDev,
  mockModalConfirm,
  mockRouterPush,
  mockMessage,
} = vi.hoisted(() => ({
  mockSendProcotolInstructSet: vi.fn(),
  mockSendATInstruct: vi.fn(),
  mockAddListenMac: vi.fn(),
  mockDelListenMac: vi.fn(),
  mockSetTerminalOnline: vi.fn(),
  mockInitTerminal: vi.fn(),
  mockDelTerminalMountDev: vi.fn(),
  mockModalConfirm: vi.fn(),
  mockRouterPush: vi.fn(),
  mockMessage: {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/fetchRoot', () => ({
  SendProcotolInstructSet: (...args: unknown[]) => mockSendProcotolInstructSet(...args),
  sendATInstruct: (...args: unknown[]) => mockSendATInstruct(...args),
  addListenMac: (...args: unknown[]) => mockAddListenMac(...args),
  delListenMac: (...args: unknown[]) => mockDelListenMac(...args),
  setTerminalOnline: (...args: unknown[]) => mockSetTerminalOnline(...args),
  initTerminal: (...args: unknown[]) => mockInitTerminal(...args),
}))

vi.mock('@/lib/api/fetch', () => ({
  delTerminalMountDev: (...args: unknown[]) => mockDelTerminalMountDev(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
}))

// Mock antd: 用最小 stub 模拟 DeviceActions 用到的 7 个组件
// (Tooltip/Modal/Input/message/Popover/Empty/Spin), 只让 Modal.confirm 走 mock
// 避免 importActual 返回 shape 不匹配 (Element type is invalid).
// Modal 渲染时给 OK/Cancel 按钮加 data-testid 便于测试精确定位.
vi.mock('antd', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  Modal: Object.assign(
    ({ children, open, onOk, onCancel, okText, cancelText, confirmLoading, title, footer }: any) => {
      if (!open) return null
      if (footer === null) {
        // user explicitly disabled footer (e.g. 解除挂载 picker modal)
        return (
          <div data-testid="ant-modal">
            {title}
            {children}
          </div>
        )
      }
      return (
        <div data-testid="ant-modal">
          {title}
          {children}
          <button
            data-testid="ant-modal-ok"
            onClick={onOk}
            disabled={confirmLoading}
          >
            {okText || '确定'}
          </button>
          <button data-testid="ant-modal-cancel" onClick={onCancel}>
            {cancelText || '取消'}
          </button>
        </div>
      )
    },
    {
      confirm: (cfg: any) => mockModalConfirm(cfg),
    }
  ),
  Input: { TextArea: (props: any) => <textarea {...props} /> },
  message: mockMessage,
  Popover: ({ children }: any) => <>{children}</>,
  Empty: ({ description }: any) => <div data-testid="empty">{description}</div>,
  Spin: ({ children }: any) => <div data-testid="spin">{children}</div>,
}))

import { DeviceActions } from './DeviceActions'

// ─── Helpers ─────────────────────────────────────────────────────────
function makeTerminal(overrides: Partial<Uart.Terminal> = {}): Uart.Terminal {
  const base: Uart.Terminal = {
    DevMac: 'AA:BB:CC:DD:EE:01',
    mountNode: 'node-A',
    name: 'Test-Terminal',
    online: true,
    AT: true,
    mountDevs: [
      { Type: 'm', mountDev: 'modbus-1', protocol: 'modbus', pid: 0, online: true },
    ],
  }
  // 故意用对象 spread + 类型断言, 让测试能模拟 undefined 字段
  // (exactOptionalPropertyTypes 下不能 Partial<Terminal> 直接传 undefined)
  return { ...base, ...overrides } as Uart.Terminal
}

function findButtonByText(container: HTMLElement, text: string): HTMLElement {
  const buttons = container.querySelectorAll('button')
  for (const btn of Array.from(buttons)) {
    if (btn.textContent && btn.textContent.replace(/\s/g, '').includes(text)) {
      return btn as HTMLElement
    }
  }
  throw new Error(`Button with text "${text}" not found`)
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('DeviceActions', () => {
  beforeEach(() => {
    mockSendProcotolInstructSet.mockReset()
    mockSendATInstruct.mockReset()
    mockAddListenMac.mockReset()
    mockDelListenMac.mockReset()
    mockSetTerminalOnline.mockReset()
    mockInitTerminal.mockReset()
    mockDelTerminalMountDev.mockReset()
    mockModalConfirm.mockReset()
    mockRouterPush.mockReset()
    Object.values(mockMessage).forEach((fn) => fn.mockReset())
  })

  // ─── 1. 防御性 ?? 兜底 ───────────────────────────────────────────
  it('falls back to "—" when iotStat / uptime missing (defensive ??)', () => {
    // exactOptionalPropertyTypes 下用对象 spread 显式覆盖为 undefined
    const t = makeTerminal({} as Partial<Uart.Terminal>)
    ;(t as any).iotStat = undefined
    ;(t as any).uptime = undefined
    const { container } = render(<DeviceActions terminal={t} />)
    // 2 个 "—" 兜底 (iotStat + uptime 各一)
    const dashes = Array.from(container.querySelectorAll('.status-value')).map(
      (el) => el.textContent
    )
    expect(dashes.filter((d) => d === '—').length).toBeGreaterThanOrEqual(2)
  })

  it('treats missing mountDevs as empty array (no crash)', () => {
    const t = makeTerminal({ mountDevs: undefined as any })
    expect(() => render(<DeviceActions terminal={t} />)).not.toThrow()
    // 挂载设备应显示 0 个
    const { container } = render(<DeviceActions terminal={t} />)
    expect(container.textContent).toContain('0 个')
  })

  it('shows online status with check icon', () => {
    const t = makeTerminal({ online: true })
    const { container } = render(<DeviceActions terminal={t} />)
    expect(container.textContent).toContain('实时连接')
  })

  it('shows offline status with warning icon', () => {
    const t = makeTerminal({ online: false })
    const { container } = render(<DeviceActions terminal={t} />)
    expect(container.textContent).toContain('离线')
  })

  // ─── 2. 立即读取 — 1 mountDev 直发 ──────────────────────────────
  it('click "立即读取一次数据" with 1 mountDev calls SendProcotolInstructSet', async () => {
    mockSendProcotolInstructSet.mockResolvedValue({ code: 200, message: 'ok' })
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    const btn = findButtonByText(container, '立即读取一次数据')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockSendProcotolInstructSet).toHaveBeenCalledWith(
        expect.objectContaining({
          DevMac: 'AA:BB:CC:DD:EE:01',
          pid: 0,
          protocol: 'modbus',
          content: 'READ',
        })
      )
    })
  })

  // ─── 3. 发送 AT 指令 modal 流 ───────────────────────────────────
  it('click "发送 AT 指令" opens AT modal; submit with empty input skips API + shows warning', async () => {
    const t = makeTerminal({ AT: true })
    const { container } = render(<DeviceActions terminal={t} />)
    fireEvent.click(findButtonByText(container, '发送AT指令'))
    // 模态打开后, 点击 antd Modal 的 OK 按钮 (data-testid 精确定位)
    const modal = await screen.findByTestId('ant-modal')
    const sendBtn = within(modal).getByTestId('ant-modal-ok')
    fireEvent.click(sendBtn)
    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledWith('请输入 AT 指令')
    })
    expect(mockSendATInstruct).not.toHaveBeenCalled()
  })

  it('AT modal: type content, submit → calls sendATInstruct and closes modal on success', async () => {
    mockSendATInstruct.mockResolvedValue({ code: 200, message: 'ok' })
    const t = makeTerminal({ AT: true })
    const { container } = render(<DeviceActions terminal={t} />)
    fireEvent.click(findButtonByText(container, '发送AT指令'))
    const modal = await screen.findByTestId('ant-modal')
    const input = within(modal).getByPlaceholderText(/例如/) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'VER' } })
    const sendBtn = within(modal).getByTestId('ant-modal-ok')
    fireEvent.click(sendBtn)
    await waitFor(() => {
      expect(mockSendATInstruct).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01', 'VER')
    })
  })

  it('AT button disabled when t.AT is false', () => {
    const t = makeTerminal({ AT: false })
    const { container } = render(<DeviceActions terminal={t} />)
    const atBtn = findButtonByText(container, '发送AT指令')
    expect(atBtn).toBeDisabled()
    expect(container.textContent).toContain('该终端不支持 AT 指令')
  })

  // ─── 4. 监听 console toggle ─────────────────────────────────────
  it('first click on "监听实时 console" calls addListenMac', async () => {
    mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    fireEvent.click(findButtonByText(container, '监听实时console'))
    await waitFor(() => {
      expect(mockAddListenMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
    })
  })

  it('second click toggles to delListenMac', async () => {
    mockAddListenMac.mockResolvedValue({ code: 200, data: [] })
    mockDelListenMac.mockResolvedValue({ code: 200, data: [] })
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    // 1st click: start listening
    fireEvent.click(findButtonByText(container, '监听实时console'))
    await waitFor(() => expect(mockAddListenMac).toHaveBeenCalledTimes(1))
    // 2nd click: stop listening
    fireEvent.click(findButtonByText(container, '停止监听console'))
    await waitFor(() => {
      expect(mockDelListenMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
    })
  })

  // ─── 5. 跳转链接 → router.push ──────────────────────────────────
  it('clicking "AT 调试" link calls router.push with correct query', () => {
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    // "AT 调试" 是 <a> 不是 <button>, 用 querySelectorAll('a') 找
    const link = Array.from(container.querySelectorAll('a')).find((a) =>
      a.textContent?.replace(/\s/g, '').includes('AT调试')
    ) as HTMLElement
    expect(link).toBeTruthy()
    fireEvent.click(link)
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/admin/node/terminal/AA:BB:CC:DD:EE:01?tab=at'
    )
  })

  it('clicking "告警历史" link calls router.push with ?tab=alarm', () => {
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    const link = Array.from(container.querySelectorAll('a')).find((a) =>
      a.textContent?.replace(/\s/g, '').includes('告警历史')
    ) as HTMLElement
    expect(link).toBeTruthy()
    fireEvent.click(link)
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/admin/node/terminal/AA:BB:CC:DD:EE:01?tab=alarm'
    )
  })

  // ─── 6. 危险操作 — Modal.confirm 流 (拦截 onOk) ────────────────
  it('"强制离线" click opens Modal.confirm; onOk calls setTerminalOnline(false)', async () => {
    mockSetTerminalOnline.mockResolvedValue({ code: 200, message: 'ok' })
    const t = makeTerminal()
    const onChange = vi.fn()
    const { container } = render(
      <DeviceActions terminal={t} onChange={onChange} />
    )
    fireEvent.click(findButtonByText(container, '强制离线'))
    // 拦截: mockModalConfirm 应被调用, 拿到 cfg
    expect(mockModalConfirm).toHaveBeenCalledTimes(1)
    const cfg = mockModalConfirm.mock.calls[0]![0]!
    expect(cfg.title).toBe('强制离线')
    expect(cfg.okType).toBe('danger')
    // 模拟点 OK
    await cfg.onOk()
    await waitFor(() => {
      expect(mockSetTerminalOnline).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:01',
        false
      )
    })
    expect(onChange).toHaveBeenCalled()
  })

  it('"重置" click opens Modal.confirm; onOk calls initTerminal', async () => {
    mockInitTerminal.mockResolvedValue({ code: 200, message: 'ok' })
    const t = makeTerminal()
    const { container } = render(<DeviceActions terminal={t} />)
    fireEvent.click(findButtonByText(container, '重置'))
    expect(mockModalConfirm).toHaveBeenCalledTimes(1)
    const cfg = mockModalConfirm.mock.calls[0]![0]!
    expect(cfg.title).toBe('重置终端')
    await cfg.onOk()
    await waitFor(() => {
      expect(mockInitTerminal).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01')
    })
  })

  it('"解除挂载" with 0 mountDevs disabled', () => {
    const t = makeTerminal({ mountDevs: [] })
    const { container } = render(<DeviceActions terminal={t} />)
    const btn = findButtonByText(container, '解除挂载')
    expect(btn).toBeDisabled()
  })

  it('"解除挂载" click opens picker modal; unmount specific dev triggers delTerminalMountDev', async () => {
    mockDelTerminalMountDev.mockResolvedValue({ code: 200, message: 'ok' })
    const t = makeTerminal({
      mountDevs: [
        { Type: 'm', mountDev: 'modbus-1', protocol: 'modbus', pid: 0, online: true },
        { Type: 'm', mountDev: 'modbus-2', protocol: 'modbus', pid: 1, online: true },
      ],
    })
    const { container } = render(<DeviceActions terminal={t} />)
    // 危险区的"解除挂载"按钮 → 打开 picker modal
    fireEvent.click(findButtonByText(container, '解除挂载'))
    // scope 到 modal 内部, 找精确"解除"按钮 (不是"解除挂载")
    const modal = await screen.findByTestId('ant-modal')
    const modalBtns = within(modal).getAllByRole('button')
    // 模态里 2 个 inner "解除" button (mountDevs 各 1 个)
    const unmountBtns = modalBtns.filter((b) => {
      const txt = (b.textContent || '').replace(/\s/g, '')
      return txt === '解除' || txt === '解除' // exact "解除"
    })
    expect(unmountBtns.length).toBe(2)
    fireEvent.click(unmountBtns[0]!)
    expect(mockModalConfirm).toHaveBeenCalledTimes(1)
    const cfg = mockModalConfirm.mock.calls[0]![0]!
    expect(cfg.title).toBe('解除挂载')
    await cfg.onOk()
    await waitFor(() => {
      expect(mockDelTerminalMountDev).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:01',
        0
      )
    })
  })
})
