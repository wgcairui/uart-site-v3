'use client'
import {
    DownOutlined, ReloadOutlined, TeamOutlined, WechatOutlined,
    ManOutlined, WomanOutlined, UserDeleteOutlined, LinkOutlined,
    SearchOutlined, SyncOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Input, message, Modal, Space, Spin, Table, Tag, Tooltip } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { update_wx_users_all, wx_send_info, wx_users } from '@/lib/api/fetchRoot'
import { extractServerTableQuery, generateTableKey, makeServerSearchProp } from '@/lib/utils/tableCommon'
import { EmptyState } from '@/components/common/EmptyState'
import { MyCopy } from '@/components/common/MyCopy'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { usePromise } from '@/lib/hooks/usePromise'
import { PaginationReq, V2ListResponse } from '@/types'

/**
 * Admin · 公众号用户列表 (v3 hybrid v4 设计语言 · 2026-07-17)
 *
 * 跟 user/info 详情页 / admin dashboard 视觉对齐:
 * - PageHeader 面包屑 + 操作区
 * - PageSummary 4 stat 卡 (本页统计, 注意 WX 无 server stats endpoint)
 * - BentoCard 包裹 Table, 玻璃感
 * - EmptyState 空态降级
 * - 紧凑 icon 按钮操作栏
 *
 * 路由: /admin/wx/users
 * API: /api/v2/admin/wx/users/list (paginated, 无 server stats)
 */
export const WxUser: React.FC = () => {
    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true })
    const [searchFields, setSearchFields] = useState<Record<string, string>>({})
    const [searchKw, setSearchKw] = useState('')
    const apiQuery: PaginationReq = { ...query, search: searchFields }

    const { data: userData, loading, fecth } = usePromise<V2ListResponse<Uart.WX.userInfoPublic>>(async () => {
        const { data } = await wx_users(apiQuery)
        return data as V2ListResponse<Uart.WX.userInfoPublic>
    }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [JSON.stringify(apiQuery)])

    const data = useMemo(() => userData?.items ?? [], [userData])
    const pagination = userData?.pagination ?? { total: 0 }

    // 本页统计: 关注/取关/性别/UnionID 分布
    // (server 端无 wx stats endpoint, 这里只统计当前页可见数据)
    const pageStats = useMemo(() => {
        const subscribed = data.filter(u => u.subscribe === 1).length
        const unsubscribed = data.filter(u => u.subscribe === 0).length
        const male = data.filter(u => u.sex === 1).length
        const female = data.filter(u => u.sex === 2).length
        const unknown = data.filter(u => u.sex !== 1 && u.sex !== 2).length
        const withUnionid = data.filter(u => !!u.unionid).length
        return { subscribed, unsubscribed, male, female, unknown, withUnionid }
    }, [data])

    /**
     * 更新所有用户
     */
    const updateUsers = () => {
        Modal.confirm({
            content: '确定更新微信用户库?更新将耗时3~10分钟',
            onOk() {
                const now = Date.now()
                message.loading({ key: 'update_wx_users_all', content: 'loading...' })
                update_wx_users_all().then(() => {
                    message.success({
                        content: 'update success,耗时:' + ((Date.now() - now) / 1000).toFixed(0) + '秒',
                        key: 'update_wx_users_all',
                    })
                    fecth()
                })
            },
        })
    }

    /**
     * 发送测试信息
     */
    const alarmTest = (openid: string) => {
        Modal.confirm({
            content: '确定发送测试信息?',
            onOk() {
                wx_send_info(0, openid).then(() => {
                    message.success('send success,请注意查收')
                })
            },
        })
    }

    const handleSearch = (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }))
        setQuery(prev => ({ ...prev, page: 1 }))
    }

    const handleResetFilters = () => {
        setSearchFields({})
        setSearchKw('')
        setQuery({ page: 1, pageSize: 20, needTotal: true })
    }

    const hasAnyFilter = Object.keys(searchFields).length > 0 || searchKw !== ''

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="公众号用户"
                subtitle="查看所有关注公众号的用户信息"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '公众号用户' },
                ]}
                extra={
                    <Space>
                        <Tooltip title="刷新">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => fecth()}
                                shape="circle"
                            />
                        </Tooltip>
                        <Button
                            type="primary"
                            icon={<SyncOutlined />}
                            className="btn-brand"
                            onClick={updateUsers}
                        >
                            更新用户库
                        </Button>
                    </Space>
                }
            />

            <PageSummary
                column={4}
                items={[
                    {
                        label: '公众号总用户',
                        value: pagination.total ?? 0,
                        variant: 'primary',
                        icon: <TeamOutlined />,
                        extra: 'server 端总数',
                        active: !hasAnyFilter,
                        onClick: handleResetFilters,
                    },
                    {
                        label: '本页 · 已关注',
                        value: pageStats.subscribed,
                        variant: 'success',
                        icon: <WechatOutlined />,
                        extra: data.length > 0 ? `${Math.round((pageStats.subscribed / data.length) * 100)}% 本页占比` : undefined,
                    },
                    {
                        label: '本页 · 已取关',
                        value: pageStats.unsubscribed,
                        variant: 'warning',
                        icon: <UserDeleteOutlined />,
                        extra: data.length > 0 ? `${Math.round((pageStats.unsubscribed / data.length) * 100)}% 本页占比` : undefined,
                    },
                    {
                        label: '本页 · 有 UnionID',
                        value: pageStats.withUnionid,
                        variant: 'info',
                        icon: <LinkOutlined />,
                        extra: data.length > 0 ? `${Math.round((pageStats.withUnionid / data.length) * 100)}% 本页占比` : undefined,
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
                        placeholder="搜索 昵称 / OpenID / UnionID"
                        value={searchKw}
                        onChange={(e) => {
                            const v = e.target.value
                            setSearchKw(v)
                            if (v === '' && (searchFields.nickname || searchFields.openid || searchFields.unionid)) {
                                setSearchFields(prev => {
                                    const next = { ...prev }
                                    delete next.nickname
                                    delete next.openid
                                    delete next.unionid
                                    return next
                                })
                                setQuery(q => ({ ...q, page: 1 }))
                            }
                        }}
                        onPressEnter={() => {
                            const next: Record<string, string> = { ...searchFields }
                            if (searchKw.trim()) {
                                // 智能匹配: 不区分字段, 优先 nickname
                                next.nickname = searchKw.trim()
                            } else {
                                delete next.nickname
                            }
                            setSearchFields(next)
                            setQuery(q => ({ ...q, page: 1 }))
                        }}
                        style={{ width: 280 }}
                    />

                    <div style={{ flex: 1 }} />
                </div>

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
                        <Button type="link" size="small" onClick={handleResetFilters}>
                            清除全部
                        </Button>
                    </div>
                )}

                {loading && data.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : data.length === 0 ? (
                    hasAnyFilter ? (
                        <EmptyState
                            description="当前过滤条件下没有匹配的公众号用户"
                            actionLabel="清除过滤"
                            onAction={handleResetFilters}
                            secondaryLabel="刷新"
                            onSecondary={() => fecth()}
                        />
                    ) : (
                        <EmptyState
                            description="暂无公众号用户数据"
                            actionLabel="更新用户库"
                            onAction={updateUsers}
                            secondaryLabel="刷新"
                            onSecondary={() => fecth()}
                        />
                    )
                ) : (
                    <Table
                        className="v3-table"
                        loading={loading}
                        dataSource={generateTableKey(data, 'openid')}
                        rowKey="openid"
                        scroll={{ x: 1100 }}
                        pagination={{
                            current: query.page ?? 1,
                            pageSize: query.pageSize ?? 20,
                            total: pagination.total,
                            showTotal: t => `共 ${t} 条`,
                            showSizeChanger: true,
                        }}
                        onChange={(pag, filters, sorter) => {
                            const sq = extractServerTableQuery(pag, filters, sorter)
                            setQuery(prev => ({
                                ...prev,
                                page: sq.page,
                                pageSize: sq.pageSize,
                                sortBy: sq.sortBy,
                                sortOrder: sq.sortOrder,
                                filters: sq.filters,
                            } as any))
                        }}
                        columns={
                            [
                                {
                                    title: '头像',
                                    dataIndex: 'headimgurl',
                                    width: 60,
                                    render: val => <Avatar src={val || null} size={38} />,
                                },
                                {
                                    dataIndex: 'nickname',
                                    title: '昵称',
                                    ...makeServerSearchProp('nickname', handleSearch),
                                    render: val => <MyCopy value={val}></MyCopy>,
                                },
                                {
                                    dataIndex: 'openid',
                                    title: 'OpenID',
                                    ...makeServerSearchProp('openid', handleSearch),
                                    render: val => <MyCopy value={val}></MyCopy>,
                                },
                                {
                                    dataIndex: 'unionid',
                                    title: 'UnionID',
                                    ...makeServerSearchProp('unionid', handleSearch),
                                    render: val => val ? <MyCopy value={val} /> : <span style={{ color: 'var(--ink-300)' }}>—</span>,
                                },
                                {
                                    dataIndex: 'sex',
                                    title: '性别',
                                    width: 80,
                                    render: val => {
                                        if (val === 1) return <Tag color="blue" style={{ margin: 0 }}><ManOutlined /> 男</Tag>
                                        if (val === 2) return <Tag color="magenta" style={{ margin: 0 }}><WomanOutlined /> 女</Tag>
                                        return <span style={{ color: 'var(--ink-300)', fontSize: 12 }}>未知</span>
                                    },
                                },
                                {
                                    dataIndex: 'subscribe',
                                    title: '状态',
                                    width: 90,
                                    render: val => val === 1
                                        ? <Tag color="success" style={{ margin: 0 }}>已关注</Tag>
                                        : <Tag color="warning" style={{ margin: 0 }}>已取关</Tag>,
                                },
                                {
                                    key: 'region',
                                    title: '地区',
                                    render: (_, user) => {
                                        const parts = [user.country, user.province, user.city].filter(Boolean)
                                        return parts.length > 0 ? parts.join(' · ') : '—'
                                    },
                                },
                                {
                                    dataIndex: 'subscribe_time',
                                    title: '关注时间',
                                    width: 120,
                                    render: val => val ? dayjs(val * 1000).format('YYYY-MM-DD') : '—',
                                },
                                {
                                    key: 'test',
                                    title: '操作',
                                    width: 100,
                                    fixed: 'right',
                                    render: (_, user) => (
                                        <Dropdown
                                            menu={{
                                                items: [
                                                    {
                                                        key: 'test',
                                                        label: <Button type="text" size="small" onClick={() => alarmTest(user.openid)} style={{ width: '100%', textAlign: 'left' }}>告警推送测试</Button>,
                                                    },
                                                ],
                                            }}
                                        >
                                            <Button type="text" size="small">
                                                测试 <DownOutlined />
                                            </Button>
                                        </Dropdown>
                                    ),
                                },
                            ] as ColumnsType<Uart.WX.userInfoPublic>
                        }
                    />
                )}
            </div>
        </div>
    )
}

export default WxUser
