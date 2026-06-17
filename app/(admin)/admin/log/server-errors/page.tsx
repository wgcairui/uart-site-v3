'use client'

/**
 * admin server-error 记录查看页面
 * server: midwayuartserver feat/admin-server-errors PR #28
 * 字段名权威源: midwayuartserver/src/module/log/entity/server-error-record.entity.ts
 *
 * 5 维筛选 + 7 列表格 + Drawer 详情
 * - 列表 filters: status/method/userId/userGroup/errorName/requestId (exact $in)
 * - 列表 search: handler/errorMessage/url (regex 模糊)
 * - 时间窗: RangePicker 默认 24h, 31 天上限 server 强制
 * - 详情 Drawer: stack (pre) / body (pre) / params (pre) / extra.headers (KV)
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
    Button,
    Card,
    Checkbox,
    DatePicker,
    Descriptions,
    Drawer,
    Input,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { logservererrorById, logservererrors } from '@/lib/api/endpoints/admin/logs'
import type { V2ListResponse } from '@/types'

const { RangePicker } = DatePicker
const { Text } = Typography

// status → antd tag 颜色
const STATUS_COLOR = (s: number): string => {
    if (s >= 500) return 'red'
    if (s >= 400) return 'orange'
    if (s >= 300) return 'blue'
    return 'green'
}

const METHOD_COLOR: Record<string, string> = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    PATCH: 'purple',
    DELETE: 'red',
}

// userGroup → 颜色
const USER_GROUP_COLOR: Record<string, string> = {
    root: 'red',
    admin: 'orange',
    user: 'blue',
    guest: 'default',
    test: 'purple',
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const USER_GROUPS = ['root', 'admin', 'user', 'guest', 'test']

interface FilterState {
    status: string[]
    method: string[]
    userGroup: string[]
    errorName: string[]
    userId: string
    requestId: string
    handler: string
    errorMessage: string
    url: string
}

const EMPTY_FILTER: FilterState = {
    status: [],
    method: [],
    userGroup: [],
    errorName: [],
    userId: '',
    requestId: '',
    handler: '',
    errorMessage: '',
    url: '',
}

export const ServerErrorsPage: React.FC = () => {
    // 时间范围默认 24h
    const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(24, 'hour'),
        dayjs(),
    ])
    // 噪音过滤默认开启: 5xx only / 业务 URL / 非 GET
    const [hideNonServerErrors, setHideNonServerErrors] = useState(true)
    const [hideInfraPolling, setHideInfraPolling] = useState(true)
    const [hideClientSide4xx, setHideClientSide4xx] = useState(true)
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [data, setData] = useState<Uart.ServerErrorRecord[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    // 详情 Drawer
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailRecord, setDetailRecord] = useState<Uart.ServerErrorRecord | null>(null)

    // 触发刷新的签名 (filters + range + page + 噪音 toggle)
    const querySig = useMemo(
        () =>
            JSON.stringify({
                start: range[0].valueOf(),
                end: range[1].valueOf(),
                f: filters,
                page,
                pageSize,
                hideNonServerErrors,
                hideInfraPolling,
                hideClientSide4xx,
            }),
        [range, filters, page, pageSize, hideNonServerErrors, hideInfraPolling, hideClientSide4xx],
    )

    const fetchList = async () => {
        setLoading(true)
        try {
            // 拼 search (regex 模糊)
            const search: Record<string, string> = {}
            if (filters.handler) search.handler = filters.handler
            if (filters.errorMessage) search.errorMessage = filters.errorMessage
            if (filters.url) search.url = filters.url
            // 默认隐藏 socket.io polling + 静态资源 (url 不以 /api/v2 开头)
            if (hideInfraPolling && !filters.url) {
                search.url = '^/api/v2'
            }

            // 拼 filters (exact $in, service 端会转 number for status)
            const f: Record<string, string[]> = {}
            if (filters.status.length) f.status = filters.status
            if (filters.method.length) f.method = filters.method
            if (filters.userGroup.length) f.userGroup = filters.userGroup
            if (filters.errorName.length) f.errorName = filters.errorName
            if (filters.userId) f.userId = [filters.userId]
            if (filters.requestId) f.requestId = [filters.requestId]
            // 默认只看 5xx
            if (hideNonServerErrors && !filters.status.length) {
                f.status = ['500', '502', '503', '504']
            }
            // 默认排除 GET (polling/cron/heartbeat 多是 GET)
            if (hideClientSide4xx && !filters.method.length) {
                f.method = ['POST', 'PUT', 'PATCH', 'DELETE']
            }

            const res = await logservererrors({
                startTs: range[0].valueOf(),
                endTs: range[1].valueOf(),
                filters: f as any,
                search,
                sortBy: 'timeStamp',
                sortOrder: 'desc',
                page,
                pageSize,
            })
            if (res.code === 200) {
                const items = (res.data?.items ?? []) as Uart.ServerErrorRecord[]
                setData(Array.isArray(items) ? items : [])
                setTotal(res.data?.pagination?.total ?? 0)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [querySig])

    const openDetail = async (record: Uart.ServerErrorRecord) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailRecord(record) // 先用列表行展示, 详情拉回来覆盖
        try {
            const res = await logservererrorById(record.requestId)
            if (res.code === 200 && res.data) {
                setDetailRecord(res.data as Uart.ServerErrorRecord)
            }
        } finally {
            setDetailLoading(false)
        }
    }

    const columns = useMemo(
        () => [
            {
                dataIndex: 'timeStamp',
                title: '时间',
                width: 160,
                render: (v: number) => (
                    <Text style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                        {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                ),
            },
            {
                dataIndex: 'method',
                title: '方法',
                width: 70,
                render: (v: string) => <Tag color={METHOD_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
                dataIndex: 'url',
                title: 'URL',
                width: 280,
                ellipsis: true,
                render: (v: string) => (
                    <Text style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>{v}</Text>
                ),
            },
            {
                dataIndex: 'status',
                title: '状态',
                width: 80,
                render: (v: number) => <Tag color={STATUS_COLOR(v)}>{v}</Tag>,
            },
            {
                dataIndex: 'errorName',
                title: '错误类型',
                width: 140,
                render: (v: string) => <Tag>{v}</Tag>,
            },
            {
                dataIndex: 'errorMessage',
                title: '错误信息',
                ellipsis: true,
                render: (v: string) => (
                    <Text style={{ fontSize: 12 }}>{v}</Text>
                ),
            },
            {
                dataIndex: 'handler',
                title: 'Handler',
                width: 200,
                ellipsis: true,
                render: (v?: string) =>
                    v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
            },
        ],
        [],
    )

    // 触发 fetchList
    const handleSearch = () => {
        setPage(1)
        // 改变 querySig 通过 setState (filters 已 set)
    }

    const handleReset = () => {
        setFilters(EMPTY_FILTER)
        setHideNonServerErrors(true)
        setHideInfraPolling(true)
        setHideClientSide4xx(true)
        setPage(1)
    }

    // status 多选标签显示
    const statusOptions = useMemo(() => {
        // 4xx + 5xx 几个高频 status
        return [400, 401, 403, 404, 500, 502, 503].map((s) => ({
            value: String(s),
            label: (
                <Tag color={STATUS_COLOR(s)} style={{ margin: 0 }}>
                    {s}
                </Tag>
            ),
        }))
    }, [])

    // errorName 多选: 高频枚举 + 允许自定义 (Select tags)
    const errorNameOptions = [
        { value: 'TypeError', label: 'TypeError' },
        { value: 'QueryFailedError', label: 'QueryFailedError' },
        { value: 'ValidationError', label: 'ValidationError' },
        { value: 'MidwayValidation', label: 'MidwayValidation' },
        { value: 'HttpException', label: 'HttpException' },
    ]

    return (
        <>
            <PageHeader title="服务端错误日志" breadcrumb={[{ title: '日志' }]} />

            <PageSummary
                items={[
                    { label: '当前查询总数', value: total, variant: 'danger' },
                    {
                        label: '5xx',
                        value: data.filter((d) => d.status >= 500).length,
                        variant: 'danger',
                    },
                    {
                        label: '4xx',
                        value: data.filter((d) => d.status >= 400 && d.status < 500).length,
                        variant: 'warning',
                    },
                    {
                        label: '本页',
                        value: data.length,
                        variant: 'info',
                    },
                ]}
            />

            <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: 12 } }}>
                <Space wrap size="middle">
                    <Space size={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            时间
                        </Text>
                        <RangePicker
                            value={range}
                            onChange={(v) => {
                                if (v && v[0] && v[1]) {
                                    setRange([v[0], v[1]])
                                    setPage(1)
                                }
                            }}
                            showTime={{ format: 'HH:mm' }}
                            allowClear={false}
                        />
                    </Space>

                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="状态"
                        style={{ minWidth: 160 }}
                        value={filters.status}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, status: v }))}
                        options={statusOptions}
                        maxTagCount="responsive"
                    />

                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="方法"
                        style={{ minWidth: 140 }}
                        value={filters.method}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, method: v }))}
                        options={HTTP_METHODS.map((m) => ({
                            value: m,
                            label: <Tag color={METHOD_COLOR[m] ?? 'default'} style={{ margin: 0 }}>{m}</Tag>,
                        }))}
                        maxTagCount="responsive"
                    />

                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="用户组"
                        style={{ minWidth: 120 }}
                        value={filters.userGroup}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, userGroup: v }))}
                        options={USER_GROUPS.map((g) => ({
                            value: g,
                            label: (
                                <Tag color={USER_GROUP_COLOR[g] ?? 'default'} style={{ margin: 0 }}>
                                    {g}
                                </Tag>
                            ),
                        }))}
                        maxTagCount="responsive"
                    />

                    <Select
                        mode="tags"
                        allowClear
                        placeholder="错误类型 (可输入新值)"
                        style={{ minWidth: 200 }}
                        value={filters.errorName}
                        onChange={(v: string[]) => setFilters((f) => ({ ...f, errorName: v }))}
                        options={errorNameOptions}
                        maxTagCount="responsive"
                    />

                    <Input
                        placeholder="userId"
                        style={{ width: 180 }}
                        value={filters.userId}
                        onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                        allowClear
                    />

                    <Input
                        placeholder="requestId (UUID)"
                        style={{ width: 220 }}
                        value={filters.requestId}
                        onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
                        allowClear
                    />

                    <Input
                        placeholder="handler (模糊)"
                        style={{ width: 200 }}
                        value={filters.handler}
                        onChange={(e) => setFilters((f) => ({ ...f, handler: e.target.value }))}
                        allowClear
                    />

                    <Input
                        placeholder="errorMessage (模糊)"
                        style={{ width: 200 }}
                        value={filters.errorMessage}
                        onChange={(e) => setFilters((f) => ({ ...f, errorMessage: e.target.value }))}
                        allowClear
                    />

                    <Input
                        placeholder="url (模糊)"
                        style={{ width: 200 }}
                        value={filters.url}
                        onChange={(e) => setFilters((f) => ({ ...f, url: e.target.value }))}
                        allowClear
                    />

                    <Space size={4}>
                        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                            搜索
                        </Button>
                        <Button onClick={handleReset}>重置</Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchList} />
                    </Space>

                    <Space size={8} style={{ marginLeft: 8 }}>
                        <Checkbox
                            checked={hideNonServerErrors}
                            onChange={(e) => {
                                setHideNonServerErrors(e.target.checked)
                                setPage(1)
                            }}
                        >
                            只看 5xx
                        </Checkbox>
                        <Checkbox
                            checked={hideInfraPolling}
                            onChange={(e) => {
                                setHideInfraPolling(e.target.checked)
                                setPage(1)
                            }}
                        >
                            隐藏 socket / 静态资源
                        </Checkbox>
                        <Checkbox
                            checked={hideClientSide4xx}
                            onChange={(e) => {
                                setHideClientSide4xx(e.target.checked)
                                setPage(1)
                            }}
                        >
                            排除 GET
                        </Checkbox>
                    </Space>
                </Space>
            </Card>

            <Card size="small" styles={{ body: { padding: 0 } }}>
                <Table
                    size="small"
                    loading={loading}
                    dataSource={data as any}
                    rowKey="_id"
                    columns={columns as any}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        pageSizeOptions: ['20', '50', '100', '200'],
                        showTotal: (t: number) => `共 ${t} 条`,
                    }}
                    onChange={(pag) => {
                        setPage(pag.current ?? 1)
                        setPageSize(pag.pageSize ?? 20)
                    }}
                    onRow={(record: any) => ({
                        onClick: () => openDetail(record),
                        style: { cursor: 'pointer' },
                    })}
                    scroll={{ x: 1100 }}
                />
            </Card>

            <Drawer
                title={
                    detailRecord ? (
                        <Space>
                            <Tag color={STATUS_COLOR(detailRecord.status)}>
                                {detailRecord.status}
                            </Tag>
                            <Tag color={METHOD_COLOR[detailRecord.method] ?? 'default'}>
                                {detailRecord.method}
                            </Tag>
                            <Text
                                type="secondary"
                                style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}
                            >
                                {detailRecord.url}
                            </Text>
                        </Space>
                    ) : (
                        '错误详情'
                    )
                }
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                size="large"
                loading={detailLoading}
                destroyOnHidden
            >
                {detailRecord && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                        <Descriptions
                            size="small"
                            column={2}
                            bordered
                            items={[
                                { key: 'timeStamp', label: '时间', children: dayjs(detailRecord.timeStamp).format('YYYY-MM-DD HH:mm:ss.SSS') },
                                { key: 'requestId', label: 'requestId', children: <Text code copyable>{detailRecord.requestId}</Text> },
                                { key: 'userId', label: 'userId', children: detailRecord.userId ?? '—' },
                                { key: 'userGroup', label: '用户组', children: detailRecord.userGroup ? <Tag color={USER_GROUP_COLOR[detailRecord.userGroup] ?? 'default'}>{detailRecord.userGroup}</Tag> : '—' },
                                { key: 'ip', label: 'IP', children: detailRecord.ip ?? '—' },
                                { key: 'handler', label: 'Handler', children: detailRecord.handler ?? '—' },
                                { key: 'errorName', label: '错误名', children: <Tag>{detailRecord.errorName}</Tag> },
                                {
                                    key: 'errorMessage',
                                    label: '错误信息',
                                    children: (
                                        <Text style={{ wordBreak: 'break-all' }}>
                                            {detailRecord.errorMessage}
                                        </Text>
                                    ),
                                    span: 2,
                                },
                            ]}
                        />

                        {detailRecord.params !== undefined && (
                            <Section title="Params (GET query, post-sanitize)" data={detailRecord.params} />
                        )}
                        {detailRecord.body !== undefined && (
                            <Section title="Body (POST body, post-sanitize)" data={detailRecord.body} />
                        )}
                        {detailRecord.extra?.headers && (
                            <Section
                                title="Headers"
                                data={detailRecord.extra.headers}
                                kv
                            />
                        )}

                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Stack
                            </Text>
                            <pre
                                style={{
                                    background: '#fafafa',
                                    border: '1px solid #f0f0f0',
                                    padding: 12,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    maxHeight: 320,
                                    overflow: 'auto',
                                }}
                            >
                                {detailRecord.stack}
                            </pre>
                        </div>

                        {detailRecord.dropped && (
                            <Tag color="red">⚠️ 落库失败标记: {detailRecord.dropped}</Tag>
                        )}
                    </Space>
                )}
            </Drawer>
        </>
    )
}

const Section: React.FC<{ title: string; data: any; kv?: boolean }> = ({ title, data, kv }) => (
    <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
            {title}
        </Text>
        {kv ? (
            <Descriptions
                size="small"
                column={1}
                bordered
                items={Object.entries(data).map(([k, v]) => ({
                    key: k,
                    label: k,
                    children: Array.isArray(v) ? v.join(', ') : String(v ?? '—'),
                }))}
            />
        ) : (
            <pre
                style={{
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 240,
                    overflow: 'auto',
                }}
            >
                {JSON.stringify(data, null, 2)}
            </pre>
        )}
    </div>
)

export default ServerErrorsPage