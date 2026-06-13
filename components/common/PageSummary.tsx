'use client'
import { Card, Col, Row, Space } from 'antd'
import type { ReactNode } from 'react'

export interface PageSummaryItem {
  /** 标签文字 */
  label: string
  /** 主数值 */
  value: ReactNode
  /** 副标签（如"昨日新增 +12"） */
  extra?: ReactNode
  /** 顶部边框颜色（默认蓝） */
  color?: string
  /** 是否可点击（hover + pointer） */
  onClick?: () => void
}

interface PageSummaryProps {
  items: PageSummaryItem[]
  /** 列数：默认 lg={6} md={12} xs={24} */
  column?: number
}

/**
 * 页面顶部汇总卡（横排）
 * 替代旧版 `<Divider plain>标题 / {total}</Divider>` 风格
 *
 * 用法：
 *   <PageSummary
 *     items={[
 *       { label: '用户总数', value: 690, color: '#1890ff' },
 *       { label: '7天活跃', value: 17, color: '#52c41a' },
 *     ]}
 *   />
 */
export function PageSummary({ items, column = 6 }: PageSummaryProps) {
  if (items.length === 0) return null

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {items.map((it, i) => (
        <Col key={i} xs={24} sm={12} md={12} lg={column}>
          <Card
            size="small"
            hoverable={!!it.onClick}
            onClick={it.onClick}
            style={{
              borderTop: `3px solid ${it.color || '#1890ff'}`,
              cursor: it.onClick ? 'pointer' : 'default',
            }}
          >
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <div style={{ color: '#7c8aa0', fontSize: 12 }}>{it.label}</div>
              <div style={{ color: it.color || '#1890ff', fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
                {it.value}
              </div>
              {it.extra && <div style={{ fontSize: 12, color: '#7c8aa0' }}>{it.extra}</div>}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  )
}