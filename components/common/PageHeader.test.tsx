import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageHeader } from './PageHeader'

const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
}))

describe('PageHeader', () => {
  beforeEach(() => {
    pushMock.mockClear()
    backMock.mockClear()
  })

  it('renders title', () => {
    render(<PageHeader title="设备管理" />)
    expect(screen.getByRole('heading', { name: '设备管理' })).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="标题" subtitle="副标题说明" />)
    expect(screen.getByText('副标题说明')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="标题" />)
    expect(container.querySelector('.app-page-header-subtitle')).not.toBeInTheDocument()
  })

  it('renders extra area', () => {
    render(<PageHeader title="标题" extra={<button>添加</button>} />)
    expect(screen.getByRole('button', { name: '添加' })).toBeInTheDocument()
  })

  it('renders breadcrumb without link', () => {
    render(<PageHeader title="当前页" breadcrumb={[{ title: '首页' }, { title: '设备' }]} />)
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('设备')).toBeInTheDocument()
  })

  it('renders breadcrumb with link, calls router.push on click', () => {
    render(<PageHeader title="当前页" breadcrumb={[{ title: '首页', href: '/main' }]} />)
    fireEvent.click(screen.getByText('首页'))
    expect(pushMock).toHaveBeenCalledWith('/main')
  })

  it('separates breadcrumb items with /', () => {
    const { container } = render(
      <PageHeader title="当前页" breadcrumb={[{ title: '首页' }, { title: '设备' }]} />
    )
    expect(container.textContent).toMatch(/首页.*\/.*设备/)
  })

  it('shows back button when back=true, calls router.back()', () => {
    render(<PageHeader title="标题" back />)
    fireEvent.click(screen.getByText('← 返回'))
    expect(backMock).toHaveBeenCalled()
  })

  it('uses custom onBack when provided', () => {
    const onBack = vi.fn()
    render(<PageHeader title="标题" back onBack={onBack} />)
    fireEvent.click(screen.getByText('← 返回'))
    expect(onBack).toHaveBeenCalled()
    expect(backMock).not.toHaveBeenCalled()
  })

  it('does not show back button by default', () => {
    render(<PageHeader title="标题" />)
    expect(screen.queryByText('← 返回')).not.toBeInTheDocument()
  })
})
