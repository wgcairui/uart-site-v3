'use client'
import React, { useMemo, useState } from "react";
import {
    deleteUser, getUser, sendUserSocketInfo, users as getUsers, runingState,
} from "@/lib/api/fetchRoot"
import {
    Avatar, Button, message, Modal, Table, Tag, Space, Tooltip, Input, Spin,
} from "antd";
import {
    SwapOutlined, SearchOutlined, ReloadOutlined,
    EyeOutlined, DeleteOutlined, MessageOutlined,
    CloudSyncOutlined, UserAddOutlined, TeamOutlined,
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
import { MyCopy } from "@/components/common/MyCopy";
import { UserStat } from "@/components/data/UserStat";
import { useNav } from "@/lib/hooks/useNav";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary } from "@/components/common/PageSummary";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationReq } from "@/types";
import { getUserStats } from "@/lib/api/endpoints/admin/dashboard";
import { UserHero } from "./_components/UserHero";

type GroupFilter = 'all' | 'root' | 'admin' | 'user' | 'other'
type WxFilter = 'all' | 'wx' | 'wp' | 'none'

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
    const [searchKw, setSearchKw] = useState('')

    // Merged query for API: page/sort params + search keywords
    const apiQuery: PaginationReq = { ...query, search: searchFields };

    const { data: userData, loading, fecth } = usePromise(async () => {
        const { data } = await getUsers(apiQuery)
        return data as any
    }, { items: [], pagination: {} }, [JSON.stringify(apiQuery)])

    // === Server-side 全量统计 (runingState + getUserStats) — 跟 hero 共享数据源, PageSummary 用全量而非当前页 ===
    const { data: serverStats } = usePromise(async () => {
        const [s, g] = await Promise.all([runingState(), getUserStats()])
        const groupMap: Record<string, number> = {}
        const list = (g?.data as any[]) || []
        list.forEach((it: any) => { groupMap[it.type] = (groupMap[it.type] ?? 0) + (it.value ?? 0) })
        return {
            all: s?.data?.User?.all ?? 0,
            online: s?.data?.User?.online ?? 0,
            group: {
                user: groupMap['user'] ?? 0,
                root: groupMap['root'] ?? 0,
                admin: groupMap['admin'] ?? 0,
                other: Math.max((s?.data?.User?.all ?? 0) - (groupMap['user'] ?? 0) - (groupMap['root'] ?? 0) - (groupMap['admin'] ?? 0), 0),
            },
        }
    }, { all: 0, online: 0, group: { user: 0, root: 0, admin: 0, other: 0 } })

    const users = useMemo(
        () => (userData?.items ?? []) as Uart.UserInfo[],
        [userData?.items],
    );
    const pagination = userData?.pagination ?? { total: 0 };

    // === 客户端二次过滤: userGroup / wx 状态 ===
    // (server 端已按 query.search 过滤, 这里只做当前页内细分)
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
            return true
        })
    }, [users, groupFilter, wxFilter])

    // === 当前页内的派生统计 (仅 wx 绑定 / 邮箱用 current page 计数, 因为 server 没现成 endpoint) ===
    const pageStats = useMemo(() => {
        const wxBound = users.filter(u => u.wxId || u.wpId).length
        const withMail = users.filter(u => !!u.mail).length
        return { wxBound, withMail, total: serverStats.all || pagination.total || 0 }
    }, [users, serverStats.all, pagination.total])

    const hasAnyFilter = groupFilter !== 'all' || wxFilter !== 'all' || Object.keys(searchFields).length > 0 || searchKw !== ''

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
            Modal.info({ content: res.message || "删除失败" });
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
        setQuery({ page: 1, pageSize: 20, needTotal: true })
    }

    const toggleGroup = (g: GroupFilter) => {
        setGroupFilter(prev => prev === g ? 'all' : g)
        setQuery(q => ({ ...q, page: 1 }))
    }

    const toggleWx = (w: WxFilter) => {
        setWxFilter(prev => prev === w ? 'all' : w)
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

            <PageSummary
                items={[
                    {
                        label: '总用户',
                        value: pageStats.total,
                        variant: 'primary',
                        icon: <TeamOutlined />,
                        active: !hasAnyFilter,
                        onClick: handleResetFilters,
                    },
                    {
                        label: '普通用户',
                        value: serverStats.group.user,
                        variant: 'success',
                        active: groupFilter === 'user',
                        onClick: () => toggleGroup('user'),
                    },
                    {
                        label: '微信绑定',
                        value: pageStats.wxBound,
                        variant: 'info',
                        active: wxFilter === 'wx' || wxFilter === 'wp',
                        onClick: () => toggleWx(wxFilter === 'wx' || wxFilter === 'wp' ? 'all' : 'wx'),
                    },
                    {
                        label: '已留邮箱',
                        value: pageStats.withMail,
                        variant: 'warning',
                        active: false,
                    },
                ]}
            />

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
