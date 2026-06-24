import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock API
vi.mock('@/lib/api/fetchRoot', () => ({
  adminGetTerminal: (...args: unknown[]) => mockAdminGetTerminal(...args),
  bindUserDevice: (...args: unknown[]) => mockBindUserDevice(...args),
}))

const { mockAdminGetTerminal, mockBindUserDevice } = vi.hoisted(() => ({
  mockAdminGetTerminal: vi.fn(),
  mockBindUserDevice: vi.fn(),
}))

import { AddUserTerminalModal } from './AddUserTerminalModal'

describe('AddUserTerminalModal', () => {
  beforeEach(() => {
    mockAdminGetTerminal.mockReset()
    mockBindUserDevice.mockReset()
  })

  it('shows modal title with user name when visible', async () => {
    render(<AddUserTerminalModal visible user="alice" />)
    expect(await screen.findByText(/为用户.*绑定设备/)).toBeInTheDocument()
  })

  it('disables OK button when no terminal found', async () => {
    render(<AddUserTerminalModal visible user="alice" />)
    await screen.findByText(/为用户.*绑定设备/)
    // antd v5/v6 Button 在中文字符间自动插空格（'绑定' → '绑 定'），用 \s* 容忍
    const okBtn = await screen.findByRole('button', { name: /绑\s*定|强\s*行\s*绑\s*定/ })
    expect(okBtn).toBeDisabled()
  })

  it('handles search and calls adminGetTerminal', async () => {
    mockAdminGetTerminal.mockResolvedValue({
      code: 200,
      data: { DevMac: 'AA:BB:CC:DD:EE:FF', name: 'test-terminal', online: true },
    })
    render(<AddUserTerminalModal visible user="alice" />)
    const input = await screen.findByPlaceholderText('输入设备 MAC')
    fireEvent.change(input, { target: { value: 'AA:BB:CC:DD:EE:FF' } })
    const searchBtn = await screen.findByRole('button', { name: /查\s*找/ })
    fireEvent.click(searchBtn)
    await waitFor(() => {
      expect(mockAdminGetTerminal).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF')
    })
  })

  it('shows warning when MAC is empty (no API call)', async () => {
    render(<AddUserTerminalModal visible user="alice" />)
    const searchBtn = await screen.findByRole('button', { name: /查\s*找/ })
    fireEvent.click(searchBtn)
    expect(mockAdminGetTerminal).not.toHaveBeenCalled()
  })

  it('strips whitespace/dots/question marks from MAC input', async () => {
    render(<AddUserTerminalModal visible user="alice" />)
    const input = (await screen.findByPlaceholderText('输入设备 MAC')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'AA BB.CC?DD' } })
    expect(input.value).toBe('AABBCCDD')
  })

  it('calls onCancel when cancel clicked', async () => {
    const onCancel = vi.fn()
    render(<AddUserTerminalModal visible user="alice" onCancel={onCancel} />)
    const cancelBtn = await screen.findByRole('button', { name: /取\s*消/ })
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('triggers search on Enter in MAC input', async () => {
    mockAdminGetTerminal.mockResolvedValue({
      code: 200,
      data: { DevMac: 'XX', name: 'test' },
    })
    render(<AddUserTerminalModal visible user="alice" />)
    const input = await screen.findByPlaceholderText('输入设备 MAC')
    fireEvent.change(input, { target: { value: 'XX' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      expect(mockAdminGetTerminal).toHaveBeenCalledWith('XX')
    })
  })

  it('calls bindUserDevice on OK click after search', async () => {
    mockAdminGetTerminal.mockResolvedValue({
      code: 200,
      data: { DevMac: 'XX', name: 'test', ownerId: 'alice' },
    })
    mockBindUserDevice.mockResolvedValue({ code: 200, data: true })
    const onSuccess = vi.fn()
    render(
      <AddUserTerminalModal visible user="alice" onSuccess={onSuccess} />
    )
    const input = await screen.findByPlaceholderText('输入设备 MAC')
    fireEvent.change(input, { target: { value: 'XX' } })
    fireEvent.click(await screen.findByRole('button', { name: /查\s*找/ }))
    await waitFor(() => {
      expect(mockAdminGetTerminal).toHaveBeenCalled()
    })
    await waitFor(async () => {
      const okBtn = await screen.findByRole('button', { name: /绑\s*定/ })
      expect(okBtn).not.toBeDisabled()
    })
    const okBtn = await screen.findByRole('button', { name: /绑\s*定/ })
    fireEvent.click(okBtn)
    await waitFor(() => {
      expect(mockBindUserDevice).toHaveBeenCalledWith('alice', 'XX', false)
    })
  })
})
