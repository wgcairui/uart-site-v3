import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

import { RotateTokenModal } from './RotateTokenModal'

describe('RotateTokenModal', () => {
  beforeEach(() => {
    // jsdom 不实现 navigator.clipboard — 走 mock
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('不渲染内容当 open=false', () => {
    const { container } = render(
      <RotateTokenModal
        open={false}
        onClose={() => {}}
        single={{ Name: 'node-1', plainToken: 'tok-abc' }}
      />
    )
    // antd Modal 在 open=false 时不挂载到 DOM
    expect(container.textContent ?? '').toBe('')
    expect(screen.queryByText('节点 Token 已重置')).not.toBeInTheDocument()
  })

  it('open=true 时渲染 modal 标题和单 token 内容', async () => {
    render(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'node-1', plainToken: 'tok-abc' }}
        source="rotate"
      />
    )
    expect(await screen.findByText('节点 Token 已重置')).toBeInTheDocument()
    // Alert 标题
    expect(screen.getByText('明文 token 只会显示一次')).toBeInTheDocument()
    // node 名称 + token 内容
    expect(screen.getByText('node-1')).toBeInTheDocument()
    expect(screen.getByText('tok-abc')).toBeInTheDocument()
  })

  it('SOURCE_TITLE 文案随 source 变化 (rotate / create / init)', async () => {
    const { rerender } = render(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="rotate"
      />
    )
    expect(await screen.findByText('节点 Token 已重置')).toBeInTheDocument()

    rerender(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="create"
      />
    )
    expect(await screen.findByText('节点已创建')).toBeInTheDocument()

    rerender(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="init"
      />
    )
    expect(await screen.findByText('节点 Token 已生成')).toBeInTheDocument()
  })

  it('SOURCE_HINT 文案随 source 变化 (rotate / create / init)', async () => {
    const { rerender } = render(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="rotate"
      />
    )
    expect(
      await screen.findByText(/请将新的 token 更新到对应 Node 部署配置/)
    ).toBeInTheDocument()

    rerender(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="create"
      />
    )
    expect(
      await screen.findByText(/请将 token 写入 Node 部署配置.*NODE_TOKEN.*后启动 Node/)
    ).toBeInTheDocument()

    rerender(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'n', plainToken: 't' }}
        source="init"
      />
    )
    expect(
      await screen.findByText(/该节点已启用 Token 鉴权/)
    ).toBeInTheDocument()
  })

  it('单 token 模式显示 plainToken + 复制按钮', async () => {
    render(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'alpha', plainToken: 'plain-token-xyz' }}
      />
    )
    expect(await screen.findByText('plain-token-xyz')).toBeInTheDocument()
    // 复制按钮 — antd v5/v6 中文按钮字符间可能插空格, 用 \s* 容忍
    const copyBtn = await screen.findByRole('button', { name: /复\s*制/ })
    expect(copyBtn).toBeInTheDocument()
  })

  it('点击复制按钮触发 navigator.clipboard.writeText', async () => {
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>
    render(
      <RotateTokenModal
        open
        onClose={() => {}}
        single={{ Name: 'alpha', plainToken: 'plain-token-xyz' }}
      />
    )
    const copyBtn = await screen.findByRole('button', { name: /复\s*制/ })
    fireEvent.click(copyBtn)
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('plain-token-xyz')
    })
  })

  it('点 footer 按钮调用 onClose', async () => {
    const onClose = vi.fn()
    render(
      <RotateTokenModal
        open
        onClose={onClose}
        single={{ Name: 'n', plainToken: 't' }}
      />
    )
    const ackBtn = await screen.findByRole('button', { name: /我\s*已\s*保\s*存/ })
    fireEvent.click(ackBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
