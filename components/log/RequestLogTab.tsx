'use client'

/**
 * 用户操作记录 Tab (admin 端 UserInfo 页内嵌)
 *
 * 2026-07-11 cairui 09:09 拍板 #1+2+3+4: UserJourney 业务事件追踪 + 旧 logUserRequst 双轨 30d
 * 顶部 Segmented 「操作 (journey 新) | 操作请求 (legacy 旧)」切换两种 view
 *
 * - journey 新 (默认): UserJourney list, 详情弹 JourneyDetail Modal (Timeline)
 * - legacy 旧: 跟老 logUserRequst list 一样, 保留作为 API 调用审计 fallback
 */
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Card,
    Table,
    DatePicker,
    Space,
    Tag,
    Typography,
    Modal,
    Segmented,
    Button,
    Descriptions,
    Timeline,
    Empty,
    Tooltip,
} from 'antd'
import {
    EyeOutlined,
    ToolOutlined,
    WarningOutlined,
    LoginOutlined,
    LogoutOutlined,
    CopyOutlined,
    LinkOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
    loguserjourneys,
    loguserjourneyById,
    loguserrequsts,
} from '@/lib/api/fetchRoot'
import { DesList } from '@/components/data/DesList'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import type { ColumnsType } from 'antd/lib/table'
import { message as antdMessage } from 'antd'

const { RangePicker } = DatePicker
const { Text } = Typography

interface RequestLogTabProps {
    user: string
}

type TabMode = 'journey' | 'legacy'

const JOURNEY_STATUS_COLOR: Record<Uart.UserJourneyStatus, string> = {
    active: 'blue',
    ended: 'green',
    timeout: 'red',
}
const JOURNEY_STATUS_TEXT: Record<Uart.UserJourneyStatus, string> = {
    active: '进行中',
    ended: '已结束',
    timeout: '超时',
}
const STEP_TYPE_ICON: Record<Uart.UserJourneyStepType, React.ReactNode> = {
    view: <EyeOutlined style={{ color: '#1677ff' }} />,
    operate: <ToolOutlined style={{ color: '#fa8c16' }} />,
    alarm: <WarningOutlined style={{ color: '#f5222d' }} />,
    login: <LoginOutlined style={{ color: '#52c41a' }} />,
    logout: <LogoutOutlined style={{ color: '#999' }} />,
}
const STEP_STATUS_COLOR: Record<Uart.UserJourneyStepStatus, string> = {
    ok: 'green',
    fail: 'red',
}
const STEP_STATUS_TEXT: Record<Uart.UserJourneyStepStatus, string> = {
    ok: '成功',
    fail: '失败',
}

export const RequestLogTab: React.FC<RequestLogTabProps> = ({ user }) => {
    const [mode, setMode] = useState<TabMode>('journey')
    const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ])

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <PageHeader
                    title={`${user} — 用户操作记录`}
                    breadcrumb={[
                        { title: '首页', href: '/main' },
                        { title: '用户管理', href: '/admin/node/user' },
                        { title: user },
                    ]}
                />
            </Space>
            <Space>
                <Segmented
                    options={[
                        { label: '操作 (新)', value: 'journey' },
                        { label: '操作请求 (旧)', value: 'legacy' },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as TabMode)}
                />
                <RangePicker
                    value={range}
                    onChange={(v) => v && setRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
                    allowClear={false}
                />
            </Space>
            {mode === 'journey' ? (
                <JourneyView user={user} range={range} />
            ) : (
                <LegacyView user={user} range={range} />
            )}
        </Space>
    )
}

// ─── Journey view (新) ──────────────────────────────────────────────────

const JourneyView: React.FC<{
    user: string
    range: [dayjs.Dayjs, dayjs.Dayjs]
}> = ({ user, range }) => {
    const router = useRouter()
    const [data, setData] = useState<Uart.UserJourney[]>([])
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
    const [detailId, setDetailId] = useState<string | null>(null)
    const [detail, setDetail] = useState<Uart.UserJourney | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const startTs = range[0].startOf('day').valueOf()
    const endTs = range[1].endOf('day').valueOf()

    const fetchData = async (page = 1, pageSize = 20) => {
        setLoading(true)
        try {
            const res = await loguserjourneys({
                startTs,
                endTs,
                filters: { user: [user] },
                sortBy: 'startedAt',
                sortOrder: 'desc',
                page,
                pageSize,
            })
            if (res.code === 200) {
                setData(res.data?.items ?? [])
                setPagination({
                    page: res.data?.pagination?.page ?? 1,
                    pageSize: res.data?.pagination?.pageSize ?? 20,
                    total: res.data?.pagination?.total ?? 0,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, startTs, endTs])

    const onDetail = async (journeyId: string) => {
        setDetailId(journeyId)
        setDetailLoading(true)
        try {
            const res = await loguserjourneyById(journeyId)
            if (res.code === 200) {
                setDetail(res.data)
            } else {
                antdMessage.error(res.message || '加载失败')
                setDetail(null)
            }
        } finally {
            setDetailLoading(false)
        }
    }

    const summary = useMemo(() => {
        const total = data.length
        const active = data.filter((j) => j.status === 'active').length
        const ended = data.filter((j) => j.status === 'ended').length
        const timeout = data.filter((j) => j.status === 'timeout').length
        return { total, active, ended, timeout }
    }, [data])

    const columns: ColumnsType<Uart.UserJourney> = useMemo(
        () => [
            {
                title: 'Journey ID',
                dataIndex: 'journeyId',
                key: 'journeyId',
                width: 220,
                render: (id: string) => (
                    <Space size="small">
                        <code style={{ fontSize: 12 }}>
                            {id.slice(0, 8)}…{id.slice(-4)}
                        </code>
                        <Tooltip title="复制完整 ID">
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => {
                                    navigator.clipboard.writeText(id)
                                    antdMessage.success('已复制')
                                }}
                            />
                        </Tooltip>
                    </Space>
                ),
            },
            {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 90,
                render: (s: Uart.UserJourneyStatus) => (
                    <Tag color={JOURNEY_STATUS_COLOR[s]}>{JOURNEY_STATUS_TEXT[s]}</Tag>
                ),
            },
            {
                title: '开始',
                dataIndex: 'startedAt',
                key: 'startedAt',
                width: 170,
                render: (v: Date | string) =>
                    v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
            },
            {
                title: '结束',
                dataIndex: 'endedAt',
                key: 'endedAt',
                width: 170,
                render: (v: Date | string | null | undefined) =>
                    v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : <Tag>进行中</Tag>,
            },
            {
                title: '步数',
                dataIndex: 'stepCount',
                key: 'stepCount',
                width: 70,
                render: (n: number) => <Tag>{n}</Tag>,
            },
            {
                title: '操作',
                key: 'actions',
                width: 100,
                fixed: 'right',
                render: (_, record) => (
                    <Button type="link" size="small" onClick={() => onDetail(record.journeyId)}>
                        详情
                    </Button>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user]
    )

    return (
        <>
            <PageSummary
                items={[
                    { label: 'Journey 总数', value: summary.total, variant: 'primary' },
                    { label: '进行中', value: summary.active, variant: 'info' },
                    { label: '已结束', value: summary.ended, variant: 'success' },
                    { label: '超时', value: summary.timeout, variant: 'danger' },
                ]}
            />
            <Card size="small">
                <Table<Uart.UserJourney>
                    size="small"
                    loading={loading}
                    dataSource={data}
                    rowKey="journeyId"
                    columns={columns}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (t) => `共 ${t} 条`,
                    }}
                    onChange={(pag) => fetchData(pag.current, pag.pageSize)}
                />
            </Card>
            <Modal
                title={
                    detail ? (
                        <Space>
                            <span>Journey 详情</span>
                            <code style={{ fontSize: 12, color: '#999' }}>
                                {detail.journeyId}
                            </code>
                        </Space>
                    ) : (
                        'Journey 详情'
                    )
                }
                open={!!detailId}
                onCancel={() => {
                    setDetailId(null)
                    setDetail(null)
                }}
                footer={null}
                width={760}
                loading={detailLoading}
                destroyOnClose
            >
                {detail ? (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="用户">
                                {detail.user} ({detail.userGroup})
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={JOURNEY_STATUS_COLOR[detail.status]}>
                                    {JOURNEY_STATUS_TEXT[detail.status]}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="开始">
                                {dayjs(detail.startedAt).format('YYYY-MM-DD HH:mm:ss')}
                            </Descriptions.Item>
                            <Descriptions.Item label="结束">
                                {detail.endedAt
                                    ? dayjs(detail.endedAt).format('YYYY-MM-DD HH:mm:ss')
                                    : '进行中'}
                            </Descriptions.Item>
                            <Descriptions.Item label="步数" span={2}>
                                {detail.stepCount}
                            </Descriptions.Item>
                        </Descriptions>
                        <div>
                            <Text strong>事件时间线 ({detail.steps?.length ?? 0})</Text>
                            {detail.steps && detail.steps.length > 0 ? (
                                <Timeline
                                    style={{ marginTop: 12 }}
                                    items={detail.steps.map((step, i) => {
                                        const relatedOp = step.relatedOpId
                                        return {
                                            // mongoose subdoc _id (sibling 实测 prod response 必返)
                                            // key 用 step._id 优先 (更 unique), fallback step.ts (toString 防 Date 不在 Key 类型)
                                            key: step._id ?? (typeof step.ts === 'string' ? step.ts : new Date(step.ts).toISOString()) ?? i,
                                            dot: STEP_TYPE_ICON[step.type],
                                            color: STEP_STATUS_COLOR[step.status],
                                            children: (
                                                <Space
                                                    orientation="vertical"
                                                    size={4}
                                                    style={{ width: '100%' }}
                                                >
                                                    <Space wrap>
                                                        <Tag color="blue">{step.type}</Tag>
                                                        <Tag
                                                            color={STEP_STATUS_COLOR[step.status]}
                                                        >
                                                            {STEP_STATUS_TEXT[step.status]}
                                                        </Tag>
                                                        <Text strong>{step.label}</Text>
                                                        {step.deviceMac && (
                                                            <Tag>{step.deviceMac}</Tag>
                                                        )}
                                                        {step.durationMs !== undefined && (
                                                            <Text
                                                                type="secondary"
                                                                style={{ fontSize: 12 }}
                                                            >
                                                                {step.durationMs}ms
                                                            </Text>
                                                        )}
                                                    </Space>
                                                    <Space size="small">
                                                        <Text
                                                            type="secondary"
                                                            style={{ fontSize: 12 }}
                                                        >
                                                            {dayjs(step.ts).format(
                                                                'YYYY-MM-DD HH:mm:ss.SSS',
                                                            )}
                                                        </Text>
                                                        {relatedOp && (
                                                            <Tooltip title="跳转到该操作 (admin 操作历史)">
                                                                <Button
                                                                    type="link"
                                                                    size="small"
                                                                    icon={<LinkOutlined />}
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/admin/node/user/info/${user}?tab=scheduled-op&opId=${relatedOp}`,
                                                                        )
                                                                    }
                                                                >
                                                                    关联操作
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </Space>
                                                </Space>
                                            ),
                                        }
                                    })}
                                />
                            ) : (
                                <Empty description="无 steps" style={{ marginTop: 12 }} />
                            )}
                        </div>
                    </Space>
                ) : (
                    <Empty description="加载失败" />
                )}
            </Modal>
        </>
    )
}

// ─── Legacy view (旧) ──────────────────────────────────────────────────

const LegacyView: React.FC<{
    user: string
    range: [dayjs.Dayjs, dayjs.Dayjs]
}> = ({ user, range }) => {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
    const [detailModal, setDetailModal] = useState<{ open: boolean; record: any }>({
        open: false,
        record: null,
    })

    const fetchData = async (page = 1, pageSize = 20) => {
        setLoading(true)
        try {
            const res = await loguserrequsts(
                range[0].format('YYYY-MM-DD'),
                range[1].format('YYYY-MM-DD'),
                { page, pageSize },
            )
            if (res.code === 200) {
                const filtered = (res.data?.items || []).filter(
                    (item: any) => item.user === user,
                )
                setData(filtered)
                setPagination({
                    page: res.data?.pagination?.page || 1,
                    pageSize: res.data?.pagination?.pageSize || 20,
                    total: filtered.length,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, range[0].valueOf(), range[1].valueOf()])

    const columns = [
        {
            dataIndex: 'type',
            title: '请求类型',
            width: 120,
            render: (v: string) => <Tag color="blue">{v}</Tag>,
        },
        {
            dataIndex: 'msg',
            title: '消息',
            ellipsis: true,
        },
        {
            dataIndex: 'timeStamp',
            title: '时间',
            width: 180,
            render: (v: number) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
        },
    ]

    return (
        <Card size="small">
            <Table
                size="small"
                loading={loading}
                dataSource={data}
                rowKey={(record: any) => record._id || data.indexOf(record)}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total: number) => `共 ${total} 条`,
                }}
                onChange={(pag) => fetchData(pag.current, pag.pageSize)}
                columns={columns as any}
                onRow={(record) => ({
                    onClick: () => setDetailModal({ open: true, record }),
                    style: { cursor: 'pointer' },
                })}
                expandable={{
                    expandedRowRender: (li: any) => (
                        <DesList title="argument" data={li.argument} />
                    ),
                }}
            />
            <Modal
                title="请求详情 (旧)"
                open={detailModal.open}
                onCancel={() => setDetailModal({ open: false, record: null })}
                footer={null}
            >
                {detailModal.record && (
                    <Space
                        orientation="vertical"
                        style={{ width: '100%' }}
                        size="middle"
                    >
                        <div>
                            <Text style={{ color: 'rgba(0,0,0,0.45)' }}>用户</Text>
                            <div>{detailModal.record.user}</div>
                        </div>
                        <div>
                            <Text style={{ color: 'rgba(0,0,0,0.45)' }}>请求类型</Text>
                            <div>{detailModal.record.type}</div>
                        </div>
                        <div>
                            <Text style={{ color: 'rgba(0,0,0,0.45)' }}>消息</Text>
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {detailModal.record.msg}
                            </div>
                        </div>
                        <div>
                            <Text style={{ color: 'rgba(0,0,0,0.45)' }}>时间</Text>
                            <div>
                                {dayjs(detailModal.record.timeStamp).format(
                                    'YYYY-MM-DD HH:mm:ss',
                                )}
                            </div>
                        </div>
                        <div>
                            <Text style={{ color: 'rgba(0,0,0,0.45)' }}>参数</Text>
                            <div>
                                <DesList title="" data={detailModal.record.argument} />
                            </div>
                        </div>
                    </Space>
                )}
            </Modal>
        </Card>
    )
}