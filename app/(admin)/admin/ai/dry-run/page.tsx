'use client'

import { Alert, Button, Card, Empty, Form, InputNumber, List, Space, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { usePromise } from '@/lib/hooks/usePromise'
import { getProtocols } from '@/lib/api/fetchRoot'
import { aiDryRun } from '@/lib/api/endpoints/admin/ai'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { useState } from 'react'
import type { DryRunResult } from '@/types/ai'

const { Text, Paragraph } = Typography

/**
 * /admin/ai/dry-run — 协议 Dry-run 验证（决策 20 / 2026-06-24）
 *
 * 流程：
 * 1. 选择协议 + 样本数 + 回溯时长
 * 2. 点击「跑 Dry-run」→ POST /api/v2/admin/ai/dry-run
 * 3. 一次性返回 {pass, score, checks, llmAssessment, ...} → 展示
 *
 * 后端 v1 不持久化历史（CLAUDE.md 决策 20 简化），**不轮询不订阅**。
 * 重新跑会覆盖当前结果。
 */
export default function AiDryRunPage() {
  const [form] = Form.useForm<{ protocolName: string; sampleSize: number; lookbackHours: number }>()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DryRunResult | null>(null)

  const { data, loading: listLoading } = usePromise<any>(
    async () => {
      const el = await getProtocols({ page: 1, pageSize: 200, needTotal: true } as any)
      return el.data
    },
    { items: [], pagination: {} },
    []
  )

  const protocols: any[] = data?.items ?? []

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
      } else {
        message.error(res.msg || 'Dry-run 失败')
      }
    } catch (err: any) {
      message.error(`请求失败：${err?.message ?? err}`)
    } finally {
      setLoading(false)
    }
  }

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
      <Card style={{ marginBottom: 16 }}>
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
      </Card>

      {!result && !loading && (
        <Empty
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">点击「跑 Dry-run」开始验证</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                后端用 LLM 当 validator，检查协议对历史回包的适用性
              </Text>
            </Space>
          }
        />
      )}

      {result && (
        <Card
          title={
            <Space>
              <Text strong>{result.protocolName} 验证结果</Text>
              {result.pass ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  PASS · {result.score}/100
                </Tag>
              ) : (
                <Tag color="error" icon={<CloseCircleOutlined />}>
                  FAIL · {result.score}/100
                </Tag>
              )}
              <Tag>{result.provider}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                样本 {result.samplesUsed}/{result.sampleSize} · {result.inputTokens + result.outputTokens} tokens
              </Text>
            </Space>
          }
        >
          <Alert
            type={result.pass ? 'success' : 'warning'}
            message="LLM 评估"
            description={result.llmAssessment}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Paragraph strong>检查项（{result.checks.length}）</Paragraph>
          <List
            dataSource={result.checks}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  {item.ok ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
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
        </Card>
      )}
    </>
  )
}