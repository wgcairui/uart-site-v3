'use client'

/**
 * RotateTokenModal — 重置节点 token 后的明文展示 modal
 *
 * 关键约束:
 * - 明文 token 仅此一次返回，UI 必须强烈提示运维立即保存
 * - 不提供 CSV 下载、不缓存、不持久化
 * - 单 token 模式 / 多 token 列表模式共用一个组件
 */

import { useState } from 'react'
import { Alert, Button, Modal, Space, Tag, message } from 'antd'
import { CopyOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import type { NodeTokenPlain } from '@/lib/api/fetchRoot'

export interface RotateTokenModalProps {
  open: boolean
  onClose: () => void
  /** 单 token 模式(重置单个节点 / 创建新节点) */
  single?: { Name: string; plainToken: string } | null | undefined
  /** 多 token 列表模式(预留:目前未使用,保留以便后端再返回多 token 时复用) */
  list?: NodeTokenPlain[] | null | undefined
  /** 来源标识: 'rotate' | 'create'，影响顶部提示文案 */
  source?: 'rotate' | 'create'
}

const SOURCE_TITLE: Record<NonNullable<RotateTokenModalProps['source']>, string> = {
  rotate: '节点 Token 已重置',
  create: '节点已创建',
}

const SOURCE_HINT: Record<NonNullable<RotateTokenModalProps['source']>, string> = {
  rotate: '请将新的 token 更新到对应 Node 部署配置（环境变量 / k8s Secret）。旧 token 立即失效。',
  create: '请将 token 写入 Node 部署配置（环境变量 NODE_TOKEN）后启动 Node。未配置 token 的新节点无法连接。',
}

export function RotateTokenModal({ open, onClose, single, list, source = 'rotate' }: RotateTokenModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      message.success('已复制到剪贴板')
      // 2s 后清掉「已复制」标记
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000)
    } catch {
      message.error('复制失败，请手动选中复制')
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="ack" type="primary" danger onClick={onClose}>
          我已保存
        </Button>,
      ]}
      width={720}
      destroyOnHidden
      title={
        <Space>
          <ExclamationCircleFilled style={{ color: '#e84545' }} />
          <span>{SOURCE_TITLE[source]}</span>
        </Space>
      }
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message="明文 token 只会显示一次"
        description={
          <div>
            <div style={{ marginBottom: 6 }}>{SOURCE_HINT[source]}</div>
            <div style={{ color: '#e84545', fontWeight: 500 }}>
              丢失后需重新生成，届时对应 Node 会在重连时被拒。
            </div>
          </div>
        }
      />

      {single && (
        <div>
          <div style={{ marginBottom: 8, color: '#4a5670' }}>节点</div>
          <Tag color="blue" style={{ marginBottom: 16, fontSize: 14, padding: '4px 12px' }}>
            {single.Name}
          </Tag>
          <div style={{ marginBottom: 8, color: '#4a5670' }}>Token</div>
          <div
            style={{
              position: 'relative',
              padding: '16px 56px 16px 16px',
              background: '#1a2332',
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
              fontSize: 18,
              color: '#3a8ee6',
              wordBreak: 'break-all',
              lineHeight: 1.6,
              letterSpacing: 0.5,
            }}
          >
            {single.plainToken}
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copy(single.plainToken, 'single')}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#3a8ee6',
              }}
            >
              {copiedKey === 'single' ? '已复制' : '复制'}
            </Button>
          </div>
        </div>
      )}

      {list && list.length > 0 && (
        <div>
          <div style={{ marginBottom: 8, color: '#4a5670' }}>
            共 <b>{list.length}</b> 个节点
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid rgba(58,142,230,0.14)', borderRadius: 8 }}>
            {list.map((item, idx) => (
              <div
                key={item.Name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: idx < list.length - 1 ? '1px solid rgba(58,142,230,0.08)' : 'none',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafbfd',
                }}
              >
                <Tag color="blue" style={{ minWidth: 110, textAlign: 'center', fontSize: 13 }}>
                  {item.Name}
                </Tag>
                <code
                  style={{
                    flex: 1,
                    fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
                    fontSize: 13,
                    color: '#1a2332',
                    background: '#f0f4f9',
                    padding: '4px 8px',
                    borderRadius: 4,
                    wordBreak: 'break-all',
                  }}
                >
                  {item.plainToken}
                </code>
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copy(item.plainToken, item.Name)}
                >
                  {copiedKey === item.Name ? '已复制' : '复制'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default RotateTokenModal
