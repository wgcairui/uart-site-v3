import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/navigation (Drawer 用 useRouter 跳独立页)
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    back: vi.fn(),
  }),
}))

// Mock API (getTerminalPidProtocol)
const { mockGetTerminalPidProtocol } = vi.hoisted(() => ({
  mockGetTerminalPidProtocol: vi.fn(),
}))
vi.mock('@/lib/api/fetch', () => ({
  getTerminalPidProtocol: (...args: unknown[]) => mockGetTerminalPidProtocol(...args),
}))

// Mock TerminalCurData (内部有 usePromise + antd Card/Table，避免拉真实数据)
vi.mock('@/app/(admin)/admin/node/terminal/[mac]/TerminalDataTab', () => ({
  TerminalCurData: ({ mac, pid }: { mac: string; pid: number }) => (
    <div data-testid="terminal-cur-data" data-mac={mac} data-pid={pid}>
      terminal-cur-data-mock
    </div>
  ),
}))

import { MountDevDetailDrawer } from './MountDevDetailDrawer'

const baseDev: Uart.TerminalMountDevs = {
  mountDev: '温度传感器-1',
  Type: 'TH',
  protocol: 'modbus',
  pid: 1,
  online: true,
  // 其他必填字段按 mock 给
  DevMac: 'AA:BB:CC:DD:EE:FF',
} as unknown as Uart.TerminalMountDevs

const onlineDev: Uart.TerminalMountDevs = { ...baseDev, online: true } as Uart.TerminalMountDevs
const offlineDev: Uart.TerminalMountDevs = { ...baseDev, online: false } as Uart.TerminalMountDevs

describe('MountDevDetailDrawer', () => {
  beforeEach(() => {
    pushMock.mockReset()
    mockGetTerminalPidProtocol.mockReset()
    // 默认 API mock：返回基础 mountDev
    mockGetTerminalPidProtocol.mockResolvedValue({
      code: 200,
      data: { ...baseDev, remark: '测试备注' },
    })
  })

  it('默认不渲染（dev=null 时不返回 drawer 节点）', () => {
    const { container } = render(
      <MountDevDetailDrawer mac="AA:BB:CC:DD:EE:FF" dev={null} open={false} onClose={() => {}} />
    )
    // dev=null → 组件早期 return null
    expect(container).toBeEmptyDOMElement()
  })

  it('open=true 时渲染 drawer + 设备名/PID', async () => {
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={onlineDev}
        open={true}
        onClose={() => {}}
      />
    )
    // 设备名在 drawer title 区域
    expect(await screen.findByText('温度传感器-1')).toBeInTheDocument()
    // PID + 协议 + 类型在副标题
    expect(screen.getByText(/PID\s*1/)).toBeInTheDocument()
    // extra 按钮
    expect(await screen.findByRole('button', { name: /完\s*整\s*详\s*情/ })).toBeInTheDocument()
  })

  it('online=true 时显示 online StatusTag（绿底 + pulse 圆点）', async () => {
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={onlineDev}
        open={true}
        onClose={() => {}}
      />
    )
    const tag = await screen.findByText('在线')
    // StatusTag 渲染为 span.status-tag.status-tag-online
    expect(tag.closest('.status-tag')).toHaveClass('status-tag-online')
  })

  it('online=false 时显示 warning StatusTag（黄底，无 pulse）', async () => {
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={offlineDev}
        open={true}
        onClose={() => {}}
      />
    )
    const tag = await screen.findByText('离线')
    expect(tag.closest('.status-tag')).toHaveClass('status-tag-warning')
  })

  it('详情字段用 KVList 渲染（label/value 对可见）', async () => {
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={onlineDev}
        open={true}
        onClose={() => {}}
      />
    )
    // 6 个基础 label 全部可见
    expect(await screen.findByText('设备名')).toBeInTheDocument()
    expect(screen.getByText('类型')).toBeInTheDocument()
    expect(screen.getByText('协议')).toBeInTheDocument()
    expect(screen.getByText('PID')).toBeInTheDocument()
    expect(screen.getByText('终端 MAC')).toBeInTheDocument()
    expect(screen.getByText('在线状态')).toBeInTheDocument()
    // value 也可见
    expect(screen.getByText('TH')).toBeInTheDocument()
    expect(screen.getByText('modbus')).toBeInTheDocument()
    expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument()
    // 备注来自 mountDev API 数据
    await waitFor(() => {
      expect(screen.getByText('测试备注')).toBeInTheDocument()
    })
  })

  it('点击「完整详情」按钮触发路由跳转 + onClose', async () => {
    const onClose = vi.fn()
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={onlineDev}
        open={true}
        onClose={onClose}
      />
    )
    const btn = await screen.findByRole('button', { name: /完\s*整\s*详\s*情/ })
    btn.click()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/admin/node/terminal/AA:BB:CC:DD:EE:FF/mount-dev/1')
  })

  it('TerminalCurData 收到正确 mac + pid', async () => {
    render(
      <MountDevDetailDrawer
        mac="AA:BB:CC:DD:EE:FF"
        dev={onlineDev}
        open={true}
        onClose={() => {}}
      />
    )
    const cur = await screen.findByTestId('terminal-cur-data')
    expect(cur).toHaveAttribute('data-mac', 'AA:BB:CC:DD:EE:FF')
    expect(cur).toHaveAttribute('data-pid', '1')
  })
})
