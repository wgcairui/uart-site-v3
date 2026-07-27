'use client'

/**
 * ProtocolVersionHistory — admin 协议详情页 "版本历史" tab 内容
 *
 * 配套 server PR #118 (feat/protocol-history-snapshot, 2026-07-27 ship):
 * - `protocols.history` collection 永久保存每个 version 的完整 instruct 快照
 * - admin 用本 tab 查看 AI 改写历史 / 字段级 diff / 一键回滚
 *
 * 布局 (4 段):
 * 1. 顶部工具栏: 标题 + 计数 + 刷新按钮
 * 2. 选中状态条: 已选 v1 / v2 pill + [比较] 按钮
 * 3. Table: version | source | createdAt | createdBy | instructCount | 操作
 * 4. 3 个 modal: ViewInstructModal (当前 version) + VersionDiffModal (任意 2 version) + 回滚确认
 *
 * 操作矩阵:
 * - 当前 version (isCurrent=true):
 *   - [查看] → ViewInstructModal (用 currentInstruct prop, 已有数据)
 *   - [作为 v1] [作为 v2] → 选中状态
 *   - ❌ 不显示 [回滚] (已经是当前)
 * - 历史 version (isCurrent=false):
 *   - [作为 v1] [作为 v2] → 选中状态
 *   - [回滚] → 二次确认 → POST /rollback → 刷新列表
 *   - ❌ 不显示 [查看] (BE history API 不返回历史 instruct[], 待 BE 补 /instruct?version=N)
 *
 * 限制 (2026-07-27):
 * - BE PR #118 history 端点只返回 instructCount + 元数据, 没有 instruct[] 完整数据
 *   → 历史 version "查看完整 instruct" 暂不支持, UI 隐藏该按钮
 *   → 后续 BE 补 /instruct?version=N 端点时, ViewInstructModal 复用 currentInstruct prop
 *
 * v1 (2026-07-27 ship): 配 server PR #118.
 */

import { useCallback, useEffect, useState } from 'react'
import { Button, message, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import {
  CheckOutlined,
  ReloadOutlined,
  RollbackOutlined,
  EyeOutlined,
  SwapOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { getProtocolHistory, rollbackProtocol, diffProtocol, type ProtocolHistoryItem, type ProtocolVersionDiff } from '@/lib/api/endpoints/admin/protocols'
import { usePromise } from '@/lib/hooks/usePromise'
import { Button as AppButton } from '@/components/common/Button'
import { confirm } from '@/lib/utils/modal'
import { EmptyState } from '@/components/common/EmptyState'

import { ViewInstructModal } from './ViewInstructModal'
import { VersionDiffModal } from './VersionDiffModal'

const { Text } = Typography

export interface ProtocolVersionHistoryProps {
  /** 协议名 (e.g. "Pesiv卡-PI38") */
  protocolName: string
  /** 当前 version 的完整 instruct (page.tsx 已加载, ViewInstructModal 直接复用) */
  currentInstruct: Uart.protocolInstruct[] | undefined
  /** 当前 version 数字 (page.tsx 已加载, ViewInstructModal 复用) */
  currentVersion: number | undefined
  /** 当前 version 的 source (admin / ai-generate / ai-chat) */
  currentSource: string | undefined
}

/** 源标签颜色: admin=蓝, ai-generate=紫, ai-chat=青, 其他=灰 */
const SOURCE_META: Record<string, { color: string; label: string }> = {
  admin: { color: 'blue', label: 'admin' },
  'ai-generate': { color: 'purple', label: 'ai-generate' },
  'ai-chat': { color: 'cyan', label: 'ai-chat' },
}
const sourceMeta = (s: string) => SOURCE_META[s] ?? { color: 'default', label: s }

export function ProtocolVersionHistory({
  protocolName,
  currentInstruct,
  currentVersion,
  currentSource,
}: ProtocolVersionHistoryProps) {
  const [v1, setV1] = useState<number | null>(null)
  const [v2, setV2] = useState<number | null>(null)

  const [viewOpen, setViewOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffData, setDiffData] = useState<ProtocolVersionDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [rollbackLoading, setRollbackLoading] = useState(false)

  const {
    data: history,
    loading,
    fecth: refetch,
  } = usePromise<ProtocolHistoryItem[]>(
    async () => {
      const { data } = await getProtocolHistory(protocolName)
      return data.items || []
    },
    [],
    [protocolName],
  )

  // 切换 protocol 时清空选择
  useEffect(() => {
    setV1(null)
    setV2(null)
  }, [protocolName])

  const items = history || []
  const currentItem = items.find((it) => it.isCurrent) || null

  // ─── 操作处理 ────────────────────────────────────────────────────────────

  const handleSetV1 = (ver: number) => {
    if (v1 === ver) {
      setV1(null) // 再次点击取消选择
    } else {
      setV1(ver)
      // 强制 v1 != v2: 选了 v1 之后如果 v2 跟 v1 相同, 清掉 v2
      if (v2 === ver) setV2(null)
    }
  }

  const handleSetV2 = (ver: number) => {
    if (v2 === ver) {
      setV2(null)
    } else {
      setV2(ver)
      if (v1 === ver) setV1(null)
    }
  }

  const handleOpenCompare = async () => {
    if (v1 == null || v2 == null) return
    if (v1 === v2) {
      message.warning('v1 和 v2 不能相同')
      return
    }
    setDiffOpen(true)
    setDiffData(null)
    setDiffLoading(true)
    try {
      const { data } = await diffProtocol(protocolName, v1, v2)
      setDiffData(data)
    } catch (e: any) {
      message.error(e?.message || '加载 diff 失败')
      setDiffOpen(false)
    } finally {
      setDiffLoading(false)
    }
  }

  const handleViewCurrent = useCallback(() => {
    if (!currentItem) {
      message.warning('当前 protocol 还没加载完, 请稍后重试')
      return
    }
    setViewOpen(true)
  }, [currentItem])

  const handleRollback = useCallback(
    (ver: number) => {
      const newVer = (currentVersion ?? 0) + 1
      confirm({
        title: `回滚到 v${ver}?`,
        content: (
          <div style={{ fontSize: 13 }}>
            <p style={{ margin: '8px 0' }}>
              将创建新 <Text code>v{newVer}</Text>, 复制 v{ver} 完整 instruct。
            </p>
            <p style={{ margin: '8px 0' }}>
              现有 <Text code>v{currentVersion ?? '?'}</Text> 会被自动标为历史快照 (可再次回滚)。
            </p>
            <p style={{ margin: '8px 0', color: 'var(--ink-500, #64748b)', fontSize: 12 }}>
              协议 <Text code>{protocolName}</Text>
            </p>
          </div>
        ),
        okText: '确认回滚',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          setRollbackLoading(true)
          try {
            const res = await rollbackProtocol(protocolName, ver)
            if (res?.code === 200 || res?.code === 0) {
              message.success(
                `回滚成功, 新 v${res.data.newVersion} 已创建 (复制自 v${res.data.restoredFrom})`,
              )
              refetch()
              setV1(null)
              setV2(null)
            } else {
              message.error(res?.message || '回滚失败')
            }
          } catch (e: any) {
            message.error(e?.message || '回滚失败')
          } finally {
            setRollbackLoading(false)
          }
        },
      })
    },
    [currentVersion, protocolName, refetch],
  )

  // ─── Table 列定义 ────────────────────────────────────────────────────────

  const columns: ColumnsType<ProtocolHistoryItem> = [
    {
      key: 'version',
      title: '版本',
      width: 110,
      render: (_: unknown, r) => {
        if (r.isCurrent) {
          return (
            <Space size={4}>
              <CheckOutlined style={{ color: 'var(--color-success, #10b981)' }} />
              <Text strong style={{ fontFamily: 'var(--font-mono)' }}>
                v{r.version}
              </Text>
              <Tag color="green" style={{ marginInlineEnd: 0 }}>
                当前
              </Tag>
            </Space>
          )
        }
        return (
          <Text style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-700, #334155)' }}>
            v{r.version}
          </Text>
        )
      },
    },
    {
      key: 'source',
      title: '来源',
      width: 130,
      render: (_: unknown, r) => {
        const meta = sourceMeta(r.source)
        return (
          <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
            {meta.label}
          </Tag>
        )
      },
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 160,
      render: (_: unknown, r) =>
        r.createdAt ? (
          <Text style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      key: 'createdBy',
      title: '创建人',
      width: 120,
      render: (_: unknown, r) => (
        <Text style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {r.createdBy || '—'}
        </Text>
      ),
    },
    {
      key: 'instructCount',
      title: 'instruct 数',
      width: 100,
      align: 'right',
      render: (_: unknown, r) => (
        <Text type="secondary" style={{ fontFamily: 'var(--font-mono)' }}>
          {r.instructCount}
        </Text>
      ),
    },
    {
      key: 'replacedBy',
      title: '被替换',
      width: 160,
      render: (_: unknown, r) => {
        if (r.isCurrent) return <Text type="secondary">—</Text>
        if (!r.replacedAt) return <Text type="secondary">—</Text>
        return (
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {dayjs(r.replacedAt).format('YYYY-MM-DD HH:mm')}
            {r.replacedBy ? ` · ${r.replacedBy}` : ''}
          </Text>
        )
      },
    },
    {
      key: 'op',
      title: '操作',
      width: 360,
      render: (_: unknown, r) => {
        const isV1 = v1 === r.version
        const isV2 = v2 === r.version
        return (
          <Space size={4} wrap>
            {/* 作为 v1 / v2 选择 */}
            <AppButton
              variant={isV1 ? 'primary' : 'default'}
              size="small"
              onClick={() => handleSetV1(r.version)}
              icon={isV1 ? <CheckOutlined /> : undefined}
            >
              作为 v1
            </AppButton>
            <AppButton
              variant={isV2 ? 'primary' : 'default'}
              size="small"
              onClick={() => handleSetV2(r.version)}
              icon={isV2 ? <CheckOutlined /> : undefined}
            >
              作为 v2
            </AppButton>
            {/* 当前 version 才有 "查看" 按钮 (历史 instruct 详情 BE 未提供) */}
            {r.isCurrent && (
              <AppButton
                variant="default"
                size="small"
                onClick={handleViewCurrent}
                icon={<EyeOutlined />}
              >
                查看
              </AppButton>
            )}
            {/* 历史 version 显示 "回滚" */}
            {!r.isCurrent && (
              <AppButton
                variant="danger"
                size="small"
                onClick={() => handleRollback(r.version)}
                icon={<RollbackOutlined />}
                loading={rollbackLoading}
              >
                回滚
              </AppButton>
            )}
          </Space>
        )
      },
    },
  ]

  // ─── 渲染 ────────────────────────────────────────────────────────────────

  if (loading && items.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Text type="secondary">加载历史快照…</Text>
      </div>
    )
  }

  return (
    <div>
      {/* 顶部工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size="middle" wrap>
          <Text strong style={{ fontSize: 14 }}>
            版本历史 <Text type="secondary">({items.length})</Text>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            协议 <Text code>{protocolName}</Text>
            {currentVersion != null ? ` · 当前 v${currentVersion}` : ''}
          </Text>
        </Space>
        <AppButton variant="default" size="small" icon={<ReloadOutlined />} onClick={refetch}>
          刷新
        </AppButton>
      </div>

      {/* 选中状态条 */}
      <div
        style={{
          padding: '10px 12px',
          marginBottom: 12,
          background: 'rgba(139, 92, 246, 0.04)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <SwapOutlined style={{ color: 'var(--brand-500, #8b5cf6)' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          已选:
        </Text>
        {v1 == null ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <i>v1 未选</i>
          </Text>
        ) : (
          <Tag
            color="purple"
            closable
            onClose={() => setV1(null)}
            closeIcon={<CloseCircleOutlined />}
            style={{ marginInlineEnd: 0, fontFamily: 'var(--font-mono)' }}
          >
            v1=v{v1}
          </Tag>
        )}
        {v2 == null ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <i>v2 未选</i>
          </Text>
        ) : (
          <Tag
            color="cyan"
            closable
            onClose={() => setV2(null)}
            closeIcon={<CloseCircleOutlined />}
            style={{ marginInlineEnd: 0, fontFamily: 'var(--font-mono)' }}
          >
            v2=v{v2}
          </Tag>
        )}
        <div style={{ flex: 1 }} />
        <AppButton
          variant="primary"
          size="small"
          disabled={v1 == null || v2 == null || v1 === v2}
          onClick={handleOpenCompare}
          icon={<SwapOutlined />}
        >
          比较 {v1 != null ? `v${v1}` : ''} → {v2 != null ? `v${v2}` : ''}
        </AppButton>
      </div>

      {/* 历史 Table */}
      {items.length === 0 ? (
        <EmptyState
          minHeight={240}
          description={
            <>
              协议 <Text code>{protocolName}</Text> 还没有任何历史快照。
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                首次创建或下一次 setProtocol 写入时会自动生成 v1 快照。
              </Text>
            </>
          }
        />
      ) : (
        <Table<ProtocolHistoryItem>
          dataSource={items.map((it) => ({ ...it, _rowKey: `v${it.version}` })) as any}
          rowKey="_rowKey"
          pagination={false}
          size="small"
          rowClassName={(r) => (r.isCurrent ? 'version-history-current-row' : '')}
          columns={columns}
        />
      )}

      {/* ViewInstructModal — 仅当前 version 复用 protocolMeta.instruct */}
      {currentItem && (
        <ViewInstructModal
          open={viewOpen}
          version={currentItem.version}
          instruct={currentInstruct || []}
          source={currentItem.source}
          createdBy={currentItem.createdBy}
          createdAt={
            currentItem.createdAt ? dayjs(currentItem.createdAt).format('YYYY-MM-DD HH:mm') : undefined
          }
          onClose={() => setViewOpen(false)}
        />
      )}

      {/* VersionDiffModal */}
      <VersionDiffModal
        open={diffOpen}
        Protocol={protocolName}
        v1={v1 ?? 0}
        v2={v2 ?? 0}
        diff={diffLoading ? null : diffData}
        onClose={() => setDiffOpen(false)}
      />
    </div>
  )
}

export default ProtocolVersionHistory
