'use client'
import { Divider } from 'antd'
import type { ReactNode } from 'react'

interface SectionTitleProps {
  icon?: ReactNode
  title: string
}

/**
 * 带 icon 的 section 标题
 * 用 antd Divider titlePlacement="left" 实现分隔线效果
 */
export function SectionTitle({ icon, title }: SectionTitleProps) {
  return (
    <Divider titlePlacement="left" style={{ fontSize: 15, fontWeight: 600 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {title}
      </span>
    </Divider>
  )
}