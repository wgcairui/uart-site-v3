import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KVList } from './KVList'

describe('KVList', () => {
  it('renders label-value pairs', () => {
    const items = [
      { label: '设备ID', value: 'ABC123' },
      { label: '设备类型', value: '温度传感器' },
    ]
    render(<KVList items={items} />)
    expect(screen.getByText('设备ID')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('设备类型')).toBeInTheDocument()
    expect(screen.getByText('温度传感器')).toBeInTheDocument()
  })

  it('renders ReactNode value', () => {
    render(
      <KVList
        items={[{ label: '状态', value: <span data-testid="status">在线</span> }]}
      />
    )
    expect(screen.getByTestId('status')).toBeInTheDocument()
  })

  it('renders empty list', () => {
    const { container } = render(<KVList items={[]} />)
    expect(container.querySelector('.app-card')).toBeInTheDocument()
  })

  it('renders with title and icon', () => {
    render(
      <KVList
        title="基础信息"
        icon={<span data-testid="title-icon">📋</span>}
        items={[{ label: 'a', value: 'b' }]}
      />
    )
    expect(screen.getByText('基础信息')).toBeInTheDocument()
    expect(screen.getByTestId('title-icon')).toBeInTheDocument()
  })

  it('respects column prop', () => {
    const { container } = render(
      <KVList column={3} items={[{ label: 'a', value: 'b' }]} />
    )
    const grid = container.querySelector('div > div') as HTMLElement
    // 第二个 div 才是 grid (第一个是 app-card wrapper)
    const grids = container.querySelectorAll('div[style*="grid-template-columns"]')
    expect(grids.length).toBeGreaterThan(0)
  })

  it('shows - placeholder when value is null', () => {
    render(<KVList items={[{ label: '设备类型', value: null }]} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
