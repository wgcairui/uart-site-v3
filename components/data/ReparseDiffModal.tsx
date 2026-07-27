'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Collapse,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ExperimentOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { postReparse, getProtocols, type ReparseResponse } from '@/lib/api/fetchRoot'
import { usePromise } from '@/lib/hooks/usePromise'

const { Text } = Typography

/** diff 行展示状态 (变更 / 不变 / 新增 / 删除) */
type DiffStatus = 'changed' | 'unchanged' | 'added' | 'removed'

export interface ReparseDiffModalProps {
  /** client.resultcolltions._id */
  resultId: string
  open: boolean
  onClose: () => void
  /** 该 mount-dev 的协议名 (e.g. "Pesiv卡-PI38") */
  protocol: string
  mac?: string
  pid?: number
  /** 历史行时间标签, 显示在 title */
  timeLabel?: string
}

/** 合并 old + new + diff → 统一 diff 视图 (含 新增/删除 标记) */
interface MergedDiffRow {
  key: string
  name: string
  status: DiffStatus
  oldValue?: string | undefined
  oldParseValue?: string | undefined
  newValue?: string | undefined
  newParseValue?: string | undefined
  /** 协议内 instruct 分组 (server PR #117). 老 PR1 协议缺省 → UI "未分组" fallback. */
  instruct?: string | undefined
}

/** 兜底 instruct 名 (老 PR1 协议 instruct 字段缺省时统一进这个 group) */
const UNGROUPED_INSTRUCT = '未分组'

const STATUS_META: Record<DiffStatus, { color: string; label: string }> = {
  changed: { color: 'red', label: '变更' },
  unchanged: { color: 'green', label: '不变' },
  added: { color: 'blue', label: '新增' },
  removed: { color: 'orange', label: '删除' },
}

const mergeDiff = (data: ReparseResponse): MergedDiffRow[] => {
  const oldMap = new Map<string, { value: string; parseValue: string; instruct?: string }>()
  const newMap = new Map<string, { value: string; parseValue: string; instruct?: string }>()
  data.old.forEach((p) => {
    oldMap.set(p.name, {
      value: p.value,
      parseValue: p.parseValue,
      ...(p.instruct ? { instruct: p.instruct } : {}),
    })
  })
  data.new.forEach((p) => {
    newMap.set(p.name, {
      value: p.value,
      parseValue: p.parseValue,
      ...(p.instruct ? { instruct: p.instruct } : {}),
    })
  })

  const allNames = new Set<string>([...oldMap.keys(), ...newMap.keys()])
  const diffMap = new Map<string, ReparseResponse['diff'][number]>()
  data.diff.forEach((d) => diffMap.set(d.name, d))

  const rows: MergedDiffRow[] = []
  for (const name of allNames) {
    const inOld = oldMap.has(name)
    const inNew = newMap.has(name)
    const d = diffMap.get(name)
    let status: DiffStatus
    if (inOld && !inNew) status = 'removed'
    else if (!inOld && inNew) status = 'added'
    else if (d?.changed) status = 'changed'
    else status = 'unchanged'

    const oldEntry = oldMap.get(name)
    const newEntry = newMap.get(name)
    rows.push({
      key: name,
      name,
      status,
      oldValue: oldEntry?.value ?? d?.oldValue,
      oldParseValue: oldEntry?.parseValue ?? d?.oldParseValue,
      newValue: newEntry?.value ?? d?.newValue,
      newParseValue: newEntry?.parseValue ?? d?.newParseValue,
      // instruct 优先级: old item > new item > diff item > undefined
      //  (同一 name 在三处 instruct 应该一致, 但服务器可能稀疏返回)
      instruct: oldEntry?.instruct ?? newEntry?.instruct ?? d?.instruct,
    })
  }
  // 变更 > 新增 > 删除 > 不变 (前台展示优先级)
  const order: Record<DiffStatus, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 }
  rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
  return rows
}

/** 按 protocol.instruct 顺序分组 (缺省走 "未分组" 兜底, 排在最后) */
interface MergedGroup {
  instruct: string
  rows: MergedDiffRow[]
  stats: { changed: number; added: number; removed: number; unchanged: number }
}

const groupMergedByInstruct = (
  mergedRows: MergedDiffRow[],
  protocolInstruct: string[],
): MergedGroup[] => {
  // group by instruct (缺省 → "未分组")
  const byInstruct = new Map<string, MergedDiffRow[]>()
  for (const r of mergedRows) {
    const key = r.instruct || UNGROUPED_INSTRUCT
    const arr = byInstruct.get(key)
    if (arr) arr.push(r)
    else byInstruct.set(key, [r])
  }
  // 按 protocol.instruct 顺序; 未在 protocol.instruct 里的 instruct (e.g. "未分组" 兜底) 排在最后
  const order = (s: string) => {
    const idx = protocolInstruct.indexOf(s)
    return idx === -1 ? Number.POSITIVE_INFINITY : idx
  }
  const keys = [...byInstruct.keys()].sort((a, b) => order(a) - order(b))
  return keys.map((instruct) => {
    const rows = byInstruct.get(instruct) ?? []
    const stats = {
      changed: rows.filter((r) => r.status === 'changed').length,
      added: rows.filter((r) => r.status === 'added').length,
      removed: rows.filter((r) => r.status === 'removed').length,
      unchanged: rows.filter((r) => r.status === 'unchanged').length,
    }
    return { instruct, rows, stats }
  })
}

export const ReparseDiffModal: React.FC<ReparseDiffModalProps> = ({
  resultId,
  open,
  onClose,
  protocol,
  mac,
  pid,
  timeLabel,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | 'auto'>('auto')
  const [reparseLoading, setReparseLoading] = useState(false)
  const [data, setData] = useState<ReparseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  /** 每组 sub-table 当前页码 (key = instruct 名, 重新解析时清空) */
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // 关闭 / 换 resultId 时清空
  useEffect(() => {
    if (open) {
      setData(null)
      setError(null)
      setSelectedVersion('auto')
      setGroupPages({})
    }
  }, [open, resultId])

  // 拉该 protocol 名下所有版本 (供下拉)
  const { data: versions, loading: versionsLoading } = usePromise<Array<{ label: string; value: number }>>(
    async () => {
      if (!protocol) return []
      const { data } = await getProtocols({
        page: 1,
        pageSize: 100,
        needTotal: false,
        sortBy: 'version',
        sortOrder: 'desc',
        filters: { Protocol: [protocol] },
      } as any)
      const items = (data as any)?.items ?? []
      return items
        .map((p: any) => ({
          label: `v${p.version ?? '?'}${p.updatedAt ? ` · ${dayjs(p.updatedAt).format('YYYY-MM-DD')}` : ''}`,
          value: Number(p.version),
        }))
        .filter((v: { value: number }) => !Number.isNaN(v.value))
    },
    [],
    [protocol, open],
  )

  const versionOptions = useMemo(
    () => [
      { label: '最新 (auto)', value: 'auto' as const },
      ...((versions || []) as Array<{ label: string; value: number }>),
    ],
    [versions],
  )

  const runReparse = async () => {
    setReparseLoading(true)
    setError(null)
    setData(null)
    setGroupPages({})
    try {
      const body: { resultId: string; protocolVersion?: number } = { resultId }
      if (selectedVersion !== 'auto') body.protocolVersion = selectedVersion
      const res = await postReparse(body)
      if (res?.code === 200 || res?.code === 0) {
        if (res.data) {
          setData(res.data)
        } else {
          setError('后端返回 data 为空')
        }
      } else {
        setError(res?.message || `解析失败 (code=${res?.code})`)
      }
    } catch (e: any) {
      setError(e?.message || '网络错误')
    } finally {
      setReparseLoading(false)
    }
  }

  const mergedRows = useMemo(() => (data ? mergeDiff(data) : []), [data])
  const groups = useMemo(
    () => (data ? groupMergedByInstruct(mergedRows, data.protocol.instruct || []) : []),
    [data, mergedRows],
  )
  const changedCount = mergedRows.filter((r) => r.status === 'changed').length
  const addedCount = mergedRows.filter((r) => r.status === 'added').length
  const removedCount = mergedRows.filter((r) => r.status === 'removed').length
  const unchangedCount = mergedRows.filter((r) => r.status === 'unchanged').length

  return (
    <Modal
      title={
        <Space size="small" wrap>
          <ExperimentOutlined style={{ color: 'var(--brand-500, #8b5cf6)' }} />
          <span>重新解析</span>
          {(mac || timeLabel) && (
            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              {mac ? mac : ''}
              {mac && pid ? ` / pid=${pid}` : ''}
              {timeLabel ? ` · ${timeLabel}` : ''}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={isMobile ? '95vw' : 960}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      {/* 顶部操作区 */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size="middle" align="center">
        <Text style={{ fontSize: 12, color: 'var(--ink-500)' }}>协议版本:</Text>
        <Select
          value={selectedVersion}
          onChange={setSelectedVersion}
          options={versionOptions as any}
          style={{ minWidth: isMobile ? 140 : 200 }}
          loading={versionsLoading}
          placeholder="加载版本…"
        />
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={runReparse}
          loading={reparseLoading}
        >
          重新解析
        </Button>
        {data?.protocol && (
          <Text style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            当前: <Text code>{data.protocol.name}</Text>{' '}
            <Tag color="blue" style={{ marginLeft: 4 }}>v{data.protocol.version}</Tag>
            <Tag>{data.protocol.type}</Tag>
            {data.protocol.instruct?.length > 0 && (
              <Text type="secondary"> · {data.protocol.instruct.length} instruct</Text>
            )}
          </Text>
        )}
      </Space>

      {/* 错误区 */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#be123c',
            fontSize: 13,
          }}
        >
          ❌ 解析失败: {error}
        </div>
      )}

      {/* 加载骨架 */}
      {reparseLoading && !data ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : data ? (
        <>
          {/* 顶部汇总 */}
          <Space size="small" wrap style={{ marginBottom: 12, fontSize: 12 }}>
            <Text type="secondary">新协议解析项数:</Text>
            <Text strong>{data.new.length}</Text>
            <Text type="secondary">· 旧解析项数:</Text>
            <Text strong>{data.old.length}</Text>
            <Text type="secondary">· 差异:</Text>
            <Tag color="red">{changedCount} 变更</Tag>
            <Tag color="blue">{addedCount} 新增</Tag>
            <Tag color="orange">{removedCount} 删除</Tag>
            <Tag color="green">{unchangedCount} 不变</Tag>
          </Space>

          {data.notes && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: 12,
                borderRadius: 6,
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: 'var(--ink-700, #334155)',
                fontSize: 12,
              }}
            >
              ℹ️ {data.notes}
            </div>
          )}

          {/* 原始数据 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12 }}>原始数据 (raw bytes UTF-8)</Text>
            <pre
              style={{
                margin: '6px 0 0 0',
                padding: 10,
                background: 'rgba(15, 23, 42, 0.04)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                maxHeight: 140,
                overflow: 'auto',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                color: 'var(--ink-700, #334155)',
              }}
            >
              {data.raw || '(空)'}
            </pre>
          </div>

          {/* 差异明细 (按 protocol.instruct 分组, 每组 sub-Table + 50/page) */}
          <div>
            <Text strong style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>
              差异明细 · {groups.length} 个 instruct 分组
            </Text>
            {groups.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>无差异项</Text>
            ) : (
              <Collapse
                defaultActiveKey={groups.map((g) => g.instruct)}
                ghost
                size="small"
                items={groups.map((group) => {
                  const PAGE_SIZE = 50
                  const total = group.rows.length
                  const currentPage = groupPages[group.instruct] ?? 1
                  const startIdx = (currentPage - 1) * PAGE_SIZE
                  const pageRows = group.rows.slice(startIdx, startIdx + PAGE_SIZE)
                  const setPage = (page: number) =>
                    setGroupPages((prev) => ({ ...prev, [group.instruct]: page }))
                  return {
                    key: group.instruct,
                    label: (
                      <Space size="small" wrap style={{ fontSize: 12 }}>
                        <Text strong style={{ minWidth: 80 }}>{group.instruct}</Text>
                        <Text type="secondary">({total} 项)</Text>
                        <Text type="secondary">·</Text>
                        <Tag color="red" style={{ marginInlineEnd: 0 }}>
                          {group.stats.changed} 变更
                        </Tag>
                        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                          {group.stats.added} 新增
                        </Tag>
                        <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                          {group.stats.removed} 删除
                        </Tag>
                        <Tag color="green" style={{ marginInlineEnd: 0 }}>
                          {group.stats.unchanged} 不变
                        </Tag>
                      </Space>
                    ),
                    children: (
                      <Table<MergedDiffRow>
                        size="small"
                        rowKey="key"
                        dataSource={pageRows}
                        pagination={{
                          current: currentPage,
                          pageSize: PAGE_SIZE,
                          total,
                          hideOnSinglePage: true,
                          size: 'small',
                          showSizeChanger: false,
                          onChange: setPage,
                        }}
                        {...(isMobile ? { scroll: { x: 600 } } : {})}
                        columns={[
                          {
                            dataIndex: 'name',
                            title: '参数',
                            width: 160,
                            ...(isMobile ? {} : { fixed: 'left' as const }),
                            render: (v: string, r) => (
                              <Space size={4}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span>
                                <Tag
                                  color={STATUS_META[r.status].color}
                                  style={{ marginInlineEnd: 0 }}
                                >
                                  {STATUS_META[r.status].label}
                                </Tag>
                              </Space>
                            ),
                          },
                          {
                            dataIndex: 'oldValue',
                            title: '旧值',
                            width: 120,
                            render: (v?: string) =>
                              v === undefined ? (
                                <Text type="secondary">—</Text>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                              ),
                          },
                          {
                            dataIndex: 'oldParseValue',
                            title: '旧解析',
                            width: 120,
                            render: (v?: string) =>
                              v === undefined ? (
                                <Text type="secondary">—</Text>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                              ),
                          },
                          {
                            dataIndex: 'newValue',
                            title: '新值',
                            width: 120,
                            render: (v?: string) =>
                              v === undefined ? (
                                <Text type="secondary">—</Text>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                              ),
                          },
                          {
                            dataIndex: 'newParseValue',
                            title: '新解析',
                            width: 120,
                            render: (v?: string) =>
                              v === undefined ? (
                                <Text type="secondary">—</Text>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                              ),
                          },
                        ]}
                      />
                    ),
                  }
                })}
              />
            )}
          </div>
        </>
      ) : (
        // 初始空状态
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--ink-500, #64748b)',
            fontSize: 13,
          }}
        >
          选择协议版本后, 点击「重新解析」按钮, 用最新协议重跑该历史 result 的 raw bytes,
          <br />
          并对比写入时 (旧) 与当前 (新) 解析结果的差异.
        </div>
      )}
    </Modal>
  )
}
