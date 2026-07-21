'use client'
/**
 * admin 特性开关 (Feature Flags) 页 - v3 通用化 (2026-07-21)
 *
 * == 设计原则 ==
 * 这是**通用 Feature Flag 平台**, 不是告警专用页.
 * 之前 v2 把 2 个告警 FF 做成专属卡片 (AlertModeCard / KillSwitchCard / RecipientsCard)
 * 显得太 alert-specific. v3 改为:
 *
 * == 视觉层级 ==
 * 1. PageHeader: 特性开关 (Feature Flags) + 「使用说明」+ 「刷新」+ 「新建开关」
 * 2. 4 统计卡: 概览 (总开关数 / 启用中 / 熔断开启 / 24h 修改)
 * 3. 卡片网格: 每个启用的 FF 一张卡, 值控件按 type 自适应
 *    - boolean → Switch (alert.dispatch.kill_switch 走确认弹窗)
 *    - alert.dispatch.mode → rich Radio (auto/manual/delayed_auto)
 *    - string → Input
 *    - number → InputNumber
 * 4. 全部开关一览: 紧凑表格, 全部 FFs (含已软删)
 * 5. 创建/编辑 Modal: 3 tab (基本/高级/通知)
 * 6. 使用说明 Modal: 概念 / 预置 vs 自定义 / 字段 / 注意事项
 *
 * == 项目约定 ==
 * - 'use client' 必加
 * - Modal.confirm 不用 Popconfirm
 * - usePromise.fecth 跟着项目 typo 走
 * - 只改 UI 不改 API / DTO
 */

import {
  Button, Empty, Modal, Space, Switch, Table, Tag, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  PlusOutlined, ReloadOutlined, CopyOutlined, EditOutlined, DeleteOutlined,
  BookOutlined,
} from '@ant-design/icons'
import React, { useEffect, useMemo, useState, useCallback } from 'react'

import {
  listFeatureFlags, deleteFeatureFlag, duplicateFeatureFlag, setFeatureFlagKillSwitch,
} from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { BentoCard } from '@/components/common/BentoCard'

import { FFCard } from './FFCard'
import { FFEditModal } from './FFEditModal'
import { FFUsageGuideModal } from './FFUsageGuideModal'

// server MAX_PAGE_SIZE = 200
const MAX_ITEMS = 200

export const AdminFeatureFlags: React.FC = () => {
  const [fetchKey, setFetchKey] = useState(0)
  const [items, setItems] = useState<Uart.UartFeatureFlag[]>([])
  const [loading, setLoading] = useState(false)

  // 编辑 Modal
  const [editing, setEditing] = useState<{ open: boolean; record: Uart.UartFeatureFlag | null }>({
    open: false, record: null,
  })

  // 使用说明 Modal
  const [guideOpen, setGuideOpen] = useState(false)

  // ─── 数据 ──────────────────────────────────────────────
  const [now, setNow] = useState<number>(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNow(Date.now())
    listFeatureFlags({ page: 1, pageSize: MAX_ITEMS, needTotal: true })
      .then((res) => {
        if (cancelled) return
        const d: any = res.data
        const list = Array.isArray(d) ? d : d?.items ?? []
        setItems(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('listFeatureFlags failed', err)
        setItems([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchKey])

  const triggerFetch = useCallback(() => setFetchKey(k => k + 1), [])

  // ─── 启用的 FFs (卡片展示) ──────────────────────────────
  // 按 key 排序, 保证顺序稳定
  const enabledItems = useMemo(
    () => items
      .filter(i => i.enabled)
      .sort((a, b) => a.key.localeCompare(b.key)),
    [items],
  )

  // ─── 统计 ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: items.length,
    enabled: items.filter(i => i.enabled).length,
    killOn: items.filter(i => i.killSwitch).length,
    last24h: now > 0 ? items.filter(i => i.updatedAt > now - 24 * 3600 * 1000).length : 0,
  }), [items, now])

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
        <PageHeader
          title="特性开关"
          subtitle="远程管理 Feature Flag · 通用平台, 支持任意业务场景"
          breadcrumb={[{ title: '系统管理' }]}
          extra={
            <Space>
              <Button icon={<BookOutlined />} onClick={() => setGuideOpen(true)}>
                使用说明
              </Button>
              <Button icon={<ReloadOutlined />} onClick={triggerFetch}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ open: true, record: null })}>
                新建开关
              </Button>
            </Space>
          }
        />

        <PageSummary
          items={[
            { label: '总开关数', value: stats.total, variant: 'primary' },
            { label: '启用中', value: stats.enabled, variant: 'success' },
            { label: '熔断开启', value: stats.killOn, variant: stats.killOn > 0 ? 'danger' : 'info' },
            { label: '24h 修改', value: stats.last24h, variant: 'warning' },
          ]}
        />

        {/* ═══ 启用的 FFs 卡片网格 ═══ */}
        <BentoCard padding="lg" variant="default" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>已启用的开关</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              点选值控件即时保存 · 共 {enabledItems.length} 项
            </div>
          </div>

          {enabledItems.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {enabledItems.map(ff => (
                <div
                  key={ff.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <FFCard
                    ff={ff}
                    onSaved={triggerFetch}
                    onEdit={() => setEditing({ open: true, record: ff })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无可用开关 · 点击右上「新建开关」开始"
              style={{ padding: '40px 0' }}
            />
          )}
        </BentoCard>

        {/* ═══ 全部开关一览 ═══ */}
        <BentoCard padding="lg" variant="default">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>全部开关一览</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              包含预置策略和自定义开关 · 共 {items.length} 项
            </div>
          </div>

          <Table<Uart.UartFeatureFlag>
            rowKey="id"
            columns={makeColumns({ onEdit: (r) => setEditing({ open: true, record: r }), onRefresh: triggerFetch })}
            dataSource={items}
            loading={loading}
            size="middle"
            pagination={items.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
            scroll={{ x: 960 }}
          />
        </BentoCard>
      </div>

      {/* 创建/编辑 Modal */}
      <FFEditModal
        open={editing.open}
        record={editing.record}
        onClose={() => setEditing({ open: false, record: null })}
        onSaved={() => {
          setEditing({ open: false, record: null })
          triggerFetch()
        }}
      />

      {/* 使用说明 Modal */}
      <FFUsageGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </main>
  )
}

export default AdminFeatureFlags

// ═══════════════════════════════════════════════════════════════
//  全部开关表格列定义
// ═══════════════════════════════════════════════════════════════

const SwitchCell: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <Switch size="small" checked={value} onChange={onToggle} />
)

function makeColumns(opts: { onEdit: (r: Uart.UartFeatureFlag) => void; onRefresh: () => void }): ColumnsType<Uart.UartFeatureFlag> {
  const { onEdit, onRefresh } = opts

  const handleKillSwitch = (record: Uart.UartFeatureFlag) => {
    const next = !record.killSwitch
    Modal.confirm({
      title: next ? '开启 kill switch' : '关闭 kill switch',
      content: (
        <div>
          <div>将 {next ? '开启' : '关闭'} <b>{record.key}</b> 的 kill switch</div>
          {next && <div style={{ color: '#e84545', marginTop: 8 }}>⚠️ 所有依赖此 FF 的代码路径会进入拦截态</div>}
        </div>
      ),
      okText: next ? '确定开启' : '确定关闭',
      okButtonProps: next ? { danger: true } : {},
      onOk() {
        return setFeatureFlagKillSwitch(record.id, next, next ? 'admin 手动开启' : 'admin 手动关闭')
          .then((res) => {
            if (res.code) onRefresh()
            else throw new Error((res.data as any)?.error || '切换失败')
          })
      },
    })
  }

  const handleDelete = (record: Uart.UartFeatureFlag) => {
    Modal.confirm({
      title: '软删开关',
      content: (
        <div>
          <div>将 <b>{record.key}</b> 标记为 disabled</div>
          <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>软删后 evaluator 返回 defaultValue=undefined</div>
        </div>
      ),
      okText: '确定软删',
      okButtonProps: { danger: true },
      onOk() {
        return deleteFeatureFlag(record.id)
          .then((res) => { if (res.code) onRefresh() })
      },
    })
  }

  const handleDuplicate = (id: string) => {
    duplicateFeatureFlag(id)
      .then((res) => {
        if (res.code) {
          Modal.success({ content: `已复制为: ${(res.data as any)?.key}` })
          onRefresh()
        } else {
          Modal.error({ content: (res.data as any)?.error || res.message || '复制失败' })
        }
      })
      .catch((err: any) => Modal.error({ content: err?.message || '复制失败' }))
  }

  return [
    {
      title: 'key',
      dataIndex: 'key',
      width: 220,
      render: (v: string, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <code style={{ fontSize: 12, color: '#1e293b' }}>{v}</code>
          {r.description && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.description}</span>}
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'type', width: 64, render: (v: string) => <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag> },
    {
      title: '默认值', dataIndex: 'defaultValue', width: 130, ellipsis: true,
      render: (v: any) => <code style={{ fontSize: 12 }}>{typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}</code>,
    },
    { title: '启用', dataIndex: 'enabled', width: 56, render: (v: boolean) => v ? <Tag color="success">ON</Tag> : <Tag>OFF</Tag> },
    {
      title: '熔断', dataIndex: 'killSwitch', width: 56,
      render: (v: boolean, r) => <SwitchCell value={v} onToggle={() => handleKillSwitch(r)} />,
    },
    {
      title: '设备覆盖', dataIndex: 'perDeviceOverrides', width: 80,
      render: (v: Record<string, any>) => {
        const n = Object.keys(v || {}).length
        return n > 0 ? <Tag color="orange" style={{ fontSize: 11 }}>{n} 台</Tag> : <span style={{ color: '#cbd5e1' }}>—</span>
      },
    },
    {
      title: '更新时间', dataIndex: 'updatedAt', width: 140,
      sorter: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{dayjs(v).format('MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '操作', width: 170, fixed: 'right',
      render: (_: any, r) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)}>复制</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>软删</Button>
        </Space>
      ),
    },
  ]
}
