'use client'

/**
 * VersionDiffModal — 协议两个 version 的 instruct 字段级 diff
 *
 * 用法: 历史 tab选 v1 + v2 后点 "比较"
 * ```tsx
 * <VersionDiffModal
 *   open={open}
 *   Protocol={Protocol}
 *   v1={v1} v2={v2}
 *   diff={diffData}
 *   onClose={...}
 * />
 * ```
 *
 * 数据源: BE PR #118 `/api/v2/admin/protocols/diff?Protocol=xxx&v1=3&v2=4`
 * - `added: [{name, value}]` — v2 有 v1 没有
 * - `removed: [{name, value}]` — v1 有 v2 没有
 * - `changed: [{name, oldValue, newValue}]` — 都存在但内容不同
 * - `unchangedCount: number` — 内容相同的 instruct 数 (BE 不返回 name 列表)
 *
 * 设计:
 * - 4 列 Table (参数 | 旧值 | 新值 | 状态)
 * - changed/added/removed 都用 JSON.stringify pretty-print (字段级 diff)
 * - unchanged 列表 BE 不返回 → 只在顶部汇总条展示 count badge
 * - 跟 ReparseDiffModal 视觉一致 (紫粉渐变 title, 状态 Tag 红/蓝/橙)
 *
 * 跟 ReparseDiffModal 区别:
 * - ReparseDiffModal 比的是 result 解析 (param.value/parseValue), 这个比的是 protocol.instruct (整对象)
 * - ReparseDiffModal 按 instruct 分组 + 50/page 分页 + collapse, 这个扁平 (协议级别 diff 通常字段少, 不分组)
 * - ReparseDiffModal 有 raw bytes 原始数据区, 这个没有 (协议版本 raw 不适用)
 *
 * v1 (2026-07-27 ship): 配 server PR #118 (protocol history diff).
 */

import { Modal, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import { ExperimentOutlined } from '@ant-design/icons'
import type { ProtocolVersionDiff } from '@/lib/api/endpoints/admin/protocols'

const { Text } = Typography

export interface VersionDiffModalProps {
  open: boolean
  /** 协议名 (e.g. "Pesiv卡-PI38") */
  Protocol: string
  v1: number
  v2: number
  /** BE diff() response.data */
  diff: ProtocolVersionDiff | null
  onClose: () => void
}

type DiffRowStatus = 'changed' | 'added' | 'removed'

interface MergedDiffRow {
  key: string
  name: string
  status: DiffRowStatus
  oldValue: any
  newValue: any
}

const STATUS_META: Record<DiffRowStatus, { color: string; label: string }> = {
  changed: { color: 'red', label: '变更' },
  added: { color: 'blue', label: '新增' },
  removed: { color: 'orange', label: '删除' },
}

const order: Record<DiffRowStatus, number> = { changed: 0, added: 1, removed: 2 }

/** 合并 added/removed/changed → 统一 diff 视图 (顺序: 变更 > 新增 > 删除) */
const buildRows = (diff: ProtocolVersionDiff): MergedDiffRow[] => {
  const rows: MergedDiffRow[] = []
  for (const it of diff.changed) {
    rows.push({ key: `c:${it.name}`, name: it.name, status: 'changed', oldValue: it.oldValue, newValue: it.newValue })
  }
  for (const it of diff.added) {
    rows.push({ key: `a:${it.name}`, name: it.name, status: 'added', oldValue: undefined, newValue: it.value })
  }
  for (const it of diff.removed) {
    rows.push({ key: `r:${it.name}`, name: it.name, status: 'removed', oldValue: it.value, newValue: undefined })
  }
  rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
  return rows
}

/** JSON.stringify pretty-print, 包 <pre> 灰底等宽字体 */
const ValueCell: React.FC<{ v: any }> = ({ v }) => {
  if (v === undefined) return <Text type="secondary">—</Text>
  let display: string
  try {
    display = JSON.stringify(v, null, 2)
  } catch {
    display = String(v)
  }
  return (
    <pre
      style={{
        margin: 0,
        padding: 8,
        background: 'rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        lineHeight: 1.4,
        maxHeight: 200,
        overflow: 'auto',
        color: 'var(--ink-700, #334155)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {display}
    </pre>
  )
}

export function VersionDiffModal({ open, Protocol, v1, v2, diff, onClose }: VersionDiffModalProps) {
  const rows = diff ? buildRows(diff) : []
  const changedCount = diff?.changed.length ?? 0
  const addedCount = diff?.added.length ?? 0
  const removedCount = diff?.removed.length ?? 0
  const unchangedCount = diff?.unchangedCount ?? 0
  const total = changedCount + addedCount + removedCount + unchangedCount

  return (
    <Modal
      title={
        <Space size="small" wrap>
          <ExperimentOutlined style={{ color: 'var(--brand-500, #8b5cf6)' }} />
          <span>版本对比</span>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {Protocol} · v{v1} → v{v2}
          </Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      destroyOnHidden
      footer={null}
    >
      {!diff ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500, #64748b)', fontSize: 13 }}>
          加载中…
        </div>
      ) : (
        <>
          {/* 顶部汇总 */}
          <Space size="small" wrap style={{ marginBottom: 12, fontSize: 12 }}>
            <Text type="secondary">总计:</Text>
            <Text strong>{total}</Text>
            <Text type="secondary">条 instruct ·</Text>
            <Tag color="red">{changedCount} 变更</Tag>
            <Tag color="blue">{addedCount} 新增</Tag>
            <Tag color="orange">{removedCount} 删除</Tag>
            <Tag>{unchangedCount} 不变</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              (BE 不返回 unchanged name 列表, 仅 count)
            </Text>
          </Space>

          {rows.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--ink-500, #64748b)',
                fontSize: 13,
              }}
            >
              两个 version 完全一致 (无差异)
            </div>
          ) : (
            <Table<MergedDiffRow>
              size="small"
              rowKey="key"
              dataSource={rows}
              pagination={false}
              scroll={{ x: 700 }}
              columns={
                [
                  {
                    dataIndex: 'name',
                    title: '参数',
                    width: 160,
                    fixed: 'left',
                    render: (v: string, r) => (
                      <Space size={4}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span>
                        <Tag color={STATUS_META[r.status].color} style={{ marginInlineEnd: 0 }}>
                          {STATUS_META[r.status].label}
                        </Tag>
                      </Space>
                    ),
                  },
                  {
                    key: 'old',
                    title: '旧值 (v' + v1 + ')',
                    render: (_: unknown, r) => <ValueCell v={r.oldValue} />,
                  },
                  {
                    key: 'new',
                    title: '新值 (v' + v2 + ')',
                    render: (_: unknown, r) => <ValueCell v={r.newValue} />,
                  },
                ] as ColumnsType<MergedDiffRow>
              }
            />
          )}
        </>
      )}
    </Modal>
  )
}

export default VersionDiffModal
