import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppSkeleton } from './AppSkeleton'

describe('AppSkeleton', () => {
  it('renders default table variant', () => {
    const { container } = render(<AppSkeleton />)
    // antd Skeleton 用 .ant-skeleton 容器
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument()
  })

  it('renders table variant with columns × rows', () => {
    const { container } = render(<AppSkeleton variant="table" columns={3} rows={5} />)
    expect(container.querySelectorAll('.ant-skeleton').length).toBeGreaterThan(0)
  })

  it('renders card variant with cardCount', () => {
    const { container } = render(<AppSkeleton variant="card" cardCount={3} />)
    const cards = container.querySelectorAll('div > div')
    // 至少 3 个卡片容器
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('renders list variant with listCount', () => {
    const { container } = render(<AppSkeleton variant="list" listCount={4} />)
    expect(container.querySelectorAll('.ant-skeleton').length).toBeGreaterThanOrEqual(4)
  })

  it('renders paragraph variant', () => {
    const { container } = render(<AppSkeleton variant="paragraph" paragraphRows={3} />)
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument()
  })
})
