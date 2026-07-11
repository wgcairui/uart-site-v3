'use client'

import { Alert, Card, Empty, Space, Spin, Table, Tag, Typography } from 'antd'
import { RobotOutlined, BulbOutlined } from '@ant-design/icons'
import { ColumnsType } from 'antd/lib/table'
import { useMemo } from 'react'
import { getProtocol, getProtocolSetup } from '@/lib/api/fetch'
import { usePromise } from '@/lib/hooks/usePromise'

interface ProtocolAiInferredProps {
  protocolName: string
}

/**
 * AI 协议 5 段 LLM 推断详情 (决策 23 二次修订, T4)
 *
 * 数据来源:
 * - protocolMeta.remark 含 [AI-GENERATED] marker + llmInferred JSON
 *   (E 方案 c71cbed/990731d 部署后, runGenerate tool_done 时把 LLM 5 段推断
 *    JSON.stringify 到 remark)
 * - device.constants 5 段 (实际写入数据, 通过 5 次 getProtocolSetup 拿)
 *
 * 展示:
 * - 5 段 LLM 推断原始数据 (admin 可看 LLM 推断的原始 detail)
 * - 5 段 vs device.constants 实际写入对比
 * - 5 段推断质量评分 (简单启发式)
 *
 * 不渲染场景:
 * - protocolMeta.remark 不含 llmInferred 标记 (老 admin 协议 / 老 AI 协议):
 *   显示 Empty 「此协议不是 E 方案生成的, 无 AI 推断详情, 重新生成 AI 协议查看」
 */

interface LlmInferredOprateInstruct {
  name: string
  value: string
  tag?: string | null
  bl?: string
  readme?: string
}

interface LlmInferredConstant {
  [field: string]: string | null
}

interface LlmInferredShowTag {
  [index: number]: string
}
type LlmInferredShowTagArr = string[] | LlmInferredShowTag

// 安全: 把对象/数组都当数组处理
function normalizeShowTag(v: LlmInferredShowTagArr | undefined): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v
  // indexed object {0:'x',1:'y'} → ['x','y']
  return Object.keys(v).sort((a, b) => +a - +b).map(k => v[+k] as string)
}

interface LlmInferredThreshold {
  name: string
  min: number
  max: number
  unit?: string
  severity?: string
}

interface LlmInferredAlarmStat {
  name: string
  alarmStat: string[]
  value?: string
  unit?: string
}

interface LlmInferred {
  oprateInstruct?: LlmInferredOprateInstruct[]
  constant?: LlmInferredConstant
  showTag?: LlmInferredShowTagArr
  threshold?: LlmInferredThreshold[]
  alarmStat?: LlmInferredAlarmStat[]
}

const MARKER_RE = /llmInferred:\s*\{/

function parseLlmInferred(remark: string | null | undefined): LlmInferred | null {
  if (!remark) return null
  const match = remark.match(MARKER_RE)
  if (!match) return null
  const start = match.index! + match[0].length - 1 // include '{'
  // 找匹配的 '}' (简单 bracket counting)
  let depth = 0
  let inString = false
  let escape = false
  let end = -1
  for (let i = start; i < remark.length; i++) {
    const ch = remark[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break } }
  }
  if (end === -1) return null
  try {
    return JSON.parse(remark.slice(start, end)) as LlmInferred
  } catch {
    return null
  }
}

export const ProtocolAiInferred: React.FC<ProtocolAiInferredProps> = ({ protocolName }) => {
  const Protocol = usePromise(async () => {
    const el = await getProtocol(protocolName)
    return el.data
  })

  // 5 段 device.constants 实际写入 (E 方案后才有, 老 admin / 老 AI 协议返空)
  const OprateInstructActual = usePromise(async () => {
    const { data } = await getProtocolSetup<Uart.OprateInstruct>(protocolName, 'OprateInstruct')
    return data.sys
  }, [])
  const ConstantActual = usePromise(async () => {
    const { data } = await getProtocolSetup<Uart.DevConstant>(protocolName, 'Constant')
    return data.sys
  }, [])
  const ShowTagActual = usePromise(async () => {
    const { data } = await getProtocolSetup<string>(protocolName, 'ShowTag')
    return data.sys
  }, [])
  const ThresholdActual = usePromise(async () => {
    const { data } = await getProtocolSetup<Uart.Threshold>(protocolName, 'Threshold')
    return data.sys
  }, [])
  const AlarmStatActual = usePromise(async () => {
    const { data } = await getProtocolSetup<Uart.ConstantAlarmStat>(protocolName, 'AlarmStat')
    return data.sys
  }, [])

  const llmInferred = useMemo(() => parseLlmInferred(Protocol.data?.remark), [Protocol.data?.remark])

  // 不是 E 方案生成的协议 (老 admin / 老 AI)
  if (Protocol.data && !llmInferred) {
    const source = Protocol.data.source
    return (
      <Card title="AI 推断详情" bordered={false}>
        <Empty
          image={<RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description={
            <Space direction="vertical" size={8}>
              <div>
                本协议{source === 'ai-generate' || source === 'ai-chat'
                  ? '是 AI 早期生成版本'
                  : '不是 E 方案生成'}, 暂无可查看的 AI 推断详情。
              </div>
              <Typography.Text type="secondary">
                E 方案部署后 (2026-06-28), 新生成的 AI 协议会自动保存 5 段 LLM 推断原始数据到
                <Typography.Text code> Protocol.remark.llmInferred</Typography.Text>, 重新生成 AI 协议即可查看。
              </Typography.Text>
            </Space>
          }
        />
      </Card>
    )
  }

  if (!llmInferred) {
    return <Card title="AI 推断详情" bordered={false}><Spin /></Card>
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="success"
        showIcon
        icon={<RobotOutlined />}
        message="LLM 推断概览"
        description="E 方案部署后, AI 一次生成完整协议, 5 段配置全部真写入 device.constants。
                     下方展示 LLM 推断的原始数据 (来自 Protocol.remark.llmInferred), 与实际写入的 entity 数据对比, 加 5 段推断质量评分。"
      />

      {/* === OprateInstruct === */}
      <Card title={`操作指令 (LLM 推断 ${llmInferred.oprateInstruct?.length ?? 0} 条 vs 实际写入 ${OprateInstructActual.data?.length ?? 0} 条)`} bordered={false}>
        {!llmInferred.oprateInstruct?.length ? (
          <Typography.Text type="secondary">LLM 未推断操作指令</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={(llmInferred.oprateInstruct || []).map((o, i) => ({ ...o, _idx: i }))}
            columns={[
              { title: '#', render: (_, _r, i) => ++i, width: 50 },
              { title: 'name', dataIndex: 'name', width: 120 },
              { title: 'value (modbus hex)', dataIndex: 'value', width: 200 },
              { title: 'tag', dataIndex: 'tag', width: 100 },
              { title: 'bl', dataIndex: 'bl', width: 60 },
              { title: 'readme', dataIndex: 'readme' },
              {
                title: '写入状态',
                width: 100,
                render: (_, re) => {
                  const matched = OprateInstructActual.data?.some(
                    (a: any) => a.name === re.name && a.value === re.value,
                  )
                  return matched
                    ? <Tag color="green">✓ 写入</Tag>
                    : <Tag color="red">✗ 未写入</Tag>
                },
              },
            ] as ColumnsType<any>}
          />
        )}
      </Card>

      {/* === Constant === */}
      <Card title={`常量配置 (LLM 推断 ${llmInferred.constant ? Object.keys(llmInferred.constant).length : 0} fields vs 实际写入 ${ConstantActual.data ? Object.keys(ConstantActual.data).filter(k => k !== '_id').length : 0} fields)`} bordered={false}>
        {!llmInferred.constant || !Object.keys(llmInferred.constant).length ? (
          <Typography.Text type="secondary">LLM 未推断常量配置</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={Object.entries(llmInferred.constant).map(([field, value]) => ({
              field,
              llmValue: value,
              actualValue: (ConstantActual.data as any)?.[field],
            }))}
            columns={[
              { title: 'field', dataIndex: 'field', width: 200 },
              {
                title: 'LLM 推断 (dropdown 当前选中)',
                dataIndex: 'llmValue',
                render: (v) => v ? <Typography.Text code>{v}</Typography.Text> : <Typography.Text type="secondary">null</Typography.Text>,
              },
              {
                title: 'actual stored',
                dataIndex: 'actualValue',
                render: (v) => v ? <Typography.Text code>{v}</Typography.Text> : <Typography.Text type="secondary">空</Typography.Text>,
              },
              {
                title: '状态',
                width: 100,
                render: (_, re) => {
                  if (!re.llmValue) return <Tag color="default">—</Tag>
                  if (!re.actualValue) return <Tag color="orange">未写入</Tag>
                  if (re.llmValue === re.actualValue) return <Tag color="green">✓ 一致</Tag>
                  return <Tag color="red">✗ 不一致</Tag>
                },
              },
            ] as ColumnsType<any>}
          />
        )}
      </Card>

      {/* === ShowTag === */}
      {(() => {
        const showTagArr = normalizeShowTag(llmInferred.showTag)
        return (
          <Card title={`显示参数 (LLM 推断 ${showTagArr.length} 个 vs 实际写入 ${ShowTagActual.data?.length ?? 0} 个)`} bordered={false}>
            <Space wrap>
              {showTagArr.map((tag, i) => (
                <Tag key={i} color={ShowTagActual.data?.includes(tag) ? 'green' : 'orange'}>
                  {tag} {ShowTagActual.data?.includes(tag) ? '✓' : '?'}
                </Tag>
              ))}
            </Space>
            {!showTagArr.length && <Typography.Text type="secondary">LLM 未推断显示参数</Typography.Text>}
          </Card>
        )
      })()}

      {/* === Threshold === */}
      <Card title={`阈值配置 (LLM 推断 ${llmInferred.threshold?.length ?? 0} 条 vs 实际写入 ${ThresholdActual.data?.length ?? 0} 条)`} bordered={false}>
        {!llmInferred.threshold?.length ? (
          <Typography.Text type="secondary">LLM 未推断阈值配置</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={llmInferred.threshold}
            columns={[
              { title: 'name', dataIndex: 'name', width: 200 },
              { title: 'min', dataIndex: 'min', width: 80 },
              { title: 'max', dataIndex: 'max', width: 80 },
              { title: 'unit', dataIndex: 'unit', width: 80 },
              { title: 'severity', dataIndex: 'severity', width: 100 },
              {
                title: '写入状态',
                width: 100,
                render: (_, re) => {
                  const matched = ThresholdActual.data?.some(
                    (a: any) => a.name === re.name,
                  )
                  return matched ? <Tag color="green">✓ 写入</Tag> : <Tag color="red">✗</Tag>
                },
              },
            ] as ColumnsType<any>}
          />
        )}
      </Card>

      {/* === AlarmStat === */}
      <Card title={`状态配置 (LLM 推断 ${llmInferred.alarmStat?.length ?? 0} 条 vs 实际写入 ${AlarmStatActual.data?.length ?? 0} 条)`} bordered={false}>
        {!llmInferred.alarmStat?.length ? (
          <Typography.Text type="secondary">LLM 未推断状态配置</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={llmInferred.alarmStat}
            columns={[
              { title: 'name', dataIndex: 'name', width: 200 },
              {
                title: 'alarmStat (状态码数组)',
                dataIndex: 'alarmStat',
                render: (v: string[]) => (
                  <Space wrap size={4}>
                    {v.map((code, i) => <Tag key={i}>{code}</Tag>)}
                  </Space>
                ),
              },
              {
                title: '写入状态',
                width: 100,
                render: (_, re) => {
                  const matched = AlarmStatActual.data?.some(
                    (a: any) => a.name === re.name,
                  )
                  return matched ? <Tag color="green">✓ 写入</Tag> : <Tag color="red">✗</Tag>
                },
              },
            ] as ColumnsType<any>}
          />
        )}
      </Card>

      {/* === 推断质量评分 === */}
      <Card title={<Space><BulbOutlined /> LLM 推断质量评分 (admin 参考决定是否重新生成)</Space>} bordered={false}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <QualityBar
            label="OprateInstruct 完整度"
            score={
              llmInferred.oprateInstruct?.length
                ? Math.round((OprateInstructActual.data?.length ?? 0) / llmInferred.oprateInstruct.length * 100)
                : 0
            }
          />
          <QualityBar
            label="Constant 字段语义准确"
            score={
              llmInferred.constant && Object.keys(llmInferred.constant).length
                ? Math.round(
                    Object.entries(llmInferred.constant).filter(([k, v]) =>
                      v && (ConstantActual.data as any)?.[k] === v,
                    ).length / Object.keys(llmInferred.constant).length * 100,
                  )
                : 0
            }
          />
          <QualityBar
            label="Threshold 范围合理"
            score={
              llmInferred.threshold?.length
                ? Math.round((ThresholdActual.data?.length ?? 0) / llmInferred.threshold.length * 100)
                : 0
            }
          />
          <QualityBar
            label="AlarmStat 状态码完整"
            score={
              llmInferred.alarmStat?.length
                ? Math.round((AlarmStatActual.data?.length ?? 0) / llmInferred.alarmStat.length * 100)
                : 0
            }
          />
          <QualityBar
            label="ShowTag 应显示完整"
            score={
              normalizeShowTag(llmInferred.showTag).length
                ? Math.round((ShowTagActual.data?.length ?? 0) / normalizeShowTag(llmInferred.showTag).length * 100)
                : 0
            }
          />
        </Space>
      </Card>
    </Space>
  )
}

// === QualityBar sub-component (内联, 不抽 component) ===
const QualityBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#faad14' : '#ff4d4f'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 60px', gap: 12, alignItems: 'center' }}>
      <Typography.Text style={{ fontSize: 13 }}>{label}</Typography.Text>
      <div style={{ height: 8, background: '#f4f4f5', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, score)}%`, background: color, borderRadius: 4 }} />
      </div>
      <Typography.Text style={{ fontSize: 12, color: '#71717a', textAlign: 'right' }}>{score}%</Typography.Text>
    </div>
  )
}