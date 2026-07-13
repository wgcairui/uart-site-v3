'use client'

import { Alert, App, Button, Empty, Form, InputNumber, List, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { usePromise } from '@/lib/hooks/usePromise'
import { getProtocols } from '@/lib/api/fetchRoot'
import { aiDryRun } from '@/lib/api/endpoints/admin/ai'
import { useState } from 'react'
import type { DryRunResult } from '@/types/ai'

const { Text, Paragraph } = Typography

/**
 * /admin/ai/dry-run — 协议 Dry-run 验证（决策 20 / 2026-06-24，2026-07-12 v3 化）
 *
 * 流程：
 * 1. 选择协议 + 样本数 + 回溯时长
 * 2. 点击「跑 Dry-run」→ POST /api/v2/admin/ai/dry-run
 * 3. 一次性返回 {pass, score, checks, llmAssessment, ...} → 展示
 *
 * 后端 v1 不持久化历史（CLAUDE.md 决策 20 简化），**不轮询不订阅**。
 * 重新跑会覆盖当前结果。
 *
 * v3 化改造（2026-07-12）：
 * - 顶部 PageHeader + 紫渐变 device hero + 4 KPI mini PageSummary
 * - 表单 / 结果 Card 改 bento-card glass-card
 * - pass/fail 用 StatusTag 6 variant 显示（success/error）
 * - 整页 bg-bento-canvas 极光晕染背景
 */
export default function AiDryRunPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ protocolName: string; sampleSize: number; lookbackHours: number }>()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DryRunResult | null>(null)
  // 累计历史（session 内存，不持久化）：[last run result, run count, pass count, total tokens]
  const [history, setHistory] = useState<{
    runCount: number
    passCount: number
    totalTokens: number
  }>({ runCount: 0, passCount: 0, totalTokens: 0 })

  const { data, loading: listLoading } = usePromise<any>(
    async () => {
      const el = await getProtocols({ page: 1, pageSize: 200, needTotal: true } as any)
      return el.data
    },
    { items: [], pagination: {} },
    []
  )

  const protocols: any[] = data?.items ?? []
  const protocolCount = data?.pagination?.total ?? protocols.length

  const submit = async (values: { protocolName: string; sampleSize: number; lookbackHours: number }) => {
    if (!values.protocolName) {
      message.warning('请选择协议')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res: any = await aiDryRun({
        protocolName: values.protocolName,
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

  const passRate = history.runCount > 0
    ? Math.round((history.passCount / history.runCount) * 100)
    : 0

  return (
    <>
      <PageHeader
        title="AI 协议 Dry-run 验证"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: 'AI 工具', href: '/admin/ai/generate' },
          { title: 'Dry-run 验证' },
        ]}
        extra={
          <Tag color="orange" style={{ fontSize: 12 }}>
            v1 不持久化历史
          </Tag>
        }
      />
      <div
        className="bg-bento-canvas"
        style={{ position: 'relative', zIndex: 0, paddingLeft: 0, paddingRight: 0 }}
      >
        {/* ============ Device Hero · 紫渐变小条 + 验证引擎状态 ============ */}
        <div
          className="bento-card v3-device-hero"
          style={{
            marginBottom: 20,
            padding: '20px 28px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
            color: '#fff',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200,
              background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
              opacity: 0.35, pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
                color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <ExperimentOutlined style={{ fontSize: 18 }} />
                AI 协议 Dry-run 验证
              </h2>
              <div
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'rgba(255,255,255,0.7)', marginTop: 6,
                }}
              >
                LLM-as-Validator · 协议对历史回包适用性 · 单次不持久化
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999,
                  background: loading
                    ? 'rgba(139, 92, 246, 0.25)'
                    : result
                      ? (result.pass ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)')
                      : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${
                    loading
                      ? 'rgba(139, 92, 246, 0.4)'
                      : result
                        ? (result.pass ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)')
                        : 'rgba(255, 255, 255, 0.2)'
                  }`,
                  color: loading
                    ? '#c4b5fd'
                    : result
                      ? (result.pass ? '#86efac' : '#fda4af')
                      : '#fff',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: loading
                    ? '#c4b5fd'
                    : result
                      ? (result.pass ? '#86efac' : '#fda4af')
                      : 'rgba(255,255,255,0.6)',
                  animation: loading ? 'pulse-dot 2s infinite' : undefined,
                }} />
                {loading ? '验证中…' : result ? (result.pass ? 'PASS' : 'FAIL') : '空闲就绪'}
              </span>
            </div>
          </div>
        </div>

        {/* ============ 4 KPI mini PageSummary ============ */}
        <div style={{ marginBottom: 20 }}>
          <PageSummary
            items={[
              {
                label: '可验证协议',
                value: protocolCount,
                variant: 'primary',
                icon: <FileSearchOutlined />,
                extra: '已注册的协议',
              },
              {
                label: '验证次数',
                value: history.runCount,
                variant: 'info',
                icon: <ThunderboltOutlined />,
                extra: history.runCount > 0 ? `本次会话累计` : '尚未开始',
              },
              {
                label: 'PASS 率',
                value: history.runCount > 0 ? `${passRate}%` : '—',
                variant: history.runCount === 0 ? 'warning' : passRate >= 80 ? 'success' : passRate >= 50 ? 'warning' : 'danger',
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
          <Form
            form={form}
            layout="inline"
            initialValues={{ sampleSize: 5, lookbackHours: 168 }}
            onFinish={submit}
          >
            <Form.Item label="协议" name="protocolName" rules={[{ required: true }]}>
              <select
                style={{ width: 240, height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #d9d9d9' }}
                disabled={loading || listLoading}
              >
                <option value="">— 选择协议 —</option>
                {protocols.map((p) => (
                  <option key={p._id} value={p.Protocol}>
                    {p.Protocol} ({p.ProtocolType})
                  </option>
                ))}
              </select>
            </Form.Item>
            <Form.Item label="样本数" name="sampleSize" tooltip="1-20，默认 5">
              <InputNumber min={1} max={20} disabled={loading} />
            </Form.Item>
            <Form.Item label="回溯小时" name="lookbackHours" tooltip="1-720，默认 168（7 天）">
              <InputNumber min={1} max={720} disabled={loading} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ExperimentOutlined />}
                loading={loading}
              >
                跑 Dry-run
              </Button>
            </Form.Item>
          </Form>
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
                <StatusTag variant="online" pulse text={`PASS · ${result.score}/100`} icon={<CheckCircleOutlined />} />
              ) : (
                <StatusTag variant="error" text={`FAIL · ${result.score}/100`} icon={<CloseCircleOutlined />} />
              )}
              <Tag color="purple" style={{ fontSize: 11 }}>{result.provider}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                样本 {result.samplesUsed}/{result.sampleSize} · {result.inputTokens + result.outputTokens} tokens
              </Text>
            </Space>
            <Alert
              type={result.pass ? 'success' : 'warning'}
              message="LLM 评估"
              description={result.llmAssessment}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Paragraph strong style={{ marginBottom: 12 }}>检查项（{result.checks.length}）</Paragraph>
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
    </>
  )
}
