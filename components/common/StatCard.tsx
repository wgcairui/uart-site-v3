'use client'
import { Card, Statistic } from 'antd'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  suffix?: string
  icon?: ReactNode
  color?: string
  extra?: ReactNode
  onClick?: () => void
}

/**
 * 数字统计卡片
 * - 顶部 3px 彩色边框
 * - 可点击（hover + cursor: pointer）
 * - 支持 prefix icon 和 suffix 单位
 */
export function StatCard({ title, value, suffix, icon, color = '#1890ff', extra, onClick }: StatCardProps) {
  return (
    <Card
      size="small"
      style={{
        borderTop: `3px solid ${color}`,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      hoverable={!!onClick}
    >
      <Statistic
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon && <span style={{ color }}>{icon}</span>}
            {title}
          </span>
        }
        value={value}
        suffix={suffix}
        styles={{ content: { color, fontWeight: 600 } }}
      />
      {extra}
    </Card>
  )
}