'use client'

/**
 * RotateTokenModal — 重置 / 创建 / 初始化节点 token 后的明文展示 modal
 *
 * 关键约束:
 * - 明文 token 仅此一次返回，UI 必须强烈提示运维立即保存
 * - 不提供 CSV 下载、不缓存、不持久化
 * - 单 token 模式 / 多 token 列表模式共用一个组件
 *
 * 视觉规范 (v2 · docs/style-guide.md §2):
 * - 删 hardcoded hex (#e84545 / #3a8ee6 / #1a2332 / #4a5670 / #fafbfd / #f0f4f9)
 * - `<Tag color="blue">` → `<StatusTag variant="info">` (v2 token)
 * - `<Button type="primary" danger>` → `<Button variant="danger">` (v2 组件)
 * - inline 'JetBrains Mono' → `var(--font-mono)`
 * - 单 token 走 "code panel" (深色 hero 容器)
 * - 列表模式走 BentoCard 容器
 */

import { useState } from 'react'
import { Alert, Modal, Space, message } from 'antd'
import {
  CopyOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'

import { Button } from '@/components/common/Button'
import { BentoCard } from '@/components/common/BentoCard'
import { StatusTag } from '@/components/common/StatusTag'
import type { NodeTokenPlain } from '@/lib/api/fetchRoot'

export interface RotateTokenModalProps {
  open: boolean
  onClose: () => void
  /** 单 token 模式(重置单个节点 / 创建新节点 / 为老节点首次配 token) */
  single?: { Name: string; plainToken: string } | null | undefined
  /** 多 token 列表模式(预留:目前未使用,保留以便后端再返回多 token 时复用) */
  list?: NodeTokenPlain[] | null | undefined
  /** 来源标识: 'rotate' | 'create' | 'init'，影响顶部提示文案 */
  source?: 'rotate' | 'create' | 'init' | undefined
}

const SOURCE_TITLE: Record<NonNullable<RotateTokenModalProps['source']>, string> = {
  rotate: '节点 Token 已重置',
  create: '节点已创建',
  init: '节点 Token 已生成',
}

const SOURCE_HINT: Record<NonNullable<RotateTokenModalProps['source']>, string> = {
  rotate: '请将新的 token 更新到对应 Node 部署配置（环境变量 / k8s Secret）。旧 token 立即失效。',
  create: '请将 token 写入 Node 部署配置（环境变量 NODE_TOKEN）后启动 Node。未配置 token 的新节点无法连接。',
  init: '该节点已启用 Token 鉴权,IP 回退路径已失效。请将 token 写入 Node 部署配置（环境变量 NODE_TOKEN）后启动 Node,否则该节点无法连接。',
}

/** Modal 宽度常量 — 长 token 字符串需要更宽容器 */
const WIDTH = 720

/** 复制按钮 2s 后清除"已复制"标记 */
const COPIED_RESET_MS = 2000

/** 列表模式 容器最大高度 */
const LIST_MAX_HEIGHT = 420

export function RotateTokenModal({
  open,
  onClose,
  single,
  list,
  source = 'rotate',
}: RotateTokenModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      message.success('已复制到剪贴板')
      setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur))
      }, COPIED_RESET_MS)
    } catch {
      message.error('复制失败，请手动选中复制')
    }
  }

  const isListMode = !!list && list.length > 0

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="ack" variant="danger" onClick={onClose}>
          我已保存
        </Button>,
      ]}
      width={WIDTH}
      destroyOnHidden
      title={
        <Space>
          <ExclamationCircleFilled
            style={{ color: 'var(--color-danger)', fontSize: 20 }}
            aria-label="warning"
          />
          <span>{SOURCE_TITLE[source]}</span>
        </Space>
      }
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        title="明文 token 只会显示一次"
        description={
          <div>
            <div style={{ marginBottom: 6 }}>{SOURCE_HINT[source]}</div>
            <div
              style={{
                color: 'var(--color-danger)',
                fontWeight: 500,
              }}
            >
              丢失后需重新生成，届时对应 Node 会在重连时被拒。
            </div>
          </div>
        }
      />

      {single && !isListMode && (
        <div data-testid="rotate-token-single">
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: 'var(--ink-500)',
              fontWeight: 500,
            }}
          >
            节点
          </div>
          <div style={{ marginBottom: 16 }}>
            <StatusTag variant="info" text={single.Name} size="md" />
          </div>
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: 'var(--ink-500)',
              fontWeight: 500,
            }}
          >
            Token
          </div>
          {/* 单 token 走"code panel" 风格 — 深色 hero 容器 + 紫光文字 */}
          <div
            style={{
              position: 'relative',
              padding: '16px 56px 16px 16px',
              background: 'var(--ink-900)',
              color: 'var(--brand-400)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              wordBreak: 'break-all',
              lineHeight: 1.6,
              letterSpacing: 0.5,
            }}
            data-testid="rotate-token-plain"
          >
            {single.plainToken}
            <Button
              variant="default"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copy(single.plainToken, 'single')}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              {copiedKey === 'single' ? '已复制' : '复制'}
            </Button>
          </div>
        </div>
      )}

      {isListMode && (
        <div data-testid="rotate-token-list">
          <div
            style={{
              marginBottom: 12,
              fontSize: 13,
              color: 'var(--ink-700)',
            }}
          >
            共 <b style={{ color: 'var(--ink-900)' }}>{list!.length}</b> 个节点
          </div>
          <BentoCard padding="sm" hoverable={false}>
            <div
              style={{
                maxHeight: LIST_MAX_HEIGHT,
                overflowY: 'auto',
                margin: '-8px',
              }}
            >
              {list!.map((item, idx) => (
                <div
                  key={item.Name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 8px',
                    borderBottom:
                      idx < list!.length - 1
                        ? '1px solid var(--ink-100)'
                        : 'none',
                    background:
                      idx % 2 === 0 ? 'transparent' : 'var(--ink-50)',
                  }}
                >
                  <div style={{ minWidth: 110 }}>
                    <StatusTag variant="info" text={item.Name} size="sm" />
                  </div>
                  <code
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--ink-900)',
                      background: 'var(--ink-100)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      wordBreak: 'break-all',
                    }}
                  >
                    {item.plainToken}
                  </code>
                  <Button
                    variant="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copy(item.plainToken, item.Name)}
                  >
                    {copiedKey === item.Name ? '已复制' : '复制'}
                  </Button>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      )}
    </Modal>
  )
}

export default RotateTokenModal
