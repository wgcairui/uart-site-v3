import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Button } from './Button'

// 注意：antd v5 Button 在中文字符间自动插空格（防止字符粘连的 CSS 优化）
// 所以 '点击' 渲染成 '点 击'。测试用 container.querySelector('button') 绕过。

function getButtonByText(container: HTMLElement, text: string): HTMLElement {
  const buttons = container.querySelectorAll('button')
  for (const btn of Array.from(buttons)) {
    if (btn.textContent && btn.textContent.replace(/\s/g, '').includes(text)) {
      return btn as HTMLElement
    }
  }
  throw new Error(`Button with text "${text}" not found`)
}

describe('Button v2', () => {
  it('renders children', () => {
    const { container } = render(<Button>点击</Button>)
    expect(getButtonByText(container, '点击')).toBeInTheDocument()
  })

  it('default variant uses .btn-default class', () => {
    const { container } = render(<Button>默认</Button>)
    const btn = getButtonByText(container, '默认')
    expect(btn).toHaveClass('btn-default')
  })

  it('primary variant uses .btn-brand class (v2 紫粉渐变)', () => {
    const { container } = render(<Button variant="primary">主按钮</Button>)
    const btn = getButtonByText(container, '主按钮')
    expect(btn).toHaveClass('btn-brand')
  })

  it('ghost variant uses .btn-ghost class (v2 新增)', () => {
    const { container } = render(<Button variant="ghost">透明</Button>)
    const btn = getButtonByText(container, '透明')
    expect(btn).toHaveClass('btn-ghost')
  })

  it('danger variant uses .btn-danger class', () => {
    const { container } = render(<Button variant="danger">删除</Button>)
    const btn = getButtonByText(container, '删除')
    expect(btn).toHaveClass('btn-danger')
  })

  it('link variant uses .btn-link class', () => {
    const { container } = render(<Button variant="link">链接</Button>)
    const btn = getButtonByText(container, '链接')
    expect(btn).toHaveClass('btn-link')
  })

  it('fires onClick', () => {
    const onClick = vi.fn()
    const { container } = render(<Button onClick={onClick}>点击</Button>)
    fireEvent.click(getButtonByText(container, '点击'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled blocks onClick', () => {
    const onClick = vi.fn()
    const { container } = render(<Button disabled onClick={onClick}>禁用</Button>)
    fireEvent.click(getButtonByText(container, '禁用'))
    expect(onClick).not.toHaveBeenCalledTimes(1)
  })
})
