'use client'
import { Form, Space, Tag, Tooltip } from 'antd'

/**
 * 解析 unit 字符串为 code→label 映射 (纯函数, 不依赖 Form context)
 * - '{0:正常,1:异常,2:未知}' → {'0':'正常','1':'异常','2':'未知'}
 * - 空/格式不对 → {}
 */
export function parseUnitStateMap(unit: string): Record<string, string> {
    if (!unit || !/^{.*}$/.test(unit.trim())) return {}
    try {
        const objUnit = unit
            .replaceAll('{', '{"')
            .replaceAll(':', '":"')
            .replaceAll(',', '","')
            .replaceAll('}', '"}')
        return JSON.parse(objUnit) as Record<string, string>
    } catch {
        return {}
    }
}

interface Props {
  /** form 里 unit 字段的 name (Form.useWatch 拿值) */
  name: string
}

/**
 * unit 字段状态值映射预览 (2026-06-28 新增)
 * 解析 unit 字符串 (`{0:正常,1:异常,2:未知}`) → Tag 列表预览
 *
 * 跟 ProtocolInstructFormrizeParse 解析逻辑一致:
 *   - '{0:正常,1:异常,2:未知}' → [{'0','正常'}, {'1','异常'}, {'2','未知'}]
 *   - 空/格式不对 → 不渲染
 *
 * 用法: <Form.Item name="unit"><Input.TextArea /></Form.Item>
 *       <UnitStatePreview name="unit" />  ← 紧跟下面
 */
export function UnitStatePreview({ name }: Props) {
  return (
    <Form.Item shouldUpdate={(prev, cur) => prev[name] !== cur[name]} noStyle>
      {({ getFieldValue }) => {
        const unit: string = getFieldValue(name) || ''
        return <UnitStatePreviewFromUnit unit={unit} inline />
      }}
    </Form.Item>
  )
}

/**
 * 纯函数版 — 给非 Form 场景用 (比如本地协议只读 Table)
 * unit: '{0:正常,1:异常,2:未知}'
 * inline: true → 紧凑横排 (无 margin) | false → 块级 div
 */
export function UnitStatePreviewFromUnit({ unit, inline }: { unit: string; inline?: boolean }) {
    const entries = Object.entries(parseUnitStateMap(unit || ''))
    if (!entries.length) return null

    const tags = (
        <Space wrap size={4}>
            {entries.map(([code, label]) => (
                <Tag key={code} color="geekblue" style={{ fontSize: 12 }}>
                    <strong style={{ marginRight: 4 }}>{code}</strong>
                    <span style={{ opacity: 0.85 }}>= {label}</span>
                </Tag>
            ))}
        </Space>
    )

    if (inline) {
        // 表单内联版: 紧跟 unit TextArea 下方, 带 tooltip 提示
        return (
            <div style={{ marginTop: -12, marginBottom: 16, fontSize: 12 }}>
                <Tooltip title="unit 字段自动解析为状态值映射预览 (admin 可参考这个映射配置告警状态码)">
                    <span style={{ color: '#999', marginRight: 8 }}>状态值映射预览:</span>
                </Tooltip>
                {tags}
            </div>
        )
    }
    // 只读版: 直接渲染 Tag 列表
    return <>{tags}</>
}