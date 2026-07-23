'use client'
import React from 'react'

/**
 * StatSection · bento-card 包装的统计子区 (2026-07-23 抽出)
 *
 * == 作用 ==
 * PageSummary 之外的下钻统计展示: 头部 icon 32×32 + 标题 + 总数,
 * 内部 auto-fit 网格渲染每条 `{type, value}` 数据, 显示 value + 占总比%.
 *
 * == 设计 ==
 * - 配色: 整块 color 主色 (16% alpha 头部底 + 8% alpha 每条底 + 16% alpha 边)
 * - 跟 user 页"注册类型行"视觉对齐 (stat-card 风格)
 * - 跟 devmodel / terminal stats tab 共用
 *
 * == 抽出来 ==
 * 原本在 app/(admin)/admin/node/terminal/page.tsx:181-266 inline, 因为主页有
 * 4 个 instance + 后续 user / dashboard 可能复用, 抽 common/.
 *
 * @example
 *   <StatSection title="在线分布" icon={<ApiOutlined />} data={stats.onlines} color="#10b981" />
 */
export const StatSection: React.FC<{
    /** 标题 (中文) */
    title: string
    /** 头部 icon (antd 图标组件) */
    icon: React.ReactNode
    /** 分布数据, server `$group by xxx` 返回 */
    data: { type: string; value: number }[]
    /** 主色 (hex), 影响头部底色 + 每条 stat-card 边框/底色 */
    color: string
}> = ({ title, icon, data, color }) => {
    const total = data.reduce((s, x) => s + x.value, 0)
    return (
        <div className="bento-card" style={{ padding: 20, height: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--ink-100)',
                }}
            >
                <span
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${color}1a`,
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                    }}
                >
                    {icon}
                </span>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{title}</h3>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>共 {total}</span>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                }}
            >
                {data.map(item => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                    return (
                        <div
                            key={item.type}
                            className="stat-card"
                            style={{
                                padding: 14,
                                background: `${color}08`,
                                border: `1px solid ${color}1a`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                                <span
                                    className="app-kv-label"
                                    style={{ fontFamily: 'ui-monospace, monospace', textTransform: 'none', letterSpacing: 0 }}
                                >
                                    {item.type}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: 'var(--ink-900)',
                                    fontVariantNumeric: 'tabular-nums',
                                    lineHeight: 1.1,
                                }}
                            >
                                {item.value}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{pct}%</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
