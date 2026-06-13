'use client'
import { Card, Col, Row, Space } from 'antd'
import type { ReactNode } from 'react'

/** 语义配色变体 — 与 antd 设计 token 对齐 */
export type SummaryVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const VARIANT_COLOR: Record<SummaryVariant, string> = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#fa8c16',
  danger: '#ff4d4f',
  info: '#13c2c2',
  purple: '#722ed1',
}

export interface PageSummaryItem {
  /** 标签文字 */
  label: string
  /** 主数值 */
  value: ReactNode
  /** 副标签（如"昨日新增 +12"） */
  extra?: ReactNode
  /**
   * 顶部边框颜色：
   * - variant: 用预定义语义色（推荐）
   * - 字符串 hex: 自定义颜色
   * - 不传: 默认 primary
   */
  color?: string
  /** variant 优先级低于 color，两者都传时用 color */
  variant?: SummaryVariant
  /** 是否被选中（用于叠加筛选时高亮） */
  active?: boolean
  /** 是否可点击（hover + pointer + 点击效果） */
  onClick?: () => void
}

interface PageSummaryProps {
  items: PageSummaryItem[]
  /** 列数：默认 lg={6} md={12} xs={24} */
  column?: number
}

function resolveColor(item: PageSummaryItem): string {
  if (item.color) return item.color
  if (item.variant) return VARIANT_COLOR[item.variant]
  return VARIANT_COLOR.primary
}

/**
 * 页面顶部汇总卡（横排）
 * 替代旧版 `<Divider plain>标题 / {total}</Divider>` 风格
 *
 * 用法：
 *   <PageSummary
 *     items={[
 *       { label: '用户总数', value: 690, variant: 'primary' },
 *       { label: '7天活跃', value: 17, variant: 'success' },
 *       { label: '未处理告警', value: 12, variant: 'danger',
 *         onClick: () => navigate('/admin/log/alarm') },
 *     ]}
 *   />
 *
 * 叠加筛选（与 Table 联动）：
 *   const [activeFilter, setActiveFilter] = useState<string | null>(null)
 *   <PageSummary
 *     items={stats.map(s => ({
 *       label: s.type, value: s.value, variant: 'info',
 *       active: activeFilter === s.type,
 *       onClick: () => setActiveFilter(activeFilter === s.type ? null : s.type),
 *     }))}
 *   />
 */
export function PageSummary({ items, column = 6 }: PageSummaryProps) {
  if (items.length === 0) return null

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {items.map((it, i) => {
        const color = resolveColor(it)
        return (
          <Col key={i} xs={24} sm={12} md={12} lg={column}>
            <Card
              size="small"
              hoverable={!!it.onClick}
              onClick={it.onClick}
              style={{
                borderTop: `3px solid ${color}`,
                cursor: it.onClick ? 'pointer' : 'default',
                background: it.active ? `${color}10` : undefined,
                outline: it.active ? `1px solid ${color}` : undefined,
                transition: 'background 0.2s, outline 0.2s',
              }}
            >
              <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ color: '#7c8aa0', fontSize: 12 }}>{it.label}</div>
                <div
                  style={{
                    color,
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {it.value}
                </div>
                {it.extra && (
                  <div style={{ fontSize: 12, color: '#7c8aa0' }}>{it.extra}</div>
                )}
              </Space>
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}

/** 导出供其他组件复用 */
export { VARIANT_COLOR }