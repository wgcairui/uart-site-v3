'use client'

import { Alert, Space, Typography } from 'antd'
import { RobotOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons'

/**
 * AI 协议 5 种 constants 配置缺失提示（2026-06-28 决策 24 + E 方案降级修订）
 *
 * 触发场景（3 种）：
 * 1. 老 AI 协议（生成时未配置 5 段，remark 无 llmInferred JSON） — 强提示「老 AI 协议需手动添加 / 重新生成」
 * 2. c71cbed 部署后新 AI 协议（仅 Threshold 真写入，4 段 LLM 推断 free-form 存 remark） — 中提示
 * 3. E 方案部署后新 AI 协议（5 段真写入） — 仅在某 tab 数据仍空时显示弱提示「LLM 未推断出」
 *
 * 不渲染条件：
 * - source 非 AI（admin 手动维护）→ null
 * - source 为 AI 但 data 非空 → null（已生成，不需提示）
 */

interface AiProtocolEmptyProps {
  /** tab 中文名：「操作指令」/「常量配置」/「显示参数」/「阈值配置」/「状态配置」 */
  typeName: string
  /** 后端 setup type：「OprateInstruct」/「Constant」/「ShowTag」/「Threshold」/「AlarmStat」 */
  typeKey: string
  /** 协议名，显示在提示里方便定位 */
  protocolName: string
  /** 协议 source（来自 protocol.source 字段） */
  source?: 'admin' | 'ai-generate' | 'ai-chat' | undefined
  /** 协议 remark（fallback marker 解析 + llmInferred JSON 检测） */
  remark?: string | null | undefined
  /** 当前 tab 数据是否为空（true 才显示） */
  empty: boolean
}

const MARKER_RE = /<!--\s*AI-GENERATED\s+/

function isAiSource(source: AiProtocolEmptyProps['source'], remark?: string | null): boolean {
  if (source === 'ai-generate' || source === 'ai-chat') return true
  // fallback: 兼容老数据没 source 字段但 remark 有 marker
  if (!source && remark && MARKER_RE.test(remark)) return true
  return false
}

/**
 * 判断老 AI 协议（生成时未配置 5 段）
 *
 * - 老 AI 协议特征：source 是 ai-generate/ai-chat + remark 不含 llmInferred JSON 标记
 * - c71cbed / E 方案部署后生成的新 AI 协议：remark 含 `llmInferred:` 标记
 *
 * @returns true 表示老 AI 协议（生成时未配置此项）
 */
function isLegacyAiProtocol(source: AiProtocolEmptyProps['source'], remark?: string | null): boolean {
  if (source !== 'ai-generate' && source !== 'ai-chat') return false
  if (!remark) return true // 没 remark 一定是老的
  return !remark.includes('llmInferred:')
}

export function AiProtocolEmpty({
  typeName,
  typeKey,
  protocolName,
  source,
  remark,
  empty,
}: AiProtocolEmptyProps) {
  // 非 AI 协议 → 不渲染
  if (!isAiSource(source, remark)) return null
  // 有数据 → 不渲染（AI 协议但 LLM 推断了此项，正常显示）
  if (!empty) return null

  const isLegacy = isLegacyAiProtocol(source, remark)

  // 老 AI 协议：强提示（橙色 History icon + 明确告知「老版本未配置」）
  if (isLegacy) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<HistoryOutlined />}
        style={{ marginBottom: 16 }}
        message={
          <Space size={8}>
            <strong>{typeName}</strong>
            <span style={{ color: '#999' }}>· 老 AI 协议，生成时未配置此项</span>
          </Space>
        }
        description={
          <>
            协议 <Typography.Text code>{protocolName}</Typography.Text> 是 AI{' '}
            {source === 'ai-chat' ? '修改' : '生成'}的早期版本，当时未输出{' '}
            <Typography.Text code>{typeKey}</Typography.Text> 配置。你可以：
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>
                <EditOutlined /> <strong>手动添加下方内容</strong>并「上传保存」
              </li>
              <li>
                <RobotOutlined /> <strong>重新生成</strong>：新版 AI 已支持按设备协议输出 5 种配置（操作指令 / 常量配置 / 显示参数 / 阈值配置 / 状态配置），重新生成会自动填充
              </li>
            </ul>
          </>
        }
      />
    )
  }

  // 新 AI 协议（c71cbed / E 方案部署后生成）但当前 tab 数据空（LLM 推断失败该段）
  // 弱提示：info 蓝色，告知 LLM 推断失败
  return (
    <Alert
      type="info"
      showIcon
      icon={<RobotOutlined />}
      style={{ marginBottom: 16 }}
      message={
        <Space size={8}>
          <strong>{typeName}</strong>
          <span style={{ color: '#999' }}>· LLM 未推断出此项配置</span>
        </Space>
      }
      description={
        <>
          协议 <Typography.Text code>{protocolName}</Typography.Text> 由 AI{' '}
          {source === 'ai-chat' ? '修改' : '生成'}，但 LLM 推断时未输出{' '}
          <Typography.Text code>{typeKey}</Typography.Text> 配置（可能源文档不完整或类型不匹配）。你可以：
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>
              <EditOutlined /> <strong>手动添加下方内容</strong>并「上传保存」
            </li>
            <li>
              <RobotOutlined /> 重新生成并提供更完整的源文档
            </li>
          </ul>
        </>
      }
    />
  )
}
