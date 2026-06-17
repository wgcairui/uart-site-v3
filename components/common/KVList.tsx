'use client'
import { Card, Descriptions } from 'antd'

interface KVListItem {
  label: React.ReactNode
  value: React.ReactNode
}

interface KVListProps {
  title?: string
  items: KVListItem[]
  column?: number
}

/**
 * Key-Value 列表
 * 替代 dashboard 里重复的 Descriptions 渲染
 */
export function KVList({ title, items, column = 2 }: KVListProps) {
  return (
    <Card size="small" title={title} style={{ height: '100%' }}>
      <Descriptions column={column} size="small" bordered>
        {items.map((it, i) => (
          <Descriptions.Item label={it.label} key={i}>
            {it.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  )
}