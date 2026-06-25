'use client'

import { Card, Statistic, Tag, Typography, Space, Empty } from 'antd'
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
 * StatsPane（右侧栏）— 实时仪表
 *
 * 字段（按父任务要求）：
 * - token 数（input / output 分别统计）
 * - 延迟（latencyMs，毫秒）
 * - 当前指令条数（instructCount，来自当前 protocol）
 * - LLM 推理步骤（tool_start 累计）
 * - provider / usedFallback（落库后填充）
 *
 * 错误状态：error 字段非空时显示 warning + 错误文本
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--colorBorderSecondary, #e5e7eb)',
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          实时仪表
        </Text>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {stats.error && (
          <Card size="small" style={{ borderColor: '#ff4d4f', background: '#fff1f0' }}>
            <Space orientation="vertical" size={4}>
              <Text type="danger" strong style={{ fontSize: 13 }}>
                请求失败
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.error}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                常见原因：DEEPSEEK_API_KEY 未配置 / 后端 PR #58 未部署 / 网络问题
              </Text>
            </Space>
          </Card>
        )}

        <Card size="small" title={<><ApiOutlined /> Token 用量</>}>
          <Space size={16} wrap>
            <Statistic
              title="输入"
              value={stats.inputTokens}
              suffix="tokens"
              styles={{ content: { fontSize: 16 } }}
            />
            <Statistic
              title="输出"
              value={stats.outputTokens}
              suffix="tokens"
              styles={{ content: { fontSize: 16 } }}
            />
          </Space>
        </Card>

        <Card size="small" title={<><ClockCircleOutlined /> 延迟</>}>
          <Space size={16} wrap>
            <Statistic
              title={isRunning ? '已用时' : '总耗时'}
              value={isRunning ? elapsed : stats.latencyMs || elapsed}
              suffix="ms"
              styles={{ content: { fontSize: 16 } }}
            />
            {stats.latencyMs > 0 && stats.latencyMs !== elapsed && (
              <Statistic
                title="LLM 端"
                value={stats.latencyMs}
                suffix="ms"
                styles={{ content: { fontSize: 16 } }}
              />
            )}
          </Space>
        </Card>

        <Card size="small" title={<><FieldNumberOutlined /> 协议结构</>}>
          <Space size={16} wrap>
            <Statistic
              title="指令条数"
              value={instructionCount}
              styles={{ content: { fontSize: 16 } }}
            />
            <Statistic
              title="工具调用"
              value={toolStepCount}
              styles={{ content: { fontSize: 16 } }}
            />
          </Space>
        </Card>

        <Card size="small" title={<><RocketOutlined /> Provider</>}>
          {stats.provider ? (
            <Space size={4} wrap>
              <Tag color="blue">{stats.provider}</Tag>
              {stats.usedFallback && <Tag color="warning">已 fallback</Tag>}
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              等待 stream 启动…
            </Text>
          )}
        </Card>

        {!isRunning && !stats.provider && !stats.error && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                提交后会显示 LLM 调用统计
              </Text>
            }
          />
        )}
      </div>
    </div>
  )
}