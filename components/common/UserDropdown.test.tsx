import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock useUserStore BEFORE importing UserDropdown
const { mockSetUser, mockConnect, mockDisconnect, mockUserInfo, mockNav, mockClearAllTokens } = vi.hoisted(() => ({
  mockSetUser: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockUserInfo: vi.fn(),
  mockNav: vi.fn(),
  mockClearAllTokens: vi.fn(),
}))

vi.mock('@/lib/store/userStore', () => ({
  useUserStore: {
    getState: () => ({ setUser: mockSetUser }),
  },
}))

vi.mock('@/lib/socket', () => ({
  socketClient: {
    connect: mockConnect,
    disConnect: mockDisconnect,
  },
}))

vi.mock('@/lib/api/fetch', () => ({
  userInfo: () => mockUserInfo(),
}))

vi.mock('@/lib/hooks/useNav', () => ({
  useNav: () => mockNav,
}))

vi.mock('@/lib/utils/token', () => ({
  clearAllTokens: () => mockClearAllTokens(),
}))

import { UserDropDown } from './UserDropdown'

describe('UserDropdown', () => {
  beforeEach(() => {
    mockUserInfo.mockReset()
    mockSetUser.mockClear()
    mockConnect.mockClear()
    mockDisconnect.mockClear()
    mockNav.mockClear()
    mockClearAllTokens.mockClear()
  })

  it('shows loading state initially', () => {
    mockUserInfo.mockReturnValue(new Promise(() => {}))
    const { container } = render(<UserDropDown userPage="/main/userinfo" />)
    expect(container.textContent).toContain('...')
  })

  it('renders user initial when data loaded (no avatar)', async () => {
    mockUserInfo.mockResolvedValue({
      code: 200,
      data: { user: 'alice', avanter: '' },
    })
    const { container } = render(<UserDropDown userPage="/main/userinfo" />)
    await waitFor(() => {
      expect(container.textContent).not.toBe('...')
    })
    expect(container.textContent).toContain('A')
  })

  it('renders avatar image when avanter URL provided', async () => {
    mockUserInfo.mockResolvedValue({
      code: 200,
      data: { user: 'bob', avanter: 'https://example.com/avatar.png' },
    })
    render(<UserDropDown userPage="/main/userinfo" />)
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'bob' })).toBeInTheDocument()
    })
    const img = screen.getByRole('img', { name: 'bob' }) as HTMLImageElement
    expect(img.src).toContain('avatar.png')
  })

  it('calls setUser on userStore when data loaded', async () => {
    mockUserInfo.mockResolvedValue({
      code: 200,
      data: { user: 'charlie' },
    })
    render(<UserDropDown userPage="/main/userinfo" />)
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ user: 'charlie' })
      )
    })
  })

  it('connects socket on user load', async () => {
    mockUserInfo.mockResolvedValue({
      code: 200,
      data: { user: 'dave' },
    })
    render(<UserDropDown userPage="/main/userinfo" />)
    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith('dave')
    })
  })

  it('falls back to "U" initial when no user', async () => {
    mockUserInfo.mockResolvedValue({ code: 200, data: {} })
    const { container } = render(<UserDropDown userPage="/main/userinfo" />)
    await waitFor(() => {
      expect(container.textContent).not.toBe('...')
    })
    expect(container.textContent).toContain('U')
  })
})
