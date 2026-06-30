'use client'

/**
 * 定时操作列表 + 详情 (2026-06-30 决策 18 第一阶段)
 *
 * 通用组件, admin / user 两端都可用:
 * - api: 'admin' | 'user' 决定 list / cancel / trigger / delete 走哪一组 endpoint
 * - fixedMac: 可选, 锁定 list 查询的 mac 过滤 (用于 "设备详情页 tab" 场景)
 * - showCreate: 是否显示 "新建定时操作" 按钮 (admin 端默认 true, user 端在 dev 详情页 context 中由父级管理)
 */
import {
    Button,
    Descriptions,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    message,
} from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { usePromise } from '@/lib/hooks/usePromise'
import {
    makeServerFilterProp,
    makeServerSearchProp,
} from '@/lib/utils/tableCommon'
import { PaginationReq, universalResult, V2ListResponse } from '@/types'
import {
    cancelScheduledOp,
    listScheduledOps,
    triggerScheduledOp,
    deleteScheduledOp,
} from '@/lib/api/fetchRoot'
import {
    cancelUserScheduledOp,
    deleteUserScheduledOp,
    listUserScheduledOps,
    triggerUserScheduledOp,
} from '@/lib/api/fetch'
import { Post } from '@/lib/api/fetch'

interface ScheduledOpTableProps {
    api: 'admin' | 'user'
    fixedMac?: string
    /** user 端可选, 父级在点击「新建定时操作」时唤起此回调 (由于 user 端没有 mac/pid 上下文) */
    onCreate?: () => void
}

const STATUS_COLOR: Record<Uart.ScheduledOpStatus, string> = {
    PENDING: 'blue',
    RUNNING: 'gold',
    SUCCESS: 'green',
    FAILED: 'red',
    CANCELED: 'default',
}
const STATUS_TEXT: Record<Uart.ScheduledOpStatus, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消',
}
const NOTIFY_STATUS_TEXT: Record<Uart.ScheduledOpNotifyStatus, string> = {
    PENDING: '待发送',
    DISPATCHED: '已发送',
    SKIPPED: '未配置通道',
}
const CHANNEL_TEXT: Record<string, string> = {
    wx: '微信',
    mail: '邮件',
    sms: '短信',
}

export const ScheduledOpTable: React.FC<ScheduledOpTableProps> = ({ api, fixedMac, onCreate }) => {
    const [query, setQuery] = useState<PaginationReq>({
        page: 1,
        pageSize: 20,
        needTotal: true,
        sortBy: 'scheduledAt',
        sortOrder: 'desc',
    })
    const [searchFields, setSearchFields] = useState<Record<string, string>>({})
    const [filterFields, setFilterFields] = useState<Record<string, string[]>>({})
    const [detailOp, setDetailOp] = useState<Uart.ScheduledOperation | null>(null)

    const listFn = api === 'admin' ? listScheduledOps : listUserScheduledOps
    const apiQuery: PaginationReq = {
        ...query,
        ...(Object.keys(searchFields).length ? { search: searchFields } : {}),
        ...(Object.keys(filterFields).length ? { filters: filterFields } : {}),
    }

    const { data, loading, fecth } = usePromise<
        V2ListResponse<Uart.ScheduledOperation>
    >(
        async () => {
            const { data } = await listFn(apiQuery)
            // fixedMac 强制 server-side 过滤 (防御性, 后端也可能强制)
            let items = data?.items ?? []
            if (fixedMac) items = items.filter((el) => el.mac === fixedMac)
            return {
                items,
                pagination: data?.pagination ?? {
                    page: 1,
                    pageSize: 20,
                    hasNext: false,
                    hasPrev: false,
                },
            }
        },
        { items: [], pagination: { page: 1, pageSize: 20, hasNext: false, hasPrev: false, total: 0, totalPages: 0 } },
        [JSON.stringify(apiQuery), fixedMac]
    )

    const items = data?.items ?? []
    const pagination = data?.pagination ?? {}

    const handleAction = async (
        kind: 'cancel' | 'trigger' | 'delete',
        op: Uart.ScheduledOperation
    ) => {
        const fn =
            kind === 'cancel'
                ? api === 'admin'
                    ? cancelScheduledOp
                    : cancelUserScheduledOp
                : kind === 'trigger'
                ? api === 'admin'
                    ? triggerScheduledOp
                    : triggerUserScheduledOp
                : api === 'admin'
                ? deleteScheduledOp
                : deleteUserScheduledOp
        const res = await (fn as any)(op._id)
        if (res.code) {
            message.success(
                kind === 'cancel'
                    ? '已取消'
                    : kind === 'trigger'
                    ? '已触发'
                    : '已删除'
            )
            fecth()
        } else {
            message.error(res.message || '操作失败')
        }
    }

    const columns: ColumnsType<Uart.ScheduledOperation> = useMemo(
        () => [
            {
                title: '计划时间',
                dataIndex: 'scheduledAt',
                key: 'scheduledAt',
                width: 170,
                render: (ts: number) =>
                    ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-',
                sorter: true,
            },
            {
                title: '设备',
                dataIndex: 'mac',
                key: 'mac',
                width: 130,
                ...makeServerSearchProp<Uart.ScheduledOperation>('mac', (s) => {
                    setSearchFields((p) => ({ ...p, ...s }))
                    setQuery((q) => ({ ...q, page: 1 }))
                }),
            },
            {
                title: 'pid',
                dataIndex: 'pid',
                key: 'pid',
                width: 60,
            },
            {
                title: '协议',
                dataIndex: 'protocol',
                key: 'protocol',
                width: 120,
            },
            {
                title: '指令',
                dataIndex: 'content',
                key: 'content',
                width: 200,
                ellipsis: true,
                render: (text: string) => (
                    <Tooltip title={text}>
                        <code style={{ fontSize: 12 }}>{text}</code>
                    </Tooltip>
                ),
            },
            {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 90,
                render: (s: Uart.ScheduledOpStatus) => (
                    <Tag color={STATUS_COLOR[s]}>{STATUS_TEXT[s]}</Tag>
                ),
                ...makeServerFilterProp<Uart.ScheduledOperation>(
                    'status',
                    Object.keys(STATUS_COLOR)
                ),
                onFilter: (value, record) => record.status === value,
            },
            {
                title: '通知',
                dataIndex: 'notifiedChannels',
                key: 'notifiedChannels',
                width: 110,
                render: (channels: string[]) => {
                    if (!channels || channels.length === 0) return '-'
                    return channels
                        .map((c) => CHANNEL_TEXT[c] || c)
                        .join(' / ')
                },
            },
            {
                title: '创建人',
                dataIndex: 'createdBy',
                key: 'createdBy',
                width: 120,
                ...makeServerSearchProp<Uart.ScheduledOperation>('createdBy', (s) => {
                    setSearchFields((p) => ({ ...p, ...s }))
                    setQuery((q) => ({ ...q, page: 1 }))
                }),
            },
            {
                title: '操作',
                key: 'actions',
                width: 240,
                fixed: 'right',
                render: (_, op) => (
                    <Space size="small" wrap>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => setDetailOp(op)}
                        >
                            详情
                        </Button>
                        {(op.status === 'PENDING' || op.status === 'RUNNING') && (
                            <Popconfirm
                                title="确认取消该定时任务?"
                                onConfirm={() => handleAction('cancel', op)}
                            >
                                <Button type="link" size="small" danger>
                                    取消
                                </Button>
                            </Popconfirm>
                        )}
                        {op.status === 'PENDING' && (
                            <Popconfirm
                                title="立即触发该任务?"
                                description="不影响计划时间, 立即入队一次执行"
                                onConfirm={() => handleAction('trigger', op)}
                            >
                                <Button type="link" size="small">
                                    立即触发
                                </Button>
                            </Popconfirm>
                        )}
                        {(op.status === 'SUCCESS' ||
                            op.status === 'FAILED' ||
                            op.status === 'CANCELED') && (
                            <Popconfirm
                                title="确认删除?"
                                onConfirm={() => handleAction('delete', op)}
                            >
                                <Button type="link" size="small" danger>
                                    删除
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [api]
    )

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            {onCreate && (
                <Space>
                    <Button type="primary" onClick={onCreate}>
                        新建定时操作
                    </Button>
                </Space>
            )}
            <Table<Uart.ScheduledOperation>
                rowKey="_id"
                dataSource={items}
                columns={columns}
                loading={loading}
                scroll={{ x: 1200 }}
                pagination={{
                    current: pagination.page ?? query.page,
                    pageSize: pagination.pageSize ?? query.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (page, pageSize) =>
                        setQuery((q) => ({ ...q, page, pageSize })),
                }}
            />
            {detailOp && (
                <ScheduledOpDetail
                    op={detailOp}
                    onClose={() => setDetailOp(null)}
                />
            )}
        </Space>
    )
}

const ScheduledOpDetail: React.FC<{
    op: Uart.ScheduledOperation
    onClose: () => void
}> = ({ op, onClose }) => {
    return (
        <Modal
            open
            title={`定时操作详情 - ${op.mac} pid=${op.pid}`}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    关闭
                </Button>,
            ]}
            width={680}
        >
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="任务 ID">
                    <code>{op._id}</code>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                    <Tag color={STATUS_COLOR[op.status]}>
                        {STATUS_TEXT[op.status]}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="协议 / 指令">
                    {op.protocol} / <code>{op.content}</code>
                </Descriptions.Item>
                <Descriptions.Item label="计划触发时间">
                    {dayjs(op.scheduledAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                {op.executedAt && (
                    <Descriptions.Item label="实际执行时间">
                        {dayjs(op.executedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="执行结果">
                    {op.status === 'SUCCESS' && op.result && (
                        <span style={{ color: '#52c41a' }}>
                            ok={op.result.ok} {op.result.msg}
                        </span>
                    )}
                    {op.status === 'FAILED' && (
                        <span style={{ color: '#ff4d4f' }}>
                            {op.failReason || op.result?.msg || '执行失败'}
                        </span>
                    )}
                    {(op.status === 'PENDING' ||
                        op.status === 'RUNNING' ||
                        op.status === 'CANCELED') &&
                        '-'}
                </Descriptions.Item>
                <Descriptions.Item label="通知">
                    {op.notifiedChannels && op.notifiedChannels.length > 0
                        ? op.notifiedChannels
                              .map((c) => CHANNEL_TEXT[c] || c)
                              .join(' / ')
                        : NOTIFY_STATUS_TEXT[op.notifyStatus]}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">
                    {op.createdBy} ({op.createdByGroup})
                </Descriptions.Item>
                {op.remark && (
                    <Descriptions.Item label="备注">{op.remark}</Descriptions.Item>
                )}
            </Descriptions>
        </Modal>
    )
}
