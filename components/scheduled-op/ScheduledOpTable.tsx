'use client'

/**
 * 定时操作列表 + 详情 (2026-06-30 决策 18 第一阶段 + 2026-07-10 决策 19 IMMEDIATE)
 *
 * 通用组件, admin / user 两端都可用:
 * - api: 'admin' | 'user' 决定 list / cancel / trigger / delete 走哪一组 endpoint
 * - fixedMac: 可选, 锁定 list 查询的 mac 过滤 (用于 "设备详情页 tab" 场景)
 * - showCreate: 是否显示 "新建定时操作" 按钮 (admin 端默认 true, user 端在 dev 详情页 context 中由父级管理)
 *
 * 决策 19: 顶部 Segmented 切换 SCHEDULED / IMMEDIATE / 全部 (默认 SCHEDULED, 保持老 UX):
 * - SCHEDULED: 计划时间列显示 scheduledAt, 操作列有 取消 / 立即触发 / 删除
 * - IMMEDIATE: 时间列显示 executedAt, 操作列只有 详情 / 删除 (IMMEDIATE 同步执行无取消/触发)
 * - 老 doc (kind=undefined) 默认按 SCHEDULED 渲染 (后端 normalize, 前端兜底)
 */
import {
    Button,
    Descriptions,
    Modal,
    Popconfirm,
    Segmented,
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
/** 决策 19: kind filter UI 选项 — 全部映射后端 filters.kind 数组 */
const KIND_FILTER_OPTIONS: Array<{
    label: string
    value: 'SCHEDULED' | 'IMMEDIATE' | 'ALL'
}> = [
    { label: '定时', value: 'SCHEDULED' },
    { label: '立即', value: 'IMMEDIATE' },
    { label: '全部', value: 'ALL' },
]
/** 决策 19: kind 兜底 (老 doc 后端虽然 normalize, 但 mongoose lean 后 kind 可能 undefined) */
const getKind = (op: Uart.ScheduledOperation): Uart.ScheduledOpKind =>
    op.kind ?? 'SCHEDULED'
/** 决策 19: operationType 兜底 */
const getOperationType = (
    op: Uart.ScheduledOperation
): Uart.ScheduledOpOperationType => op.operationType ?? 'device'

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
    /** 决策 19: 顶部 Segmented 状态, 默认 SCHEDULED (老 UX 不变) */
    const [kindFilter, setKindFilter] = useState<'SCHEDULED' | 'IMMEDIATE' | 'ALL'>(
        'SCHEDULED'
    )

    const listFn = api === 'admin' ? listScheduledOps : listUserScheduledOps
    // 决策 19: kind filter + 既有 filterFields 合并到 filters, 避免 spread 覆盖
    const mergedFilters: Record<string, string[]> | undefined = (() => {
        const base = Object.keys(filterFields).length ? { ...filterFields } : {}
        if (kindFilter !== 'ALL') base.kind = [kindFilter]
        return Object.keys(base).length ? base : undefined
    })()
    const apiQuery: PaginationReq = {
        ...query,
        // 决策 19: IMMEDIATE 推荐 sortBy='createdAt' desc (最新操作在前); SCHEDULED 维持 scheduledAt desc
        ...(kindFilter === 'IMMEDIATE'
            ? { sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
            : {}),
        ...(Object.keys(searchFields).length ? { search: searchFields } : {}),
        ...(mergedFilters ? { filters: mergedFilters } : {}),
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
        // 仓库 Result 约定: code === 200 = 成功, 其他 (0/400/5xx) = 失败
        // 之前 `if (res.code)` 把 code:400 校验错 + code:0 一般错都误判, 真成功会被静默吞
        // 13+ callsite 现状 MailStatsChart / SmsStatsChart / TerminalAddMountDev /
        // AlarmLogTab / TerminalTimelineTab / RequestLogTab / LoginLogTab 都是
        // `if (res.code === 200)`
        if (res.code === 200) {
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
                // 决策 19: SCHEDULED 用 scheduledAt, IMMEDIATE 用 executedAt (后端复用同字段)
                title: '时间',
                key: 'time',
                width: 170,
                render: (_, op) => {
                    const kind = getKind(op)
                    const ts = kind === 'IMMEDIATE' ? op.executedAt : op.scheduledAt
                    return ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-'
                },
                sorter: true,
            },
            {
                // 决策 19: IMMEDIATE 的 operationType='dtu' 时 mac 是终端 MAC, pid=0
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
                render: (pid: number, op) => {
                    // 决策 19: IMMEDIATE + operationType='dtu' 是 DTU 操作 (跟 protocol 列同条件, 不靠 pid=0 判定)
                    if (
                        getKind(op) === 'IMMEDIATE' &&
                        getOperationType(op) === 'dtu'
                    )
                        return 'DTU'
                    return pid
                },
            },
            {
                title: '协议',
                dataIndex: 'protocol',
                key: 'protocol',
                width: 120,
                render: (proto: string, op) => {
                    // 决策 19: IMMEDIATE 的 dtu 操作无 protocol (直接 AT 指令)
                    if (getKind(op) === 'IMMEDIATE' && getOperationType(op) === 'dtu')
                        return <Tag color="purple">DTU 直发</Tag>
                    return proto || '-'
                },
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
                // 决策 19: SCHEDULED 显示通知通道; IMMEDIATE 显示 result 简化版 (PENDING 时无数据)
                title: '通知 / 结果',
                dataIndex: 'notifiedChannels',
                key: 'notifyOrResult',
                width: 130,
                render: (_, op) => {
                    const kind = getKind(op)
                    if (kind === 'IMMEDIATE') {
                        // PENDING 窗口极短, 但 UI 不假设不存在
                        if (op.status === 'PENDING') return <span style={{ color: '#999' }}>执行中...</span>
                        if (op.result) {
                            return (
                                <Tag color={op.result.ok ? 'green' : 'red'}>
                                    {op.result.ok ? '✓' : '✗'}
                                    {op.result.msg ? ` ${op.result.msg}` : ''}
                                </Tag>
                            )
                        }
                        return '-'
                    }
                    // SCHEDULED 路径: 显示通知通道
                    const channels = op.notifiedChannels
                    if (!channels || channels.length === 0) return '-'
                    return channels.map((c) => CHANNEL_TEXT[c] || c).join(' / ')
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
                render: (_, op) => {
                    const kind = getKind(op)
                    // 决策 19: IMMEDIATE 是同步执行的, 无"取消"和"立即触发"按钮;
                    // 只有 SUCCESS / FAILED 才能删除 (PENDING 窗口太短不显示操作)
                    if (kind === 'IMMEDIATE') {
                        return (
                            <Space size="small" wrap>
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => setDetailOp(op)}
                                >
                                    详情
                                </Button>
                                {(op.status === 'SUCCESS' || op.status === 'FAILED') && (
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
                        )
                    }
                    // SCHEDULED 老逻辑
                    return (
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
                    )
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [api]
    )

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space>
                {onCreate && (
                    <Button type="primary" onClick={onCreate}>
                        新建定时操作
                    </Button>
                )}
                {/* 决策 19: 顶部 Segmented 切换 kind, 切回页 1 触发 usePromise re-fetch */}
                <Segmented
                    options={KIND_FILTER_OPTIONS}
                    value={kindFilter}
                    onChange={(v) => {
                        setKindFilter(v as typeof kindFilter)
                        setQuery((q) => ({ ...q, page: 1 }))
                    }}
                />
            </Space>
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
    // 决策 19: kind 决定 Modal 标题 + 字段展示
    const kind = getKind(op)
    const operationType = getOperationType(op)
    const isImmediate = kind === 'IMMEDIATE'
    const titleSuffix = isImmediate
        ? `立即执行 - ${op.mac}${
              operationType === 'dtu' ? ' (DTU 直发)' : ` pid=${op.pid}`
          }`
        : `定时操作 - ${op.mac} pid=${op.pid}`
    return (
        <Modal
            open
            title={`${titleSuffix}`}
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
                <Descriptions.Item label="类型">
                    <Tag color={isImmediate ? 'purple' : 'blue'}>
                        {isImmediate ? '立即执行' : '定时执行'}
                    </Tag>
                    {isImmediate && (
                        <Tag color="geekblue">
                            {operationType === 'dtu' ? 'DTU 直发' : '设备指令'}
                        </Tag>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                    <Tag color={STATUS_COLOR[op.status]}>
                        {STATUS_TEXT[op.status]}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="指令">
                    <code>{op.content}</code>
                </Descriptions.Item>
                {isImmediate ? (
                    // IMMEDIATE 路径: 无 scheduledAt, 无 notifyStatus, 只有 executedAt
                    <Descriptions.Item label="实际执行时间">
                        {op.executedAt
                            ? dayjs(op.executedAt).format('YYYY-MM-DD HH:mm:ss')
                            : '-'}
                    </Descriptions.Item>
                ) : (
                    // SCHEDULED 老路径
                    <Descriptions.Item label="计划触发时间">
                        {dayjs(op.scheduledAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                )}
                {op.executedAt && !isImmediate && (
                    <Descriptions.Item label="实际执行时间">
                        {dayjs(op.executedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="执行结果">
                    {op.status === 'SUCCESS' && op.result && (
                        <span style={{ color: '#52c41a' }}>
                            {op.result.ok ? '✓' : '✗'}{' '}
                            {op.result.msg || ''}
                            {op.result.n !== undefined &&
                                ` (n=${op.result.n})`}
                        </span>
                    )}
                    {op.status === 'FAILED' && (
                        <span style={{ color: '#ff4d4f' }}>
                            ✗{' '}
                            {op.failReason || op.result?.msg || '执行失败'}
                        </span>
                    )}
                    {(isImmediate && op.status === 'PENDING') ||
                    op.status === 'RUNNING' ? (
                        <span style={{ color: '#999' }}>执行中...</span>
                    ) : null}
                    {op.status === 'CANCELED' && !isImmediate && '-'}
                </Descriptions.Item>
                {!isImmediate && (
                    // SCHEDULED 才显示通知 — IMMEDIATE 没通知概念
                    <Descriptions.Item label="通知">
                        {op.notifiedChannels && op.notifiedChannels.length > 0
                            ? op.notifiedChannels
                                  .map((c) => CHANNEL_TEXT[c] || c)
                                  .join(' / ')
                            : NOTIFY_STATUS_TEXT[op.notifyStatus]}
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="创建人">
                    {op.createdBy} ({op.createdByGroup})
                </Descriptions.Item>
                {op.createdAt && (
                    <Descriptions.Item label="创建时间">
                        {dayjs(op.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                )}
                {!isImmediate && op.remark && (
                    <Descriptions.Item label="备注">{op.remark}</Descriptions.Item>
                )}
            </Descriptions>
        </Modal>
    )
}
