import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock lib/utils/sendInstruct (handleOk 内部会调这些, 测试只验证 UI 行为不调真实 API)
vi.mock('@/lib/utils/sendInstruct', () => ({
  sendInstructNow: (...args: unknown[]) => mockSendInstructNow(...args),
  sendInstructScheduled: (...args: unknown[]) => mockSendInstructScheduled(...args),
  showSendResult: (...args: unknown[]) => mockShowSendResult(...args),
}))

const { mockSendInstructNow, mockSendInstructScheduled, mockShowSendResult } = vi.hoisted(
  () => ({
    mockSendInstructNow: vi.fn(),
    mockSendInstructScheduled: vi.fn(),
    mockShowSendResult: vi.fn(),
  })
)

// antd message 在 jsdom 里会真打到 console, mock 掉避免噪音
vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    message: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
    },
  }
})

import { ScheduleOpModal } from './ScheduleOpModal'

const baseItem: Uart.OprateInstruct = {
  name: '开关',
  value: '0103',
  bl: '1',
  readme: '',
  tag: 'switch',
}

const baseProps = {
  mac: 'AA:BB:CC:DD:EE:FF',
  pid: 1,
  item: baseItem,
  protocolName: 'modbus',
  api: 'user' as const,
}

describe('ScheduleOpModal', () => {
  beforeEach(() => {
    mockSendInstructNow.mockReset()
    mockSendInstructScheduled.mockReset()
    mockShowSendResult.mockReset()
  })

  it('does not render modal when open=false', () => {
    render(<ScheduleOpModal {...baseProps} open={false} onCancel={() => {}} />)
    // antd Modal 在 open=false 时不渲染内容, 标题 + 按钮都不应在 DOM
    expect(screen.queryByRole('button', { name: /立即发送|定时发送/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/操作指令/)).not.toBeInTheDocument()
  })

  it('renders modal with 立即发送 button when open=true', async () => {
    render(<ScheduleOpModal {...baseProps} open onCancel={() => {}} />)
    const okBtn = await screen.findByRole('button', { name: /立即\s*发\s*送/ })
    expect(okBtn).toBeInTheDocument()
    // 默认未勾, 标题尾是 "(立即发送)"
    expect(await screen.findByText(/操作指令.*立即发送/)).toBeInTheDocument()
  })

  it('toggles button text to 定时发送 and shows DatePicker when schedule is checked', async () => {
    render(<ScheduleOpModal {...baseProps} open onCancel={() => {}} />)
    // 勾之前只有一个 textbox: 指令 disabled input
    expect(screen.getAllByRole('textbox').length).toBe(1)
    const checkbox = await screen.findByRole('checkbox', { name: /定时发送/ })
    fireEvent.click(checkbox)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /定时\s*发\s*送/ })
      ).toBeInTheDocument()
    })
    // 勾上后多出 DatePicker input + 备注 textarea
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(1)
  })

  it('keeps 立即发送 button when schedule is NOT checked', async () => {
    render(<ScheduleOpModal {...baseProps} open onCancel={() => {}} />)
    // 默认未勾
    const okBtn = await screen.findByRole('button', { name: /立即\s*发\s*送/ })
    expect(okBtn).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /定时\s*发\s*送/ })).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    render(<ScheduleOpModal {...baseProps} open onCancel={onCancel} />)
    const cancelBtn = await screen.findByRole('button', { name: /取\s*消/ })
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders 备注 input only when schedule is checked (checkbox is the only required field by default)', async () => {
    render(<ScheduleOpModal {...baseProps} open onCancel={() => {}} />)
    // 未勾时, 备注 textarea 不应出现
    expect(screen.queryByPlaceholderText(/下班前关闭空调/)).not.toBeInTheDocument()
    const checkbox = await screen.findByRole('checkbox', { name: /定时发送/ })
    fireEvent.click(checkbox)
    expect(await screen.findByPlaceholderText(/下班前关闭空调/)).toBeInTheDocument()
  })
})
