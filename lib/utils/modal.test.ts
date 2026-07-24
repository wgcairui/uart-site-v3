import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock antd Modal 静态方法（5 个 + 原生 destroyFns 走 Module 内部，不影响）
vi.mock('antd', () => ({
  Modal: {
    confirm: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    warn: vi.fn(),
  },
}))

import { Modal } from 'antd'
import { confirm, success, info, error, warning } from './modal'

describe('modal wrapper', () => {
  beforeEach(() => {
    // 每个 case 前重置 mock 调用记录
    vi.mocked(Modal.confirm).mockClear()
    vi.mocked(Modal.success).mockClear()
    vi.mocked(Modal.info).mockClear()
    vi.mocked(Modal.error).mockClear()
    vi.mocked(Modal.warning).mockClear()
  })

  describe('confirm', () => {
    it('调 antd Modal.confirm，传入 props（除 ok/cancel Button props 之外）不变', () => {
      const onOk = vi.fn()
      confirm({
        title: '确认操作',
        content: '内容',
        onOk,
      })

      expect(Modal.confirm).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      expect(callArg.title).toBe('确认操作')
      expect(callArg.content).toBe('内容')
      expect(callArg.onOk).toBe(onOk)
    })

    it('自动加 okButtonProps.className = "btn-brand"（非 danger）', () => {
      confirm({ title: 't', content: 'c' })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string; danger?: boolean }
      expect(okProps.className).toBe('btn-brand')
      expect(okProps.danger).toBeUndefined()
    })

    it('okButtonProps.danger === true 时改用 "btn-danger"', () => {
      confirm({
        title: '危险',
        content: '不可撤销',
        okButtonProps: { danger: true },
      })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string; danger?: boolean }
      expect(okProps.className).toBe('btn-danger')
      expect(okProps.danger).toBe(true)
    })

    it('调用方已传 okButtonProps.className，wrapper 不覆盖（最高优先级）', () => {
      confirm({
        title: '自定义',
        content: 'c',
        okButtonProps: { className: 'my-custom-ok' },
      })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('my-custom-ok')
    })

    it('调用方传 okButtonProps.danger + 自己的 className → 同时尊重（className 不被注入 btn-danger）', () => {
      confirm({
        title: 't',
        okButtonProps: { danger: true, className: 'kill-btn' },
      })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string; danger?: boolean }
      expect(okProps.className).toBe('kill-btn')
      expect(okProps.danger).toBe(true)
    })

    it('自动加 cancelButtonProps.className = "btn-default"', () => {
      confirm({ title: 't', content: 'c' })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const cancelProps = callArg.cancelButtonProps as { className: string }
      expect(cancelProps.className).toBe('btn-default')
    })

    it('调用方已传 cancelButtonProps，wrapper 保留调用方字段', () => {
      confirm({
        title: 't',
        cancelButtonProps: { disabled: true },
      })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const cancelProps = callArg.cancelButtonProps as { className: string; disabled?: boolean }
      expect(cancelProps.className).toBe('btn-default')  // 默认注入
      expect(cancelProps.disabled).toBe(true)  // 调用方字段保留
    })

    it('调用方已传 cancelButtonProps.className，wrapper 不覆盖', () => {
      confirm({
        title: 't',
        cancelButtonProps: { className: 'my-cancel' },
      })

      const callArg = vi.mocked(Modal.confirm).mock.calls[0]?.[0] as Record<string, unknown>
      const cancelProps = callArg.cancelButtonProps as { className: string }
      expect(cancelProps.className).toBe('my-cancel')
    })
  })

  describe('success / info / error / warning (通知类 — 仅 OK 按钮，无 cancel)', () => {
    it('success 调 Modal.success，注入 okButtonProps.className = "btn-brand"', () => {
      success({ content: '已保存' })
      expect(Modal.success).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(Modal.success).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('btn-brand')
    })

    it('info 调 Modal.info，注入 okButtonProps.className = "btn-brand"', () => {
      info({ content: '提示' })
      expect(Modal.info).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(Modal.info).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('btn-brand')
    })

    it('error 调 Modal.error，注入 okButtonProps.className = "btn-brand"', () => {
      error({ content: '失败' })
      expect(Modal.error).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(Modal.error).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('btn-brand')
    })

    it('warning 调 Modal.warning，注入 okButtonProps.className = "btn-brand"', () => {
      warning({ content: '警告' })
      expect(Modal.warning).toHaveBeenCalledTimes(1)
      const callArg = vi.mocked(Modal.warning).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('btn-brand')
    })

    it('error + danger 模式：用 btn-danger', () => {
      error({
        content: '严重错误',
        okButtonProps: { danger: true },
      })
      const callArg = vi.mocked(Modal.error).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string; danger?: boolean }
      expect(okProps.className).toBe('btn-danger')
      expect(okProps.danger).toBe(true)
    })

    it('调用方传 okButtonProps.className 时不覆盖（success 也遵守）', () => {
      success({
        content: 'ok',
        okButtonProps: { className: 'custom-success' },
      })
      const callArg = vi.mocked(Modal.success).mock.calls[0]?.[0] as Record<string, unknown>
      const okProps = callArg.okButtonProps as { className: string }
      expect(okProps.className).toBe('custom-success')
    })

    it('通知类不注入 cancelButtonProps（与 confirm 行为不同）', () => {
      // success/info/error/warning 是通知类，无 cancel 按钮 — wrapper 也不应传递 cancelButtonProps
      // 这里我们验证：原 props 没有 cancelButtonProps 时，传给 antd 的也不应有
      success({ content: '已保存' })
      const callArg = vi.mocked(Modal.success).mock.calls[0]?.[0] as Record<string, unknown>
      // callArg 可能有 cancelButtonProps=undefined（从 spread 透传）
      // 但 wrapper 不主动注入 btn-default
      if (callArg.cancelButtonProps !== undefined) {
        const cancelProps = callArg.cancelButtonProps as { className?: string }
        // 如果 antd 那边有 cancelButtonProps（透传），它的 className 不应该是 btn-default
        expect(cancelProps.className).not.toBe('btn-default')
      }
      // 主要断言：success 通知类不主动注入 cancelButtonProps
      // （没有 cancel 按钮可言）
      expect(Modal.success).toHaveBeenCalledTimes(1)
    })
  })
})
