import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * LiveControls · tier 3 渲染 + 部分行为测试
 *
 * 2 个 variant:
 *   - admin: 显示 6 status counts (online/offline/warning/error/info/idle)
 *   - device: 显示 6 tile (Ua/Ia/P/Q/PF/E) + sparkline
 *
 * 行为点:
 *   - useEffect 触发 getAdminTileCounts / getDeviceTiles
 *   - loading 时显示 <Spin />, 数据回来后切到内容
 *   - 防御性 ?? 兜底 (mac/pid 缺失 → 返回 null, null value → '—')
 *   - 数字格式: PF .2f, E .1f, 其他 .2f
 */

// ─── Mocks ───────────────────────────────────────────────────────────
const {
  mockGetAdminTileCounts,
  mockGetAdminTileHistory,
  mockGetDeviceTiles,
  mockGetDeviceTileHistory,
} = vi.hoisted(() => ({
  mockGetAdminTileCounts: vi.fn(),
  mockGetAdminTileHistory: vi.fn(),
  mockGetDeviceTiles: vi.fn(),
  mockGetDeviceTileHistory: vi.fn(),
}))

vi.mock('@/lib/api/endpoints/user', () => ({
  getDeviceTiles: (...args: unknown[]) => mockGetDeviceTiles(...args),
  getDeviceTileHistory: (...args: unknown[]) => mockGetDeviceTileHistory(...args),
}))

vi.mock('@/lib/api/endpoints/admin/dashboard', () => ({
  getAdminTileCounts: () => mockGetAdminTileCounts(),
  getAdminTileHistory: (...args: unknown[]) => mockGetAdminTileHistory(...args),
}))

import { LiveControls } from './LiveControls'

beforeEach(() => {
  mockGetAdminTileCounts.mockReset()
  mockGetAdminTileHistory.mockReset()
  mockGetDeviceTiles.mockReset()
  mockGetDeviceTileHistory.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────
function flushEffects() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('LiveControls', () => {
  // ─── 1. Loading / 防禦性 ?? ────────────────────────────────────
  it('shows Spin while data is loading (admin)', () => {
    mockGetAdminTileCounts.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = render(<LiveControls variant="admin" />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('shows Spin when device variant missing mac (no fetch triggered)', () => {
    // 当 mac/pid 缺失, useEffect 不发 fetch, setLoading(false) 永不调用, 一直 Spin
    mockGetDeviceTiles.mockReturnValue(new Promise(() => {}))
    const { container } = render(<LiveControls variant="device" />)
    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
  })

  // ─── 2. admin variant ──────────────────────────────────────────
  it('admin variant: calls getAdminTileCounts on mount', async () => {
    mockGetAdminTileCounts.mockResolvedValue({
      data: { online: 10, offline: 2, warning: 0, error: 0, info: 0, idle: 0 },
    })
    render(<LiveControls variant="admin" />)
    await waitFor(() => {
      expect(mockGetAdminTileCounts).toHaveBeenCalled()
    })
  })

  it('admin variant: renders 6 status labels + counts after data loads', async () => {
    mockGetAdminTileCounts.mockResolvedValue({
      data: { online: 10, offline: 2, warning: 0, error: 0, info: 0, idle: 0 },
    })
    render(<LiveControls variant="admin" />)
    // 6 个 status label: 在线 / 离线 / 告警 / 故障 / 信息 / 空闲
    expect(await screen.findByText('在线')).toBeInTheDocument()
    expect(screen.getByText('离线')).toBeInTheDocument()
    expect(screen.getByText('告警')).toBeInTheDocument()
    expect(screen.getByText('故障')).toBeInTheDocument()
    expect(screen.getByText('提示')).toBeInTheDocument()
    expect(screen.getByText('空闲')).toBeInTheDocument()
    // counts
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('admin variant: shows "系统健康" badge when 4 optional statuses are 0', async () => {
    mockGetAdminTileCounts.mockResolvedValue({
      data: { online: 100, offline: 0, warning: 0, error: 0, info: 0, idle: 0 },
    })
    render(<LiveControls variant="admin" />)
    await waitFor(() => {
      expect(screen.getByText(/当前无告警/)).toBeInTheDocument()
    })
  })

  it('admin variant: hides "系统健康" badge when any optional status > 0', async () => {
    mockGetAdminTileCounts.mockResolvedValue({
      data: { online: 100, offline: 0, warning: 3, error: 0, info: 0, idle: 0 },
    })
    render(<LiveControls variant="admin" />)
    await waitFor(() => {
      expect(screen.getByText('在线')).toBeInTheDocument()
    })
    expect(screen.queryByText(/当前无告警/)).not.toBeInTheDocument()
  })

  // ─── 3. device variant ─────────────────────────────────────────
  it('device variant: calls getDeviceTiles with (mac, pid) on mount', async () => {
    mockGetDeviceTiles.mockResolvedValue({
      data: {
        tiles: {
          Ua: { value: 220, unit: 'V' },
          Ia: { value: 5, unit: 'A' },
          P: { value: 1.1, unit: 'kW' },
          Q: { value: 0.2, unit: 'kVar' },
          PF: { value: 0.95, unit: '' },
          E: { value: 12.345, unit: 'kWh' },
        },
      },
    })
    mockGetDeviceTileHistory.mockResolvedValue({ data: { buckets: [] } })
    render(<LiveControls variant="device" mac="AA:BB" pid={0} />)
    await waitFor(() => {
      expect(mockGetDeviceTiles).toHaveBeenCalledWith('AA:BB', 0)
    })
  })

  it('device variant: renders 6 tile labels after data loads', async () => {
    mockGetDeviceTiles.mockResolvedValue({
      data: {
        tiles: {
          Ua: { value: 220, unit: 'V' },
          Ia: { value: 5, unit: 'A' },
          P: { value: 1.1, unit: 'kW' },
          Q: { value: 0.2, unit: 'kVar' },
          PF: { value: 0.95, unit: '' },
          E: { value: 12.3, unit: 'kWh' },
        },
      },
    })
    mockGetDeviceTileHistory.mockResolvedValue({ data: { buckets: [] } })
    render(<LiveControls variant="device" mac="AA:BB" pid={0} />)
    // 6 个 tile 标签
    expect(await screen.findByText('电压 Ua')).toBeInTheDocument()
    expect(screen.getByText('电流 Ia')).toBeInTheDocument()
    expect(screen.getByText('有功功率')).toBeInTheDocument()
    expect(screen.getByText('无功功率')).toBeInTheDocument()
    expect(screen.getByText('功率因数')).toBeInTheDocument()
    expect(screen.getByText('今日能耗')).toBeInTheDocument()
  })

  it('device variant: formats PF to 2 decimals, E to 1 decimal, others to 2', async () => {
    mockGetDeviceTiles.mockResolvedValue({
      data: {
        tiles: {
          Ua: { value: 220.123, unit: 'V' },
          Ia: { value: 5.456, unit: 'A' },
          P: { value: 1.111, unit: 'kW' },
          Q: { value: 0.222, unit: 'kVar' },
          PF: { value: 0.987, unit: '' },
          E: { value: 12.345, unit: 'kWh' },
        },
      },
    })
    mockGetDeviceTileHistory.mockResolvedValue({ data: { buckets: [] } })
    render(<LiveControls variant="device" mac="AA:BB" pid={0} />)
    await flushEffects()
    await waitFor(() => {
      // PF 0.99 (2 dec), E 12.3 (1 dec), others 2 dec
      expect(screen.getByText('220.12')).toBeInTheDocument()
      expect(screen.getByText('5.46')).toBeInTheDocument()
      expect(screen.getByText('1.11')).toBeInTheDocument()
      expect(screen.getByText('0.22')).toBeInTheDocument()
      expect(screen.getByText('0.99')).toBeInTheDocument()
      expect(screen.getByText('12.3')).toBeInTheDocument()
    })
  })

  it('device variant: shows "—" for null tile values (defensive ?? null)', async () => {
    mockGetDeviceTiles.mockResolvedValue({
      data: {
        tiles: {
          Ua: { value: null, unit: 'V' },
          Ia: { value: null, unit: 'A' },
          P: { value: null, unit: 'kW' },
          Q: { value: null, unit: 'kVar' },
          PF: { value: null, unit: '' },
          E: { value: null, unit: 'kWh' },
        },
      },
    })
    mockGetDeviceTileHistory.mockResolvedValue({ data: { buckets: [] } })
    const { container } = render(
      <LiveControls variant="device" mac="AA:BB" pid={0} />
    )
    await waitFor(() => {
      expect(screen.getByText('电压 Ua')).toBeInTheDocument()
    })
    // 6 个 '—' 兜底
    const dashes = container.textContent?.match(/—/g) || []
    expect(dashes.length).toBeGreaterThanOrEqual(6)
  })

  it('device variant: render null when tiles data is empty (defensive)', () => {
    mockGetDeviceTiles.mockResolvedValue({ data: { tiles: null } })
    mockGetDeviceTileHistory.mockResolvedValue({ data: { buckets: [] } })
    const { container } = render(
      <LiveControls variant="device" mac="AA:BB" pid={0} />
    )
    // tiles=null → 不进 device 分支, 走 return null
    return flushEffects().then(() => {
      // 组件挂载时还在 loading, 异步 setLoading(false) 后还是 null (因为 tiles 为 null)
      // 等待 setLoading 完成
      expect(container.firstChild).toBeNull()
    })
  })

  it('device variant: renders sparkline SVG when history has 2+ buckets', async () => {
    mockGetDeviceTiles.mockResolvedValue({
      data: {
        tiles: {
          Ua: { value: 220, unit: 'V' },
          Ia: { value: 5, unit: 'A' },
          P: { value: 1.1, unit: 'kW' },
          Q: { value: 0.2, unit: 'kVar' },
          PF: { value: 0.95, unit: '' },
          E: { value: 12, unit: 'kWh' },
        },
      },
    })
    mockGetDeviceTileHistory.mockResolvedValue({
      data: { buckets: [{ value: 210 }, { value: 215 }, { value: 220 }] },
    })
    const { container } = render(
      <LiveControls variant="device" mac="AA:BB" pid={0} />
    )
    await waitFor(() => {
      expect(screen.getByText('电压 Ua')).toBeInTheDocument()
    })
    // Sparkline 内部 useEffect 异步取 history, setPoints 后才渲染 SVG
    // 需要 waitFor 等 SVG 出现 (in isolation 微秒级 OK, full suite 因 setInterval 调度可能延迟)
    await waitFor(() => {
      const svgs = container.querySelectorAll('svg.ctrl-tile-spark')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  // ─── 4. interval cleanup (defensive — alive flag) ──────────────
  it('polls every refreshMs: setInterval is set; clears on unmount', async () => {
    mockGetAdminTileCounts.mockResolvedValue({
      data: { online: 1, offline: 0, warning: 0, error: 0, info: 0, idle: 0 },
    })
    const { unmount } = render(
      <LiveControls variant="admin" refreshMs={500} />
    )
    await waitFor(() => {
      expect(mockGetAdminTileCounts).toHaveBeenCalledTimes(1)
    })
    // unmount 立即调用, 不等下一个 tick
    unmount()
    // 500ms 后, 不会有额外调用
    await new Promise((r) => setTimeout(r, 700))
    // 仍然是 1 次 (unmount 后 setInterval 被 clear)
    expect(mockGetAdminTileCounts).toHaveBeenCalledTimes(1)
  })
})
