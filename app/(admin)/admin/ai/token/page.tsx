'use client'

/**
 * admin AI Token 签发页 — /admin/ai/token
 *
 * == 作用 ==
 * 给 AI / Mavis 等外部工具签发"只读 token" (RoleType.AI), 替代之前
 * 拿 admin token 调 admin endpoint (越权) 或 mongosh 直查 (链路长) 的方案.
 *
 * == 流程 ==
 * 1. admin 填 AI 名称 (2-32 字符) + 选有效天数 (1-365, 默认 30)
 * 2. 提交 → POST /api/v2/admin/auth/issue-ai-token
 * 3. 拿到 token → 展示 + 一键复制 + 写入 ~/.uart-server-config 的引导
 *
 * == 安全约束 (跟 server 端 PR #106 对齐) ==
 * - AI token **只能** 调 @Role(..., RoleType.AI) 标记的只读端点, 写端点返 403
 * - token 30d 自然过期, 紧急撤销: 改 server `Secret_JwtSign` secret
 *   (副作用大, 同时让所有 user token 失效, 短期接受)
 * - **不要** 在 web 端拿这个 token 调任何 endpoint — 会跟当前 admin session 错位
 * - token 一次性展示, **不再** 提供 re-fetch 接口 (跟现有 user token 一样)
 *
 * == 字段名权威源 ==
 * midwayuartserver/src/module/auth/controller/admin-auth.controller.ts
 * midwayuartserver/src/module/ai-ops/ + types/uart.d.ts
 */
import {
  Button, Form, Input, InputNumber, message, Result, Space, Tag, Tooltip, Typography, Alert,
} from 'antd'
import {
  KeyOutlined, CopyOutlined, ReloadOutlined, SafetyCertificateOutlined,
  InfoCircleOutlined, RobotOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import React, { useState } from 'react'

import { issueAiToken } from '@/lib/api/fetchRoot'
import { PageHeader } from '@/components/common/PageHeader'
import { BentoCard } from '@/components/common/BentoCard'

const { Text, Paragraph } = Typography

const { TextArea } = Input

/** 有效天数选项 (1d / 7d / 30d 默认 / 90d / 365d) */
const EXPIRES_PRESETS = [1, 7, 30, 90, 365]

interface FormValues {
  name: string
  expiresInDays: number
}

export default function AdminAiTokenPage() {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [issued, setIssued] = useState<Uart.AiTokenIssueResult | null>(null)

  // 提交签发
  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const res = await issueAiToken({
        name: values.name.trim(),
        expiresInDays: values.expiresInDays,
      })
      if (res.code === 200 && res.data) {
        setIssued(res.data)
        message.success(`AI token 已签发: ai:${res.data.name}`)
      } else {
        message.error(res.message || '签发失败')
      }
    } catch (err: any) {
      message.error(err?.message || '签发失败 (网络错误)')
    } finally {
      setLoading(false)
    }
  }

  // 复制 token 到剪贴板
  const copyToken = async (token: string) => {
    try {
      // 优先用 navigator.clipboard (现代浏览器, https 必走), fallback 到 execCommand
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token)
      } else {
        const aux = document.createElement('input')
        aux.value = token
        document.body.appendChild(aux)
        aux.select()
        document.execCommand('copy')
        document.body.removeChild(aux)
      }
      message.success('Token 已复制到剪贴板')
    } catch {
      message.error('复制失败, 请手动选中复制')
    }
  }

  // 复制完整配置 (.uart-server-config 一段)
  const copyConfig = async (data: Uart.AiTokenIssueResult) => {
    const config = [
      '# AI token (uart-server-ops skill 配置)',
      `# 签发时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      `# 过期时间: ${dayjs(data.expiresAt).format('YYYY-MM-DD HH:mm:ss')}`,
      `export UART_SERVER_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://uart.ladishb.com'}`,
      `export UART_SERVER_TOKEN=${data.token}`,
    ].join('\n')
    await copyToken(config)
  }

  // 重置 / 重新签发
  const handleReset = () => {
    setIssued(null)
    form.resetFields()
  }

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0, padding: 24 }}>
      <PageHeader
        title="AI Token 签发"
        subtitle="为 AI / Mavis 等外部工具签发只读 token (RoleType.AI) — 替代 admin token / mongosh"
        breadcrumb={[
          { title: '系统管理', href: '/admin' },
          { title: 'AI 工具' },
        ]}
        extra={
          !issued ? null : (
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              签发新 token
            </Button>
          )
        }
      />

      {/* ═══ 顶部说明 ═══ */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="AI token 只能调只读端点"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>• 写端点 (instruct / clean / approve 等) 调会返 403, AI 无法越权</div>
            <div>• 所有调用被 server <code>LogUserRequestService</code> 自动记录, admin 可在
              <a href="/admin/ai/audit" style={{ marginLeft: 4 }}>AI 调用审计</a> 查看
            </div>
            <div>• 30d 自然过期, 紧急撤销: 改 server <code>Secret_JwtSign</code> secret
              (<Text type="warning">副作用大, 同时让所有 user token 失效</Text>)
            </div>
            <div>• <Text strong>不要</Text> 在 web 端拿这个 token 调任何 endpoint — 会跟当前 admin session 错位</div>
          </div>
        }
        style={{ marginBottom: 20, maxWidth: 900 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 1fr', gap: 20, maxWidth: 1100 }}>
        {/* ─── 左侧: 签发表单 ─── */}
        <BentoCard variant="default" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#8b5cf6' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>签发新 AI token</span>
          </div>

          <Form<FormValues>
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{ expiresInDays: 30 }}
            disabled={loading || !!issued}
            requiredMark
          >
            <Form.Item
              name="name"
              label="AI 名称"
              rules={[
                { required: true, message: '请输入 AI 名称' },
                { min: 2, max: 32, message: '2-32 字符' },
                {
                  pattern: /^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/,
                  message: '仅支持字母/数字/下划线/中文/连字符',
                },
              ]}
              extra="用于识别 token 归属 (例如: mavis-dev / prod-debug)"
            >
              <Input
                placeholder="mavis-prod"
                prefix={<RobotOutlined style={{ color: '#8b5cf6' }} />}
                allowClear
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="expiresInDays"
              label="有效天数"
              extra={
                <Space size={4} wrap style={{ marginTop: 6 }}>
                  {EXPIRES_PRESETS.map((d) => (
                    <Tag
                      key={d}
                      color="purple"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => form.setFieldValue('expiresInDays', d)}
                    >
                      {d} 天
                    </Tag>
                  ))}
                </Space>
              }
            >
              <InputNumber
                min={1}
                max={365}
                style={{ width: '100%' }}
                addonAfter="天"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<KeyOutlined />}
                >
                  签发 token
                </Button>
                <Button onClick={() => form.resetFields()}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </BentoCard>

        {/* ─── 右侧: 签发结果 / 引导 ─── */}
        {issued ? (
          <BentoCard variant="default" padding="lg">
            <Result
              status="success"
              icon={<SafetyCertificateOutlined style={{ color: '#10b981' }} />}
              title={
                <span style={{ fontSize: 18 }}>
                  AI token 已签发 — <code style={{ color: '#8b5cf6' }}>ai:{issued.name}</code>
                </span>
              }
              subTitle={
                <Space size={4} wrap>
                  <Tag color="purple">userGroup: {issued.userGroup}</Tag>
                  <Tag color="blue">
                    过期: {dayjs(issued.expiresAt).format('YYYY-MM-DD HH:mm')}
                  </Tag>
                </Space>
              }
              style={{ padding: 0 }}
            />

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>
                <KeyOutlined style={{ marginRight: 4 }} />
                Token (一次性展示, 关闭页面后无法再查看)
              </div>
              <div
                style={{
                  position: 'relative',
                  background: '#0f172a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: 11,
                  color: '#a5f3fc',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                  maxHeight: 160,
                  overflow: 'auto',
                }}
              >
                {issued.token}
                <Tooltip title="复制 token">
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => copyToken(issued.token)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: '#a5f3fc',
                    }}
                  />
                </Tooltip>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>
                Mavis skill 配置 (写到 <code>~/.uart-server-config</code>)
              </div>
              <Paragraph
                copyable={{
                  text: [
                    '# AI token (uart-server-ops skill 配置)',
                    `# 签发时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
                    `# 过期时间: ${dayjs(issued.expiresAt).format('YYYY-MM-DD HH:mm:ss')}`,
                    `export UART_SERVER_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://uart.ladishb.com'}`,
                    `export UART_SERVER_TOKEN=${issued.token}`,
                  ].join('\n'),
                  tooltips: ['复制 Mavis 配置', '已复制'],
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 11,
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  marginBottom: 0,
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`# AI token (uart-server-ops skill 配置)
# 签发时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
# 过期时间: ${dayjs(issued.expiresAt).format('YYYY-MM-DD HH:mm:ss')}
export UART_SERVER_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://uart.ladishb.com'}
export UART_SERVER_TOKEN=${issued.token}`}
                </pre>
              </Paragraph>
            </div>

            <div style={{ marginTop: 20, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
              <Text strong style={{ color: '#92400e', fontSize: 13 }}>
                ⚠️ 安全提示
              </Text>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20, color: '#78350f', fontSize: 12, lineHeight: 1.8 }}>
                <li>token 只能调只读端点, 写操作 (instruct / clean / approve 等) 会返 403</li>
                <li>所有 AI 调用会被 server 自动记录 (userGroup=ai, user=ai:&lt;name&gt;), 审计可见</li>
                <li>token 泄露 → 改 server <code>Secret_JwtSign</code> 撤销 (同时让所有 user token 失效)</li>
                <li>不要把 token 写到公开仓库 / 公开文档 / 截图里</li>
              </ul>
            </div>
          </BentoCard>
        ) : (
          <BentoCard variant="default" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <InfoCircleOutlined style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>使用说明</span>
            </div>
            <ol style={{ paddingLeft: 20, lineHeight: 1.9, color: '#334155', fontSize: 13 }}>
              <li>
                填 AI 名称 (2-32 字符, 字母/数字/下划线/中文/连字符)
              </li>
              <li>
                选有效天数 (1-365, 默认 30d), 也可点 preset tag
              </li>
              <li>
                点 &quot;签发 token&quot; → server 调 <code>POST /api/v2/admin/auth/issue-ai-token</code>
              </li>
              <li>
                拿到 token 后:<br />
                • <Text strong>复制 token</Text> — 给 AI / Mavis 直接用<br />
                • <Text strong>复制 Mavis 配置</Text> — 写到 <code>~/.config/mavis/agents/mavis/workspace/.uart-server-config</code>
              </li>
              <li>
                Mavis / 其他工具调 server 时带 <code>Authorization: Bearer $UART_SERVER_TOKEN</code><br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  完整端点清单见 <code>midwayuartserver/.agents/skills/uart-server-ops/SKILL.md</code>
                </Text>
              </li>
            </ol>
            <div style={{ marginTop: 16, padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#475569' }}>
                <strong>审计:</strong> 签发后所有 AI 调用可在
                <a href="/admin/ai/audit" style={{ marginLeft: 4 }}>AI 调用审计</a>
                页面查看 (按 userGroup=ai 过滤)
              </Text>
            </div>
          </BentoCard>
        )}
      </div>
    </div>
  )
}
