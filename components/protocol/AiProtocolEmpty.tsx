'use client'

import { Alert, Space, Typography } from 'antd'
import { RobotOutlined, EditOutlined } from '@ant-design/icons'

/**
 * AI 协议 5 种 constants 配置缺失提示（2026-06-28 决策 24）
 *
 * 触发场景：
 * - 当前协议由 AI 生成（source='ai-generate' 或 'ai-chat'，或老数据 remark 含 AI-GENERATED marker）
 * - 当前 tab 数据为空（`getProtocolSetup` 返 sys=[] / undefined）
 *
 * 设计原则：
 * - **不阻塞 admin 操作**：form + 表格仍可用，admin 可手动填 + 上传
 * - **明确告知原因**：AI 生成时 LLM 未推断出此项配置
 * - **指引下一步**：手动添加 或 重新生成时在 hint 中要求 LLM 输出
 * - **后续 uart-server 升级后**（PR feat/ai 5 段扩 schema）新 AI 协议自动有 5 段，
 *   此提示自然消失，不需调整 UI
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
  /** 协议 remark（fallback marker 解析） */
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

  return (
    <Alert
      type="info"
      showIcon
      icon={<RobotOutlined />}
      style={{ marginBottom: 16 }}
      message={
        <Space size={8}>
          <strong>{typeName}</strong>
          <span style={{ color: '#999' }}>· AI 生成协议暂未配置此项</span>
        </Space>
      }
      description={
        <>
          协议 <Typography.Text code>{protocolName}</Typography.Text> 由 AI{' '}
          {source === 'ai-chat' ? '修改' : '生成'}，但 LLM 推断时未输出{' '}
          <Typography.Text code>{typeKey}</Typography.Text> 配置。你可以：
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>
              <EditOutlined /> <strong>手动添加下方内容</strong>并「上传保存」
            </li>
            <li>
              <RobotOutlined /> 重新生成 AI 协议时在 hint 中明确要求 LLM 输出此项
            </li>
          </ul>
        </>
      }
    />
  )
}
