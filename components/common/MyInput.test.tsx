import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MyInput } from './MyInput'

describe('MyInput', () => {
  it('renders default (non-textArea) mode', () => {
    const { container } = render(<MyInput />)
    // antd Input 用 .ant-input 类
    expect(container.querySelector('.ant-input')).toBeInTheDocument()
  })

  it('renders textArea mode when textArea=true', () => {
    const { container } = render(<MyInput textArea />)
    expect(container.querySelector('textarea')).toBeInTheDocument()
  })

  it('displays initial value', () => {
    const { container } = render(<MyInput value="hello" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('hello')
  })

  it('updates value on change', () => {
    const { container } = render(<MyInput />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'new value' } })
    expect(input.value).toBe('new value')
  })

  it('shows save button after focus (edit mode)', () => {
    const { container } = render(<MyInput value="initial" />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    // Edit 模式: 显示保存按钮（Button 文案为 props.okText 或 '保存'）
    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('fires onSave with current value when save clicked', () => {
    const onSave = vi.fn()
    const { container } = render(<MyInput value="saved" onSave={onSave} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    const saveBtn = container.querySelector('button') as HTMLElement
    fireEvent.click(saveBtn)
    expect(onSave).toHaveBeenCalledWith('saved')
  })

  it('uses custom okText for save button', () => {
    const { container } = render(<MyInput value="x" okText="确认" />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    // antd v5 Button 在中文字符间自动插空格（'确认' → '确 认'）
    const btn = container.querySelector('button') as HTMLElement
    expect(btn.textContent?.replace(/\s/g, '')).toContain('确认')
  })

  it('uses default "保存" when okText not provided', () => {
    const { container } = render(<MyInput value="x" />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    const btn = container.querySelector('button') as HTMLElement
    expect(btn.textContent?.replace(/\s/g, '')).toContain('保存')
  })

  it('does not fire onSave when not provided', () => {
    const { container } = render(<MyInput value="x" />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    const saveBtn = container.querySelector('button') as HTMLElement
    expect(() => fireEvent.click(saveBtn)).not.toThrow()
  })

  it('triggers save on Enter (onPressEnter)', () => {
    const onSave = vi.fn()
    const { container } = render(<MyInput value="enter-saved" onSave={onSave} />)
    const input = container.querySelector('input') as HTMLInputElement
    // 先 focus 进入 Edit 模式
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('enter-saved')
  })

  it('syncs value when props.value changes', () => {
    const { container, rerender } = render(<MyInput value="initial" />)
    let input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('initial')
    rerender(<MyInput value="updated" />)
    input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('updated')
  })
})
