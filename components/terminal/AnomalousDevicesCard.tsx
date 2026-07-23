'use client'

/**
 * AnomalousDevicesCard · admin 终端页"问题设备"卡片 (2026-07-23 ship)
 *
 * == 作用 ==
 * 顶部 admin "/admin/node/terminal" PageSummary 下方, Tabs 上方, 给 admin 一眼看到
 * 当前"有心跳但上报数据异常"的设备 (pesiv/pesiv-1 节点限定), 4 类根因启发式
 * (A 物理层 / B 间歇 / C 漏配 / D 手滑 / recovery 恢复中 / unknown).
 *
 * == 设计 ==
 * - collapsed (默认): 显示前 3 条 critical + warning, 红/黄 Tag 标记
 * - expanded: 显示所有 N 条, 按 severity 排序 (critical > warning > info > unknown) + docs7d asc
 * - mac 大写 + 等宽 + 灰底, mountNode/protocol Tag
 * - docs7d 大数字 (Tabular Nums), 0 标红 + ⚠️ 图标
 * - docs3dDaily 小字 "3d: 0/0/5" (近→远, 加 / 分隔)
 * - 5min 自动 refetch (跟 PageSummary 频次对齐), 右上角 Reload 按钮手动 refetch
 *
 * == 数据 ==
 * server: GET /api/v2/admin/terminals/anomalies?limit=20
 * type: Uart.AnomalousTerminal (types/uart.d.ts)
 * API: getAnomalousTerminals() (lib/api/endpoints/admin/terminals.ts)
 *
 * == 频次 ==
 * 5min 自动 poll. 原因: server 端查询 7d docs aggregate 较重 (~500ms), 5min 频次够用.
 * 比 heartbeat 5s poll 慢 60 倍, 但能展示 batch 异常.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button, Empty, Spin, Tag, Tooltip, Typography,
} from 'antd'
import {
  ReloadOutlined,
  WarningOutlined,
  WarningFilled,
  ThunderboltOutlined,
  ArrowRightOutlined,
  DownOutlined,
  UpOutlined,
  SmileOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

import { getAnomalousTerminals } from '@/lib/api/endpoints/admin/terminals'
import { usePromise } from '@/lib/hooks/usePromise'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

/** 5 分钟自动轮询 */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/** collapsed 模式最多显示 N 条 (按 severity 排序) */
const COLLAPSED_LIMIT = 3

/** severity → antd Tag 颜色 */
const SEVERITY_TAG_COLOR: Record<Uart.AnomalousSeverity, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'blue',
  unknown: 'default',
}

/** severity → 中文短标签 (UI 显示) */
const SEVERITY_LABEL: Record<Uart.AnomalousSeverity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
  unknown: '未知',
}

/** rootCause → 中文短描述 (单条卡上显示) */
const ROOT_CAUSE_LABEL: Record<Uart.AnomalousRootCause, string> = {
  A: 'A 物理层',
  B: 'B 间歇',
  C: 'C 漏配',
  D: 'D 手滑',
  recovery: '恢复中',
  unknown: '需排查',
}

/** severity 排序权重 (小的在前 = critical 优先) */
const SEVERITY_ORDER: Record<Uart.AnomalousSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  unknown: 3,
}

/** 按 severity + docs7d 排序 (critical 优先, 同 severity 内 docs7d 少优先) */
function sortAnomalies(list: Uart.AnomalousTerminal[]): Uart.AnomalousTerminal[] {
  return [...list].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9
    const sb = SEVERITY_ORDER[b.severity] ?? 9
    if (sa !== sb) return sa - sb
    return a.docs7d - b.docs7d
  })
}

/** 单条设备卡片 */
const DeviceRow: React.FC<{ item: Uart.AnomalousTerminal; compact?: boolean }> = ({ item, compact }) => {
  const router = useRouter()
  const isZero = item.docs7d === 0
  const dailyStr = item.docs3dDaily.join('/')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: compact ? '10px 12px' : '12px 14px',
        background: 'var(--ink-50)',
        border: '1px solid var(--ink-100)',
        borderRadius: 10,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink-200)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ink-100)')}
    >
      {/* mac + 在线状态点 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '0 0 auto' }}>
        <Tooltip title={item.online ? '设备 online' : '设备 offline'}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.online ? '#10b981' : '#94a3b8',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
        </Tooltip>
        <code
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: compact ? 11 : 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--ink-900)',
            background: '#fff',
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid var(--ink-100)',
            letterSpacing: 0.3,
          }}
        >
          {item.mac}
        </code>
      </div>

      {/* mountNode + mountDev + protocol Tag */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: '0 0 auto' }}>
        <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{item.mountNode}</Tag>
        <Tag style={{ margin: 0, fontSize: 11 }}>{item.mountDev}</Tag>
        <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>{item.protocol}</Tag>
      </div>

      {/* 7d docs 大数字 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginLeft: 'auto', flex: '0 0 auto' }}>
        {isZero && (
          <Tooltip title="7d 零数据 = 物理层/固件问题">
            <WarningFilled style={{ color: '#ef4444', fontSize: 14 }} />
          </Tooltip>
        )}
        <span
          style={{
            fontSize: compact ? 18 : 20,
            fontWeight: 700,
            color: isZero ? '#ef4444' : 'var(--ink-900)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {item.docs7d}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-500)' }}>7d</span>
        <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
          3d: {dailyStr}
        </Text>
      </div>

      {/* rootCause Tag */}
      <Tag
        color={SEVERITY_TAG_COLOR[item.severity]}
        style={{ margin: 0, fontSize: 11, fontWeight: 500, flex: '0 0 auto' }}
      >
        {ROOT_CAUSE_LABEL[item.rootCause]}
      </Tag>

      {/* hint (省略号截断) */}
      {!compact && (
        <Tooltip title={item.hint}>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '0 1 auto',
            }}
          >
            {item.hint}
          </Text>
        </Tooltip>
      )}

      {/* 查看按钮 */}
      <Button
        size="small"
        type="link"
        icon={<ArrowRightOutlined />}
        iconPosition="end"
        onClick={() => router.push(item.actionUrl)}
        style={{ flex: '0 0 auto', padding: '0 4px' }}
      >
        查看
      </Button>
    </div>
  )
}

export function AnomalousDevicesCard() {
  const [expanded, setExpanded] = useState(false)

  const { data, loading, err, fecth: refetch } = usePromise<{ items: Uart.AnomalousTerminal[]; lastUpdate: number }>(
    async () => {
      const res = await getAnomalousTerminals(50)
      if (res.code === 200 && Array.isArray(res.data)) {
        return { items: res.data, lastUpdate: Date.now() }
      }
      throw new Error(res.message || `code=${res.code}`)
    },
    { items: [], lastUpdate: 0 },
  )

  // 5min 自动 refetch (跟 PageSummary 健康检查同频)
  useEffect(() => {
    const t = setInterval(() => {
      refetch()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [refetch])

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const sorted = useMemo(() => sortAnomalies(items), [items])
  const visibleItems = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT)
  const hasMore = sorted.length > COLLAPSED_LIMIT

  const criticalCount = sorted.filter((x) => x.severity === 'critical').length
  const warningCount = sorted.filter((x) => x.severity === 'warning').length

  return (
    <div
      className="bento-card"
      style={{ marginBottom: 24, padding: 20 }}
    >
      {/* ─── 标题区 ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: loading || err || items.length === 0 ? 0 : 16,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: criticalCount > 0 ? '#ef4444' : '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          <WarningOutlined />
        </span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>
          问题设备
        </h3>
        {/* 副标题: critical/warning 数 */}
        {!loading && !err && items.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {criticalCount > 0 && (
              <Tag color="red" style={{ margin: 0, fontSize: 11 }}>{criticalCount} critical</Tag>
            )}
            {warningCount > 0 && (
              <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>{warningCount} warning</Tag>
            )}
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>
          共 {items.length} 台
        </span>
        {/* 刷新按钮 */}
        <Tooltip title="刷新">
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => refetch()}
            disabled={loading}
          />
        </Tooltip>
      </div>

      {/* ─── 内容区 ─── */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin description="加载中..." />
        </div>
      ) : err ? (
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            color: '#ef4444',
            fontSize: 13,
            background: 'rgba(239, 68, 68, 0.06)',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          加载失败: {String(err?.message || err)}
          <Button size="small" type="link" onClick={() => refetch()} style={{ marginLeft: 8 }}>
            重试
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 28,
            background: 'rgba(16, 185, 129, 0.06)',
            borderRadius: 10,
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <SmileOutlined style={{ fontSize: 28, color: '#10b981', marginBottom: 6 }} />
          <div style={{ fontSize: 14, color: '#047857', fontWeight: 500 }}>
            🎉 无问题设备
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
            所有 pesiv 节点设备 7d 数据正常
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleItems.map((item) => (
              <DeviceRow key={item.mac} item={item} compact={!expanded} />
            ))}
          </div>

          {/* 展开/收起按钮 */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button
                size="small"
                type="link"
                onClick={() => setExpanded(!expanded)}
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                iconPosition="end"
              >
                {expanded ? '收起' : `展开全部 ${sorted.length} 条`}
              </Button>
            </div>
          )}

          {/* 底部: 更新时间 + 5min 轮询提示 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              fontSize: 10,
              color: 'var(--ink-500)',
            }}
          >
            <ClockCircleOutlined />
            <span>
              {data?.lastUpdate
                ? `更新于 ${dayjs(data.lastUpdate).format('HH:mm:ss')} · 5 分钟自动刷新`
                : '加载中...'}
            </span>
            <ThunderboltOutlined style={{ marginLeft: 'auto', color: 'var(--ink-400)' }} />
          </div>
        </>
      )}
    </div>
  )
}

export default AnomalousDevicesCard
