'use client'
import React, { useCallback, useMemo, useState } from "react";
import {
    deleteUser, getUser, sendUserSocketInfo, users as getUsers, runingState,
    loguserlogins,
} from "@/lib/api/fetchRoot"
import {
    Avatar, Button, message, Modal, Table, Tag, Space, Tooltip, Input, Spin, Collapse,
} from "antd"
import { confirm, success, info, error, warning } from '@/lib/utils/modal';
import {
    SwapOutlined, SearchOutlined, ReloadOutlined,
    EyeOutlined, DeleteOutlined, MessageOutlined,
    CloudSyncOutlined, UserAddOutlined, TeamOutlined,
    FireOutlined, ThunderboltOutlined, CrownOutlined, WechatOutlined,
    MailOutlined, PhoneOutlined, TrophyOutlined,
} from "@ant-design/icons";
import { MigrateUserResourcesModal } from "@/components/admin/MigrateUserResourcesModal";
import {
    generateTableKey,
    makeServerSearchProp,
    makeServerFilterProp,
    extractServerTableQuery,
} from '@/lib/utils/tableCommon'
import type { ColumnsType } from "antd/lib/table";
import { prompt } from "@/lib/utils/prompt";
import { usePromise } from "@/lib/hooks/usePromise";
import { useDashboardStat } from "@/lib/hooks/useDashboardStat";
import { MyCopy } from "@/components/common/MyCopy";
import { UserStat } from "@/components/data/UserStat";
import { useNav } from "@/lib/hooks/useNav";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationReq } from "@/types";
import { getUserDetailedStats } from "@/lib/api/endpoints/admin/dashboard";
import { getUserEngagement } from "@/lib/api/admin-summary/client";
import type { UserEngagementResp } from "@/types/admin-summary";
import { UserHero } from "./_components/UserHero";

type GroupFilter = 'all' | 'root' | 'admin' | 'user' | 'other'
type WxFilter = 'all' | 'wx' | 'wp' | 'none'
type RgTypeFilter = 'all' | 'pesiv' | 'wx' | 'web' | 'app'

/**
 * Admin · User 列表页 (v3 hybrid v4 设计语言 · 2026-07-17)
 *
 * 跟 user info 详情页 / admin dashboard 视觉对齐:
 * - 顶部 UserHero 紫色 aurora 渐变, 4 sub-metric
 * - PageSummary 4 stat 卡 (可点击 toggle 多选 filter)
 * - BentoCard 包裹 Table, 玻璃感
 * - 紧凑 icon 按钮操作栏, tooltip 说明
 * - 移动端响应式: bento-card 内 padding 自适应, table 横向滚动
 *
 * 路由: /admin/node/user
 * API: /api/v2/admin/users/list (paginated) + /api/v2/admin/dashboard/users/stats
 *      + /api/v2/admin/dashboard/stats (runingState)
 */
export const User: React.FC = () => {
    const nav = useNav()

    const [query, setQuery] = useState<PaginationReq>({
        page: 1,
        pageSize: 20,
        needTotal: true,
    });
    const [searchFields, setSearchFields] = useState<Record<string, string>>({});
    const [migrateOpen, setMigrateOpen] = useState(false);
    const [migrateFrom, setMigrateFrom] = useState<string | undefined>(undefined);
    const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
    const [wxFilter, setWxFilter] = useState<WxFilter>('all')
    const [rgTypeFilter, setRgTypeFilter] = useState<RgTypeFilter>('all')
    // W7: statFilter 多选叠加 (7d 活跃 toggle 用, 跟其他可点卡保持一致)
    const [statFilter, setStatFilter] = useState<string[]>([])
    const [searchKw, setSearchKw] = useState('')

    // Merged query for API: page/sort params + search keywords
    const apiQuery: PaginationReq = { ...query, search: searchFields };

    const { data: userData, loading, fecth } = usePromise(async () => {
        const { data } = await getUsers(apiQuery)
        return data as any
    }, { items: [], pagination: {} }, [JSON.stringify(apiQuery)])

    // === Server-side 全量统计 (runingState + getUserDetailedStats) ===
    // data 字段: total / rgType[] / userGroup[] / activeUsers{7d,30d} / wxBound / withMail / withTel / newUsers{7d,30d}
    // 跟 hero / PageSummary 共享, 全量不依赖当前页
    const { data: serverStats } = usePromise(async () => {
        const [s, d] = await Promise.all([runingState(), getUserDetailedStats()])
        const det = d?.data
        const groupMap: Record<string, number> = {}
        ;(det?.userGroup ?? []).forEach((it: { label: string; value: number }) => { groupMap[it.label] = (groupMap[it.label] ?? 0) + (it.value ?? 0) })
        const rgMap: Record<string, number> = {}
        ;(det?.rgType ?? []).forEach((it: { label: string; value: number }) => { rgMap[it.label] = (rgMap[it.label] ?? 0) + (it.value ?? 0) })
        return {
            // 总数: 优先用 detailedStats.total (server countDocuments), fallback runingState
            all: det?.total ?? s?.data?.User?.all ?? 0,
            online: s?.data?.User?.online ?? 0,
            // 活跃用户
            active7d: det?.activeUsers?.last7Days ?? 0,
            active30d: det?.activeUsers?.last30Days ?? 0,
            // 用户组分布
            group: {
                user: groupMap['user'] ?? 0,
                root: groupMap['root'] ?? 0,
                admin: groupMap['admin'] ?? 0,
                other: Math.max((det?.total ?? 0) - (groupMap['user'] ?? 0) - (groupMap['root'] ?? 0) - (groupMap['admin'] ?? 0), 0),
            },
            // 注册类型分布
            rgType: {
                pesiv: rgMap['pesiv'] ?? 0,
                wx: rgMap['wx'] ?? 0,
                web: rgMap['web'] ?? 0,
                app: rgMap['app'] ?? 0,
            },
            // === PR #76 新增 5 字段 (server PR #76 / e3dd670 / deploy eb769492c64d) ===
            wxBound: det?.wxBound ?? 0,
            withMail: det?.withMail ?? 0,
            withTel: det?.withTel ?? 0,
            newUsers7d: det?.newUsers?.last7Days ?? 0,
            newUsers30d: det?.newUsers?.last30Days ?? 0,
        }
    }, {
        all: 0, online: 0, active7d: 0, active30d: 0,
        group: { user: 0, root: 0, admin: 0, other: 0 },
        rgType: { pesiv: 0, wx: 0, web: 0, app: 0 },
        wxBound: 0, withMail: 0, withTel: 0, newUsers7d: 0, newUsers30d: 0,
    })

    // W7: Top 10 活跃用户 (engagement 排行 top 10)
    // useDashboardStat 期望 { data: { code, data, message? } } 包装, BFF wrapper
    // 直接返 universalResult<T>, 套一层 { data: r } 让 hook 能正确解套
    const fetchEngagement = useCallback(async () => {
        const r = await getUserEngagement(10)
        return { data: r as unknown as { code: number; data: UserEngagementResp; message?: string } }
    }, [])
    const { data: engagement } = useDashboardStat<UserEngagementResp>(fetchEngagement, [], [])
    const engagementList: UserEngagementResp = Array.isArray(engagement) ? engagement : []

    // W7-fix: 7d 活跃 filter 客户端 workaround
    // server 端 active7d filter 暂未支持 (单独 PR), 这里用 loguserlogins 拉 7d 时间窗内登录用户去重
    // 预取 (页加载时即拉, 不依赖 toggle, 避免点开卡要等 fetch)
    // 防御: fetch 失败 (e.g. 无权限) 时 active7dLoaded=false, filter 不会启用, 退化为 no-op
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const { data: loginsData, err: loginsErr } = usePromise(async () => {
        const now = Date.now()
        const r = await loguserlogins(
            new Date(now - SEVEN_DAYS_MS).toISOString(),
            new Date(now).toISOString(),
            { page: 1, pageSize: 1500, needTotal: false }
        )
        return (r as any)?.data?.items ?? []
    }, [])
    const active7dUsers = useMemo(() => {
        const s = new Set<string>()
        ;(loginsData ?? []).forEach((it: any) => {
            if (it?.user) s.add(it.user)
        })
        return s
    }, [loginsData])
    // 只有 fetch 完成 + 无 error 才算 loaded (避免半数据时 filter 误判)
    const active7dLoaded = !loginsErr && Array.isArray(loginsData)

    const users = useMemo(
        () => (userData?.items ?? []) as Uart.UserInfo[],
        [userData?.items],
    );
    const pagination = userData?.pagination ?? { total: 0 };

    // === 客户端二次过滤: userGroup / wx 状态 / rgtype / 7d 活跃 ===
    // (server 端已按 query.search 过滤, 这里只做当前页内细分)
    // 7d 活跃: 走客户端 active7dUsers Set, 仅在 data loaded + 无 err 时启用
    // (未 loaded 时 filter 不生效, 退化为 no-op, 避免半数据误判)
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (groupFilter !== 'all') {
                const g = u.userGroup || 'other'
                if (groupFilter === 'other' && (g === 'root' || g === 'admin' || g === 'user')) return false
                if (groupFilter !== 'other' && g !== groupFilter) return false
            }
            if (wxFilter !== 'all') {
                if (wxFilter === 'wx' && !u.wxId) return false
                if (wxFilter === 'wp' && !u.wpId) return false
                if (wxFilter === 'none' && (u.wxId || u.wpId)) return false
            }
            if (rgTypeFilter !== 'all' && u.rgtype !== rgTypeFilter) return false
            if (active7dLoaded && statFilter.includes('active7d') && !active7dUsers.has(u.user)) return false
            return true
        })
    }, [users, groupFilter, wxFilter, rgTypeFilter, statFilter, active7dLoaded, active7dUsers])

    const hasAnyFilter = groupFilter !== 'all' || wxFilter !== 'all' || rgTypeFilter !== 'all' || statFilter.length > 0 || Object.keys(searchFields).length > 0 || searchKw !== ''

    /**
     * 更新单个用户信息
     */
    const updateUser = async (user: string) => {
        try {
            await getUser(user)
            fecth()
            message.success('已刷新')
        } catch {
            message.error('更新失败')
        }
    }

    /**
     * 给在线用户发送消息
     */
    const sendUserInfo = (user: string) => {
        prompt({
            title: `给 [${user}] 发送消息`,
            onOk(val) {
                if (val) {
                    sendUserSocketInfo(user, val)
                }
            }
        })
    }

    /**
     * 删除用户
     */
    const deletUser = async (user: Uart.UserInfo) => {
        const p = await prompt({ title: '删除用户 ' + user.name, placeholder: '输入独立校验密码' })
        if (!p) {
            message.error('取消操作')
            return
        }
        const res = await deleteUser(user.user, p)
        if (res.code) {
            fecth()
            message.success("删除成功");
        } else {
            info({ content: res.message || "删除失败" });
        }
    }

    const handleSearch = (field: string) => (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }));
        setQuery(prev => ({ ...prev, page: 1 }));
    }

    const handleResetFilters = () => {
        setSearchFields({})
        setSearchKw('')
        setGroupFilter('all')
        setWxFilter('all')
        setRgTypeFilter('all')
        setStatFilter([])
        setQuery({ page: 1, pageSize: 20, needTotal: true })
    }

    const toggleGroup = (g: GroupFilter) => {
        setGroupFilter(prev => prev === g ? 'all' : g)
        setQuery(q => ({ ...q, page: 1 }))
    }

    const toggleWx = (w: WxFilter) => {
        setWxFilter(prev => prev === w ? 'all' : w)
    }

    const toggleRgType = (r: RgTypeFilter) => {
        setRgTypeFilter(prev => prev === r ? 'all' : r)
    }

    // W7: statFilter 多选叠加 (7d 活跃 toggle)
    const toggleStatFilter = (key: string) => {
        setStatFilter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
        setQuery(q => ({ ...q, page: 1 }))
    }

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="用户管理"
                subtitle="管理所有注册用户、迁移资源、查看分布"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '用户' },
                ]}
                extra={
                    <Space>
                        <Button
                            icon={<CloudSyncOutlined />}
                            onClick={() => {
                                setMigrateFrom(undefined)
                                setMigrateOpen(true)
                            }}
                        >
                            迁移资源
                        </Button>
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            className="btn-brand"
                            onClick={() => message.info('请联系 cairui 手动添加')}
                        >
                            添加用户
                        </Button>
                    </Space>
                }
            />

            <UserHero total={pagination.total ?? 0} />

            {/* W7: 5 张主卡用 StatCard 4-variant (filter) 替代 PageSummary
                 修 audit 里 flag 的 "不一致设计" — 7d 活跃 跟其他可点卡一样能 toggle statFilter
                 保持现有 5 列布局 (grid 5 列) */}
            <div
                className="page-summary-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 20,
                    marginBottom: 32,
                }}
            >
                <StatCard
                    kind="filter"
                    label="总用户"
                    value={serverStats.all}
                    variant="primary"
                    icon={<TeamOutlined />}
                    active={!hasAnyFilter}
                    onToggle={handleResetFilters}
                />
                <StatCard
                    kind="filter"
                    label="7d 活跃"
                    value={serverStats.active7d}
                    variant="success"
                    icon={<FireOutlined />}
                    extra={serverStats.all > 0 ? `${Math.round((serverStats.active7d / serverStats.all) * 100)}% 活跃率` : undefined}
                    active={statFilter.includes('active7d')}
                    onToggle={() => toggleStatFilter('active7d')}
                />
                <StatCard
                    kind="filter"
                    label="普通用户"
                    value={serverStats.group.user}
                    variant="success"
                    active={groupFilter === 'user'}
                    onToggle={() => toggleGroup('user')}
                />
                <StatCard
                    kind="filter"
                    label="管理员"
                    value={serverStats.group.root + serverStats.group.admin}
                    variant="warning"
                    icon={<CrownOutlined />}
                    active={groupFilter === 'root' || groupFilter === 'admin'}
                    onToggle={() => {
                        if (groupFilter === 'root' || groupFilter === 'admin') {
                            toggleGroup(groupFilter)
                        } else {
                            toggleGroup('root')
                        }
                    }}
                />
                <StatCard
                    kind="filter"
                    label="微信绑定"
                    value={serverStats.wxBound}
                    variant="info"
                    icon={<WechatOutlined />}
                    extra={serverStats.all > 0 ? `${Math.round((serverStats.wxBound / serverStats.all) * 100)}% 绑定率` : undefined}
                    active={wxFilter === 'wx' || wxFilter === 'wp'}
                    onToggle={() => toggleWx(wxFilter === 'wx' || wxFilter === 'wp' ? 'all' : 'wx')}
                />
            </div>

            {/* 用户档案 secondary stats (4 卡, server 全量) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                {([
                    { label: '已留邮箱', value: serverStats.withMail, color: '#6366f1', icon: <MailOutlined /> },
                    { label: '已留手机', value: serverStats.withTel, color: '#06b6d4', icon: <PhoneOutlined /> },
                    { label: '7d 新注册', value: serverStats.newUsers7d, color: '#a855f7', icon: <UserAddOutlined /> },
                    { label: '30d 新注册', value: serverStats.newUsers30d, color: '#7c3aed', icon: <UserAddOutlined /> },
                ] as { label: string; value: number; color: string; icon: React.ReactNode }[]).map(it => {
                    const total = serverStats.all || 1
                    const pct = Math.round((it.value / total) * 100)
                    return (
                        <div key={it.label} className="stat-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="stat-card-label">{it.label}</div>
                                    <div className="stat-card-value" style={{ color: it.color, fontSize: 24 }}>{it.value}</div>
                                    <div className="stat-card-extra">{pct}%</div>
                                </div>
                                <div className="stat-card-icon" style={{ background: `${it.color}15`, color: it.color }}>
                                    {it.icon}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* 注册类型分布: 4-col secondary stats (server 全量, 可点击 toggle filter) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                {([
                    { key: 'wx', label: '微信注册', value: serverStats.rgType.wx, color: '#10b981' },
                    { key: 'pesiv', label: '试用 (pesiv)', value: serverStats.rgType.pesiv, color: '#f43f5e' },
                    { key: 'web', label: 'Web 注册', value: serverStats.rgType.web, color: '#6366f1' },
                    { key: 'app', label: 'App 注册', value: serverStats.rgType.app, color: '#f59e0b' },
                ] as { key: RgTypeFilter; label: string; value: number; color: string }[]).map(it => {
                    const total = serverStats.all || 1
                    const pct = Math.round((it.value / total) * 100)
                    const active = rgTypeFilter === it.key
                    return (
                        <div
                            key={it.key}
                            className="stat-card stat-card-clickable"
                            onClick={() => toggleRgType(it.key)}
                            style={{
                                cursor: 'pointer',
                                outline: active ? `1px solid ${it.color}` : undefined,
                                background: active ? `${it.color}10` : undefined,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="stat-card-label">{it.label}</div>
                                    <div className="stat-card-value" style={{ color: it.color, fontSize: 24 }}>{it.value}</div>
                                    <div className="stat-card-extra">{pct}%</div>
                                </div>
                                <div className="stat-card-icon" style={{ background: `${it.color}15`, color: it.color }}>
                                    <WechatOutlined />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* W7: Top 10 活跃用户 折叠卡 (kind="navigate" 跳 user info 列表)
                 engagement 排行 top 10, 默认折叠, 点标题展开看明细, 点 StatCard 跳列表 */}
            <div className="bento-card" style={{ padding: 20, marginBottom: 20 }}>
                <Collapse
                    ghost
                    defaultActiveKey={['top-active']}
                    items={[{
                        key: 'top-active',
                        label: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>
                                <TrophyOutlined style={{ color: '#f59e0b' }} />
                                Top 10 活跃用户 · 7d 排行
                                <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 400 }}>
                                    (engagement 评分)
                                </span>
                            </div>
                        ),
                        children: (
                            <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {engagementList.length === 0 ? (
                                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-500)', fontSize: 12 }}>
                                            暂无 7d 活跃用户数据
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                            {engagementList.map((u, i) => (
                                                <div
                                                    key={u.user}
                                                    onClick={() => nav(`/admin/node/user/info/${encodeURIComponent(u.user)}`)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        background: i < 3 ? '#f59e0b10' : 'var(--ink-50)',
                                                        cursor: 'pointer',
                                                        fontSize: 12,
                                                        transition: 'background .2s',
                                                    }}
                                                >
                                                    <span style={{
                                                        width: 18, textAlign: 'center', fontFamily: 'var(--font-mono)',
                                                        fontWeight: 600,
                                                        color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--ink-500)',
                                                    }}>#{i + 1}</span>
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {u.user}
                                                    </span>
                                                    <span style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                                        设备 {u.deviceCount} · 告警 {u.alarmCount7d} · 短信 {u.smsCount7d}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* W7-fix: 删 StatCard (kind="navigate" + href="?sortBy=engagement")
                                     - "engagement" 不是 server 端 user list 接受的 sort 字段 (server 仅 createdAt/user/userGroup)
                                     - 跳同页 + cosmetic 跳转, UI 在假装, ship 出去会误导用户
                                     - Top 10 列表本身已占满 flex:1, 删右侧卡后视觉更聚焦 */}
                            </div>
                        ),
                    }]}
                />
            </div>

            <div className="bento-card" style={{ padding: 20, marginBottom: 20 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 16,
                    }}
                >
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: 'var(--ink-400)' }} />}
                        placeholder="搜索 用户 / 昵称 / 手机 / 邮箱"
                        value={searchKw}
                        onChange={(e) => {
                            const v = e.target.value
                            setSearchKw(v)
                            // allowClear 点 ✕ 时清空 v, 同步清掉已应用的 user 搜索
                            if (v === '' && searchFields.user) {
                                setSearchFields(prev => {
                                    const next = { ...prev }
                                    delete next.user
                                    return next
                                })
                                setQuery(q => ({ ...q, page: 1 }))
                            }
                        }}
                        onPressEnter={() => {
                            // 回车触发 user 搜索 (server search)
                            const next: Record<string, string> = { ...searchFields }
                            if (searchKw.trim()) next.user = searchKw.trim()
                            else delete next.user
                            setSearchFields(next)
                            setQuery(q => ({ ...q, page: 1 }))
                        }}
                        style={{ width: 280 }}
                    />

                    {/* Filter chips: userGroup */}
                    <Space size={4} wrap>
                        {(['root', 'admin', 'user', 'other'] as GroupFilter[]).map(g => (
                            <Tag.CheckableTag
                                key={g}
                                checked={groupFilter === g}
                                onChange={() => toggleGroup(g)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--ink-200)',
                                    fontSize: 12,
                                }}
                            >
                                {g === 'root' ? 'Root' : g === 'admin' ? 'Admin' : g === 'user' ? '普通' : '其他'}
                            </Tag.CheckableTag>
                        ))}
                    </Space>

                    {/* Filter chips: wx */}
                    <Space size={4} wrap>
                        {([
                            ['wx', '公众号'],
                            ['wp', '小程序'],
                            ['none', '未绑定'],
                        ] as [WxFilter, string][]).map(([w, label]) => (
                            <Tag.CheckableTag
                                key={w}
                                checked={wxFilter === w}
                                onChange={() => toggleWx(w)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--ink-200)',
                                    fontSize: 12,
                                }}
                            >
                                {label}
                            </Tag.CheckableTag>
                        ))}
                    </Space>

                    <div style={{ flex: 1 }} />

                    <Tooltip title="刷新">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fecth()}
                            shape="circle"
                        />
                    </Tooltip>
                </div>

                {/* 选中过滤条件提示 */}
                {hasAnyFilter && (
                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--ink-500)',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        <span>已应用过滤:</span>
                        {Object.entries(searchFields).map(([k, v]) => (
                            <Tag
                                key={k}
                                closable
                                onClose={(e) => {
                                    e.preventDefault()
                                    setSearchFields(prev => {
                                        const next = { ...prev }
                                        delete next[k]
                                        return next
                                    })
                                    setQuery(q => ({ ...q, page: 1 }))
                                }}
                                style={{ margin: 0 }}
                            >
                                {k}: {v}
                            </Tag>
                        ))}
                        {groupFilter !== 'all' && (
                            <Tag color="purple" closable onClose={(e) => { e.preventDefault(); toggleGroup(groupFilter) }} style={{ margin: 0 }}>
                                组: {groupFilter}
                            </Tag>
                        )}
                        {wxFilter !== 'all' && (
                            <Tag color="blue" closable onClose={(e) => { e.preventDefault(); toggleWx(wxFilter) }} style={{ margin: 0 }}>
                                微信: {wxFilter}
                            </Tag>
                        )}
                        {rgTypeFilter !== 'all' && (
                            <Tag color="cyan" closable onClose={(e) => { e.preventDefault(); toggleRgType(rgTypeFilter) }} style={{ margin: 0 }}>
                                注册: {rgTypeFilter}
                            </Tag>
                        )}
                        {statFilter.includes('active7d') && (
                            <Tag color="green" closable onClose={(e) => { e.preventDefault(); toggleStatFilter('active7d') }} style={{ margin: 0 }}>
                                近 7d 活跃
                            </Tag>
                        )}
                        <Button type="link" size="small" onClick={handleResetFilters}>
                            清除全部
                        </Button>
                    </div>
                )}

                {loading && users.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : users.length === 0 ? (
                    hasAnyFilter ? (
                        <EmptyState
                            description="当前过滤条件下没有匹配的用户"
                            actionLabel="清除过滤"
                            onAction={handleResetFilters}
                            secondaryLabel="刷新"
                            onSecondary={() => fecth()}
                        />
                    ) : (
                        <EmptyState
                            description="暂无用户数据"
                            secondaryLabel="刷新"
                            onSecondary={() => fecth()}
                        />
                    )
                ) : (
                    <Table
                        className="v3-table"
                        loading={loading}
                        dataSource={generateTableKey(filteredUsers, 'user')}
                        scroll={{ x: 1100 }}
                        pagination={{
                            current: query.page ?? 1,
                            pageSize: query.pageSize ?? 20,
                            total: pagination.total,
                            showTotal: (t) => `共 ${t} 条 · 当前 ${filteredUsers.length} 条`,
                            showSizeChanger: true,
                        }}
                        onChange={(pag, filters, sorter) => {
                            const sq = extractServerTableQuery(pag, filters, sorter);
                            setQuery(prev => ({
                                ...prev,
                                page: sq.page || 1,
                                pageSize: sq.pageSize || 20,
                                sortBy: sq.sortBy || "",
                                sortOrder: sq.sortOrder || "desc",
                                filters: sq.filters || {},
                            }));
                        }}
                        columns={[
                            {
                                key: 'online',
                                title: '状态',
                                width: 56,
                                render: (_, re) => <UserStat user={re.user} />
                            },
                            {
                                dataIndex: 'avanter',
                                title: '头像',
                                width: 52,
                                render: (img?: string) => (
                                    <Avatar
                                        src={img || undefined}
                                        size={32}
                                        style={{ background: 'var(--brand-100)', color: 'var(--brand-700)' }}
                                    >
                                        {img ? null : 'U'}
                                    </Avatar>
                                )
                            },
                            {
                                dataIndex: 'user',
                                title: '用户',
                                width: 150,
                                ellipsis: true,
                                sorter: true,
                                ...makeServerSearchProp<Uart.UserInfo>('user', handleSearch('user')),
                                render: (val) => <MyCopy value={val} />
                            },
                            {
                                dataIndex: 'name',
                                title: '昵称',
                                width: 120,
                                ellipsis: true,
                                ...makeServerSearchProp<Uart.UserInfo>('name', handleSearch('name')),
                                render: (val) => <MyCopy value={val} />
                            },
                            {
                                dataIndex: 'tel',
                                title: '手机',
                                width: 120,
                                ellipsis: true,
                                ...makeServerSearchProp<Uart.UserInfo>('tel', handleSearch('tel')),
                                render: (val) => <MyCopy value={val} />
                            },
                            {
                                dataIndex: 'mail',
                                title: '邮箱',
                                width: 160,
                                ellipsis: true,
                                ...makeServerSearchProp<Uart.UserInfo>('mail', handleSearch('mail')),
                                render: (val) => <MyCopy value={val} />
                            },
                            {
                                dataIndex: 'rgtype',
                                title: '注册',
                                width: 80,
                                ...makeServerFilterProp<Uart.UserInfo>('rgtype', ['pesiv', 'wx', 'web', 'app']),
                                render: (val) => (
                                    <Tag color={val === 'pesiv' ? 'red' : val === 'wx' ? 'green' : 'blue'}>
                                        {val}
                                    </Tag>
                                )
                            },
                            {
                                dataIndex: 'userGroup',
                                title: '用户组',
                                width: 80,
                                sorter: true,
                                ...makeServerFilterProp<Uart.UserInfo>('userGroup', ['root', 'admin', 'user']),
                                render: (val) => {
                                    const colorMap: Record<string, string> = {
                                        root: 'magenta',
                                        admin: 'red',
                                        user: 'default',
                                    }
                                    return <Tag color={colorMap[val] || 'default'}>{val}</Tag>
                                }
                            },
                            {
                                key: 'wx',
                                title: '微信',
                                width: 110,
                                render: (_, user) => {
                                    if (!user.wxId && !user.wpId) {
                                        return <span style={{ color: 'var(--ink-300)', fontSize: 11 }}>未绑定</span>
                                    }
                                    return <Space size={4}>
                                        {user.wxId && <Tag color="blue" style={{ margin: 0 }}>公众号</Tag>}
                                        {user.wpId && <Tag color="cyan" style={{ margin: 0 }}>小程序</Tag>}
                                    </Space>
                                },
                            },
                            {
                                title: '操作',
                                key: 'oprate',
                                width: 180,
                                fixed: 'right',
                                render: (_, user) => (
                                    <Space size={2} wrap>
                                        <Tooltip title="查看详情">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<EyeOutlined />}
                                                onClick={() => nav(`/admin/node/user/info/${encodeURIComponent(user.user)}`)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="更新缓存">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<ReloadOutlined />}
                                                onClick={() => updateUser(user.user)}
                                            />
                                        </Tooltip>
                                        {user.userGroup !== 'root' && (
                                            <>
                                                <Tooltip title="迁移资源">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<SwapOutlined />}
                                                        onClick={() => {
                                                            setMigrateFrom(user.user)
                                                            setMigrateOpen(true)
                                                        }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="删除">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => deletUser(user)}
                                                    />
                                                </Tooltip>
                                            </>
                                        )}
                                        <Tooltip title="发送实时消息">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<MessageOutlined />}
                                                onClick={() => sendUserInfo(user.user)}
                                            />
                                        </Tooltip>
                                    </Space>
                                )
                            }
                        ] as ColumnsType<Uart.UserInfo>}
                    />
                )}
            </div>

            <MigrateUserResourcesModal
                visible={migrateOpen}
                {...(migrateFrom ? { fromUser: migrateFrom } : {})}
                onCancel={() => {
                    setMigrateOpen(false)
                    setMigrateFrom(undefined)
                }}
                onSuccess={() => {
                    fecth()
                }}
            />
        </div>
    )
}

export default User
