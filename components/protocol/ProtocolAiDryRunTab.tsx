'use client'

import { Alert, App, Button, Empty, Form, InputNumber, List, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { aiDryRun } from '@/lib/api/endpoints/admin/ai'
import type { DryRunResult } from '@/types/ai'

const { Text, Paragraph } = Typography

interface ProtocolAiDryRunTabProps {
  protocolName: string
}

/**
 * 「Dry-run」tab（合并自 /admin/ai/dry-run，决策 PR-1 / 2026-07-17）
 *
 * 父级 Tabs 已展示协议 hero（紫渐变 + 6 KV），本 tab 不再重复 device hero。
 * 协议名由父级 prop 固定（dropdown 改为 read-only Tag，避免用户重选）。
 *
 * 流程（与原 /admin/ai/dry-run 一致）：
 * 1. mount → 显示当前协议 + 默认参数 (sampleSize=5, lookbackHours=168)
 * 2. 点击「跑 Dry-run」→ POST /api/v2/admin/ai/dry-run
 * 3. 一次性返回 {pass, score, checks, llmAssessment, ...} → 展示
 *
 * 后端 v1 不持久化历史（CLAUDE.md 决策 20 简化），**不轮询不订阅**。
 * 重新跑会覆盖当前结果。
 */
export const ProtocolAiDryRunTab: React.FC<ProtocolAiDryRunTabProps> = ({ protocolName }) => {
  return <ProtocolAiDryRunContent key={protocolName} protocolName={protocolName} />
}

interface ProtocolAiDryRunContentProps {
  protocolName: string
}

function ProtocolAiDryRunContent({ protocolName }: ProtocolAiDryRunContentProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ sampleSize: number; lookbackHours: number }>()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DryRunResult | null>(null)
  // 累计历史（session 内存，不持久化）：[run count, pass count, total tokens]
  const [history, setHistory] = useState<{
    runCount: number
    passCount: number
    totalTokens: number
  }>({ runCount: 0, passCount: 0, totalTokens: 0 })

  const submit = async (values: { sampleSize: number; lookbackHours: number }) => {
    setLoading(true)
    setResult(null)
    try {
      const res: any = await aiDryRun({
        protocolName,
        sampleSize: values.sampleSize,
        lookbackHours: values.lookbackHours,
      })
      if (res.code === 200 || res.code === 0) {
        setResult(res.data)
        const tokens = (res.data?.inputTokens ?? 0) + (res.data?.outputTokens ?? 0)
        setHistory((h) => ({
          runCount: h.runCount + 1,
          passCount: h.passCount + (res.data?.pass ? 1 : 0),
          totalTokens: h.totalTokens + tokens,
        }))
      } else {
        message.error(res.msg || 'Dry-run 失败')
      }
    } catch (err: any) {
      message.error(`请求失败：${err?.message ?? err}`)
    } finally {
      setLoading(false)
    }
  }

  const passRate =
    history.runCount > 0 ? Math.round((history.passCount / history.runCount) * 100) : 0

  return (
    <div
      className="bg-bento-canvas"
      style={{ position: 'relative', zIndex: 0, paddingLeft: 0, paddingRight: 0 }}
    >
      {/* ============ 3 KPI mini PageSummary (去掉「可验证协议」, 因为协议由父级固定) ============ */}
      <div style={{ marginBottom: 20 }}>
        <PageSummary
          items={[
            {
              label: '验证次数',
              value: history.runCount,
              variant: 'info',
              icon: <ThunderboltOutlined />,
              extra: history.runCount > 0 ? '本次会话累计' : '尚未开始',
            },
            {
              label: 'PASS 率',
              value: history.runCount > 0 ? `${passRate}%` : '—',
              variant:
                history.runCount === 0
                  ? 'warning'
                  : passRate >= 80
                    ? 'success'
                    : passRate >= 50
                      ? 'warning'
                      : 'danger',
              icon: <CheckCircleOutlined />,
              extra: `${history.passCount}/${history.runCount} 通过`,
            },
            {
              label: '总 Token',
              value: history.totalTokens,
              variant: 'purple',
              icon: <RobotOutlined />,
              extra: result
                ? `本次 in/out: ${result.inputTokens}/${result.outputTokens}`
                : '—',
            },
          ]}
        />
      </div>

      {/* ============ 表单 Card → bento-card ============ */}
      <div className="bento-card" style={{ marginBottom: 20, padding: 24 }}>
        <Space
          orientation="vertical"
          size={12}
          style={{ width: '100%' }}
        >
          {/* 协议 (read-only, 由父级 info page prop 固定) */}
          <Space size={8} align="center">
            <Text type="secondary" style={{ fontSize: 13 }}>
              协议
            </Text>
            <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>
              {protocolName}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              (固定为当前协议, 切换协议请返回「采集指令」tab)
            </Text>
          </Space>

          <Form
            form={form}
            layout="inline"
            initialValues={{ sampleSize: 5, lookbackHours: 168 }}
            onFinish={submit}
          >
            <Form.Item label="样本数" name="sampleSize" tooltip="1-20，默认 5">
              <InputNumber min={1} max={20} disabled={loading} />
            </Form.Item>
            <Form.Item label="回溯小时" name="lookbackHours" tooltip="1-720，默认 168（7 天）">
              <InputNumber min={1} max={720} disabled={loading} />
            </Form.Item>
            <Form.Item>
              <Space size={8}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<ExperimentOutlined />}
                  loading={loading}
                >
                  跑 Dry-run
                </Button>
                <Tag
                  color={
                    loading
                      ? 'processing'
                      : result
                        ? result.pass
                          ? 'success'
                          : 'error'
                        : 'default'
                  }
                  style={{ fontSize: 12, margin: 0 }}
                >
                  {loading
                    ? '验证中…'
                    : result
                      ? result.pass
                        ? `PASS · ${result.score}/100`
                        : `FAIL · ${result.score}/100`
                      : '空闲就绪'}
                </Tag>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </div>

      {!result && !loading && (
        <div className="bento-card" style={{ padding: 32 }}>
          <Empty
            description={
              <Space orientation="vertical" size={4}>
                <Text type="secondary">点击「跑 Dry-run」开始验证</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  后端用 LLM 当 validator，检查协议对历史回包的适用性
                </Text>
              </Space>
            }
          />
        </div>
      )}

      {result && (
        // 结果 Card → bento-card + glass-card
        <div className="glass-card" style={{ padding: 24 }}>
          <Space size={12} align="center" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 16 }}>{result.protocolName}</Text>
            {result.pass ? (
              <StatusTag
                variant="online"
                pulse
                text={`PASS · ${result.score}/100`}
                icon={<CheckCircleOutlined />}
              />
            ) : (
              <StatusTag
                variant="error"
                text={`FAIL · ${result.score}/100`}
                icon={<CloseCircleOutlined />}
              />
            )}
            <Tag color="purple" style={{ fontSize: 11 }}>{result.provider}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              样本 {result.samplesUsed}/{result.sampleSize} ·{' '}
              {result.inputTokens + result.outputTokens} tokens
            </Text>
          </Space>
          <Alert
            type={result.pass ? 'success' : 'warning'}
            message="LLM 评估"
            description={result.llmAssessment}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Paragraph strong style={{ marginBottom: 12 }}>
            检查项（{result.checks.length}）
          </Paragraph>
          <List
            dataSource={result.checks}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  {item.ok ? (
                    <CheckCircleOutlined style={{ color: '#10b981' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <Text strong style={{ minWidth: 140 }}>
                    {item.name}
                  </Text>
                  <Text type="secondary">{item.message}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  )
}
