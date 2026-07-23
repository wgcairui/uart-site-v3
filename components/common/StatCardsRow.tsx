'use client'
import React from 'react'

/**
 * StatCardsRow · 2nd row 副卡网格 (2026-07-23 抽出)
 *
 * == 作用 ==
 * PageSummary 主卡下方第二行, 4-6 张 stat-card 副卡 (auto-fit minmax 180px 网格).
 * 跟 PageSummary 区别: PageSummary 是 5-6 张主卡 hero, StatCardsRow 是 4 张更详细的副卡.
 *
 * == 设计 ==
 * - 每张卡: label + 大数值 (彩色) + 副文字 (extra) + 右上角 icon
 * - 配色: 整张 color 主色, 数值文字用 color, icon 背景 `${color}15`
 * - 跟 user/page.tsx:308-340 (用户档案 4 卡) + terminal/page.tsx:213-271 (节点数/挂载 4 卡) 共用模板
 *
 * == 抽出来 ==
 * 原本在 user/page.tsx + terminal/page.tsx 都 inline 一份 50+ 行相同模板, 抽 common/.
 * 之后 devmodel / dashboard / 其他 page 想加 2nd row 副卡直接复用.
 *
 * @example
 *   <StatCardsRow
 *     items={[
 *       { label: '共享数', value: 87, color: '#10b981', icon: <ShareAltOutlined />, extra: '12% 共享率' },
 *       ...
 *     ]}
 *     total={100}
 *   />
 */
export interface StatCardsRowItem {
    /** 标签 (中文) */
    label: string
    /** 主数值, 数字或字符串 (字符串时不计算 pct) */
    value: number | string
    /** 主色 (hex), 影响数值文字色 + icon 背景 */
    color: string
    /** 右上角 icon (antd 图标组件) */
    icon?: React.ReactNode
    /** 副文字 (例 "12% 绑定率"), 不传则 fallback `${pct}%` (pct 基于 value/total*100) */
    extra?: string | undefined
}

export const StatCardsRow: React.FC<{
    items: StatCardsRowItem[]
    /** 用于计算 fallback pct 的分母, 默认 1 (避免除 0) */
    total?: number
    /** 容器样式, 例 { marginBottom: 20 } */
    style?: React.CSSProperties
}> = ({ items, total = 1, style }) => {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                ...style,
            }}
        >
            {items.map(it => {
                const pct = typeof it.value === 'number' ? Math.round((it.value / total) * 100) : 0
                return (
                    <div key={it.label} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="stat-card-label">{it.label}</div>
                                <div className="stat-card-value" style={{ color: it.color, fontSize: 24 }}>{it.value}</div>
                                <div className="stat-card-extra">{it.extra ?? `${pct}%`}</div>
                            </div>
                            {it.icon && (
                                <div className="stat-card-icon" style={{ background: `${it.color}15`, color: it.color }}>
                                    {it.icon}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
