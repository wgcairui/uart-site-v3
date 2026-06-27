'use client'

import { Statistic, Tag, Typography, Space } from 'antd'
import {
  ApiOutlined,
  ClockCircleOutlined,
  FieldNumberOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { AiRunStats } from '@/types/ai'

const { Text } = Typography

/**
 * StatsPane — 实时仪表（紧凑横排，2026-06-27 重构）
 *
 * 之前是垂直堆叠 4 个 Card（高度 ~290px），浪费中间栏宽度。
 * cairui 反馈放顶部做一整行紧凑横条，节省空间。
 *
 * 新版：4 个统计横排
 * ```
 * ┌────────────────────────────────────────────────────────────────┐
 * │ 实时仪表 | Token 0/0 | 延迟 0ms | 协议结构 0条 | Provider minimax │
 * └────────────────────────────────────────────────────────────────┘
 * ```
 *
 * 高度：~60px（之前 290px，节省 230px 给 form/preview）
 *
 * 移动端 (< 768px)：自动 2x2 网格堆叠（用 flex-wrap）
 *
 * 字段：
 * - token 用量（input / output 分别统计）
 * - 延迟（latencyMs，毫秒）
 * - 当前指令条数（instructCount，来自当前 protocol）
 * - LLM 推理步骤（tool_start 累计）
 * - provider / usedFallback（落库后填充）
 *
 * 错误状态：error 字段非空时整条横条变红 + 显示错误文本
 */
export interface StatsPaneProps {
  stats: AiRunStats
  instructionCount?: number
  toolStepCount?: number
}

export function StatsPane({ stats, instructionCount = 0, toolStepCount = 0 }: StatsPaneProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!stats.startedAt || stats.finishedAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [stats.startedAt, stats.finishedAt])

  const elapsed = stats.startedAt
    ? Math.max(0, (stats.finishedAt ?? now) - stats.startedAt)
    : 0
  const isRunning = !!stats.startedAt && !stats.finishedAt

  const hasError = !!stats.error

  return (
    <div
      className="stats-pane-compact"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        flexWrap: 'wrap',
        // 错误态整条红边
        padding: hasError ? '4px 12px' : 0,
        background: hasError ? '#fff1f0' : 'transparent',
        border: hasError ? '1px solid #ff4d4f' : 'none',
        borderRadius: hasError ? 6 : 0,
      }}
    >
      {/* 标题 */}
      <Space size={6}>
        <RocketOutlined style={{ color: 'var(--colorPrimary, #6366f1)' }} />
        <Text strong style={{ fontSize: 13 }}>
          实时仪表
        </Text>
      </Space>

      {/* 分隔线 */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--colorBorderSecondary, #e5e7eb)',
        }}
      />

      {/* Token 用量 */}
      <Space size={4}>
        <ApiOutlined style={{ color: 'var(--colorTextTertiary)', fontSize: 12 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>Token</Text>
        <Text style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{stats.inputTokens ?? 0}</span>
          <span style={{ color: 'var(--colorTextTertiary)', margin: '0 4px' }}>/</span>
          <span style={{ fontWeight: 600 }}>{stats.outputTokens ?? 0}</span>
        </Text>
      </Space>

      {/* 分隔线 */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--colorBorderSecondary, #e5e7eb)',
        }}
      />

      {/* 延迟 */}
      <Space size={4}>
        <ClockCircleOutlined style={{ color: 'var(--colorTextTertiary)', fontSize: 12 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>延迟</Text>
        <Text style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {isRunning ? elapsed : stats.latencyMs || elapsed}
          <span style={{ fontSize: 11, color: 'var(--colorTextTertiary)', marginLeft: 2 }}>ms</span>
        </Text>
      </Space>

      {/* 分隔线 */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--colorBorderSecondary, #e5e7eb)',
        }}
      />

      {/* 协议结构 */}
      <Space size={4}>
        <FieldNumberOutlined style={{ color: 'var(--colorTextTertiary)', fontSize: 12 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>指令</Text>
        <Text style={{ fontSize: 13, fontWeight: 600 }}>
          {instructionCount}
          <span style={{ fontSize: 11, color: 'var(--colorTextTertiary)', margin: '0 4px' }}>条</span>
          <span style={{ fontSize: 11, color: 'var(--colorTextTertiary)' }}>
            · 工具 {toolStepCount}
          </span>
        </Text>
      </Space>

      {/* 分隔线 */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--colorBorderSecondary, #e5e7eb)',
        }}
      />

      {/* Provider */}
      {stats.provider ? (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>Provider</Text>
          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
            {stats.provider}
          </Tag>
          {stats.usedFallback && (
            <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
              已 fallback
            </Tag>
          )}
        </Space>
      ) : hasError ? (
        <Text type="danger" style={{ fontSize: 12 }}>
          {stats.error}
        </Text>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>
          等待 stream 启动…
        </Text>
      )}
    </div>
  )
}