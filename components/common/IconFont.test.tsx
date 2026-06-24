import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { IconFont, IconFontSpin, devTypeIcon } from './IconFont'

describe('IconFont', () => {
  it('exports IconFont component', () => {
    expect(IconFont).toBeDefined()
    expect(typeof IconFont).toBe('object')  // antd 的 createFromIconfontCN 返回 forwardRef 组件
  })

  it('exports IconFontSpin component', () => {
    expect(IconFontSpin).toBeDefined()
  })

  it('exports devTypeIcon dict with 5 entries', () => {
    expect(Object.keys(devTypeIcon)).toHaveLength(5)
    expect(devTypeIcon['空调']).toBeDefined()
    expect(devTypeIcon['IO']).toBeDefined()
    expect(devTypeIcon['电量仪']).toBeDefined()
    expect(devTypeIcon['UPS']).toBeDefined()
    expect(devTypeIcon['TH']).toBeDefined()
  })

  it('renders devTypeIcon entries as React elements', () => {
    // 验证 devTypeIcon 里的 React element 有 type IconFont
    for (const [name, el] of Object.entries(devTypeIcon)) {
      expect(el, `${name} should be a React element`).toBeTruthy()
      // React element 有 $$typeof 字段
      expect((el as { $$typeof?: unknown }).$$typeof, `${name} should be a valid React element`).toBeDefined()
    }
  })
})

describe('IconFontSpin', () => {
  it('renders without crashing', () => {
    const { container } = render(<IconFontSpin type="icon-test" />)
    // antd 的 IconFont 用 .anticon 类
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts custom fontSize prop', () => {
    const { container } = render(<IconFontSpin type="icon-test" fontSize={64} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts custom color prop', () => {
    const { container } = render(<IconFontSpin type="icon-test" color="#ff0000" />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
