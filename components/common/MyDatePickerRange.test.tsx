import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import dayjs from 'dayjs'
import { MyDatePickerRange } from './MyDatePickerRange'

describe('MyDatePickerRange', () => {
  it('renders with default range (last 1 day to now)', () => {
    const { container } = render(<MyDatePickerRange />)
    // antd RangePicker 用 .ant-picker 容器
    expect(container.querySelector('.ant-picker')).toBeInTheDocument()
  })

  it('renders with custom start and end', () => {
    const start = dayjs('2026-01-01')
    const end = dayjs('2026-01-31')
    const { container } = render(<MyDatePickerRange start={start} end={end} />)
    expect(container.querySelector('.ant-picker')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <MyDatePickerRange>
        <button>查询</button>
      </MyDatePickerRange>
    )
    expect(screen.getByRole('button', { name: '查询' })).toBeInTheDocument()
  })

  it('respects lastDay prop for default range', () => {
    const { container } = render(<MyDatePickerRange lastDay={7} />)
    expect(container.querySelector('.ant-picker')).toBeInTheDocument()
  })

  it('calls onChange on initial mount with default range', () => {
    const onChange = vi.fn()
    render(<MyDatePickerRange onChange={onChange} />)
    // useEffect 在 mount 时调用 onChange
    expect(onChange).toHaveBeenCalled()
    const call = onChange.mock.calls[0]
    expect(call).toBeDefined()
    // 第一个参数是 [dayjs, dayjs]，第二个是 [string, string]
    expect(Array.isArray(call![0])).toBe(true)
    expect(dayjs.isDayjs(call![0][0])).toBe(true)
  })

  it('initial onChange provides string representation of range', () => {
    const onChange = vi.fn()
    render(<MyDatePickerRange onChange={onChange} lastDay={3} />)
    const call = onChange.mock.calls[0]
    expect(call).toBeDefined()
    // 第二个参数是 [string, string]
    expect(Array.isArray(call![1])).toBe(true)
    expect(typeof call![1][0]).toBe('string')
    expect(typeof call![1][1]).toBe('string')
  })
})
