'use client'

/**
 * admin terminal Timeline tab — server feat/log-terminal-timeline @ 0cc02dd
 *
 * 字段名权威源: midwayuartserver/src/common/types/log-event.schema.ts (commit 5ab6f10)
 * 前端不引入 zod runtime，TS discriminated union 镜像 server zod schema.
 *
 * 设计要点:
 * - 默认时间窗 24h (cairui 排查场景)
 * - kinds Select 多选 + search，空数组 = 全部 (server 端判断)
 * - 17 个 kind 颜色映射按 uart-server worker 建议
 * - invalidPayload 折叠面板展示 (dev 排查用)
 * - legacyCollection 角落 📜 legacy 链接跳转老 log.terminals endpoint (双写期 6 个月内)
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
    Badge,
    Card,
    Checkbox,
    Collapse,
    DatePicker,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd'
import dayjs from 'dayjs'
import { logTerminalTimeline } from '@/lib/api/endpoints/admin/logs'
import type { PaginationReq, V2ListResponse } from '@/types'

const { RangePicker } = DatePicker
const { Text } = Typography

interface Props {
    mac: string
}

type Kind = Uart.TerminalEventKind

// 颜色映射 — 跟 uart-server worker ping 对齐
const KIND_COLOR: Record<Kind, string> = {
    // terminalEvents (11)
    TERMINAL_CONNECT: 'green',
    TERMINAL_OFFLINE: 'default',
    DTU_OPERATION: 'blue',
    DEVICE_OPERATION: 'blue',
    QUERY_TIMEOUT: 'orange',
    PARTIAL_INSTRUCT_TIMEOUT: 'orange',
    ALARM_TRIGGER: 'red',
    ALARM_RECOVER: 'gold',
    DATA_EXCEPTION: 'purple',
    PARSE_NULL: 'purple',
    PARSE_ALARM: 'volcano',
    // terminalSidecar (6) — node 事件
    NODE_CONNECT: 'geekblue',
    NODE_DISCONNECT: 'default',
    NODE_INVALID: 'magenta',
    NODE_TCP_FAIL: 'red',
    DTU_BUSY_TRUE: 'gold',
    DTU_BUSY_FALSE: 'lime',
}

// 17 个 kind 列表 + 中文 label
const KIND_OPTIONS: { value: Kind; label: string; group: 'event' | 'sidecar' }[] = [
    { value: 'TERMINAL_CONNECT', label: '设备连接', group: 'event' },
    { value: 'TERMINAL_OFFLINE', label: '设备离线', group: 'event' },
    { value: 'DTU_OPERATION', label: 'DTU 操作', group: 'event' },
    { value: 'DEVICE_OPERATION', label: '设备操作', group: 'event' },
    { value: 'QUERY_TIMEOUT', label: '查询超时', group: 'event' },
    { value: 'PARTIAL_INSTRUCT_TIMEOUT', label: '部分指令超时', group: 'event' },
    { value: 'ALARM_TRIGGER', label: '告警触发', group: 'event' },
    { value: 'ALARM_RECOVER', label: '告警恢复', group: 'event' },
    { value: 'DATA_EXCEPTION', label: '数据异常', group: 'event' },
    { value: 'PARSE_NULL', label: '解析为空', group: 'event' },
    { value: 'PARSE_ALARM', label: '解析告警', group: 'event' },
    { value: 'NODE_CONNECT', label: 'Node 连接', group: 'sidecar' },
    { value: 'NODE_DISCONNECT', label: 'Node 断开', group: 'sidecar' },
    { value: 'NODE_INVALID', label: 'Node 非法连接', group: 'sidecar' },
    { value: 'NODE_TCP_FAIL', label: 'Node TCP 失败', group: 'sidecar' },
    { value: 'DTU_BUSY_TRUE', label: 'DTU 繁忙(进入)', group: 'sidecar' },
    { value: 'DTU_BUSY_FALSE', label: 'DTU 繁忙(退出)', group: 'sidecar' },
]

/** QUEUE_ALARM_TYPE — server 端 src/common/types/interface.ts:46
 *  ALARM_TRIGGER / ALARM_RECOVER payload.alarmType 字段引用，UI 渲染时 map 一下 */
const QUEUE_ALARM_TYPE_LABEL: Record<string, string> = {
    TIME_OUT_ALARM: '超时',
    OFFLINE: '离线',
    ARGUMENT_ALARM: '参数告警',
    ARGUMENT_ALARM_RELOAD: '参数告警恢复',
    MAC_ON_OFF_LINE: '设备上线',
    ICCID_EXPIRE: '4G 卡到期',
}

// payload 摘要 — 按 kind 分支抽取关键字段
function summarizePayload(item: Uart.TerminalTimelineItem): string {
    const p = item.payload as Record<string, unknown>
    switch (item.kind) {
        case 'TERMINAL_CONNECT':
            return [p.protocol, p.pid, p.mountDev].filter(Boolean).join(' · ')
        case 'TERMINAL_OFFLINE':
            return `lastSeen=${dayjs(p.lastSeen as number).format('HH:mm:ss')} reason=${p.reason}`
        case 'DTU_OPERATION':
            return `${p.op}${p.target ? ` → ${p.target}` : ''}`
        case 'DEVICE_OPERATION':
            return [p.instruct, p.protocol, p.pid].filter(Boolean).join(' · ')
        case 'QUERY_TIMEOUT':
        case 'PARTIAL_INSTRUCT_TIMEOUT':
            return `${p.instruct ?? '?'} timeout=${p.timeoutMs}ms partial=${p.partial}`
        case 'ALARM_TRIGGER':
        case 'ALARM_RECOVER': {
            const typeLabel = p.alarmType
                ? QUEUE_ALARM_TYPE_LABEL[p.alarmType as string] ?? p.alarmType
                : null
            return `${p.rule} value=${p.value}${p.threshold ? ` threshold=${p.threshold}` : ''}${
                typeLabel ? ` [${typeLabel}]` : ''
            }`
        }
        case 'DATA_EXCEPTION':
            return `${p.reason}${p.rawLen ? ` rawLen=${p.rawLen}` : ''}`
        case 'PARSE_NULL':
            return `${p.instruct ?? '?'}${p.rawLen ? ` rawLen=${p.rawLen}` : ''}`
        case 'PARSE_ALARM':
            return [p.instruct, p.protocol, p.pid].filter(Boolean).join(' · ')
        case 'NODE_CONNECT':
        case 'NODE_DISCONNECT':
            return `nodeId=${p.nodeId}${p.reason ? ` reason=${p.reason}` : ''}`
        case 'NODE_INVALID':
            return `${p.sourceIp ?? '?'} reason=${p.reason}`
        case 'NODE_TCP_FAIL':
            return String(p.error ?? '')
        case 'DTU_BUSY_TRUE':
        case 'DTU_BUSY_FALSE':
            return `consecutiveN=${p.consecutiveN}`
        default:
            return ''
    }
}

export const TerminalTimelineTab: React.FC<Props> = ({ mac }) => {
    const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(24, 'hour'),
        dayjs(),
    ])
    const [kinds, setKinds] = useState<Kind[]>([])
    const [includeNodeEvents, setIncludeNodeEvents] = useState(true)
    const [data, setData] = useState<Uart.TerminalTimelineItem[]>([])
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 })
    const [detailModal, setDetailModal] = useState<{ open: boolean; record: Uart.TerminalTimelineItem | null }>({
        open: false,
        record: null,
    })

    const fetchData = async (page = 1, pageSize = 50) => {
        setLoading(true)
        try {
            const res = await logTerminalTimeline(
                mac,
                range[0].valueOf(),
                range[1].valueOf(),
                {
                    page,
                    pageSize,
                    ...(kinds.length ? { kinds } : {}),
                    includeNodeEvents,
                },
            )
            if (res.code === 200) {
                const items = res.data?.items ?? []
                setData(Array.isArray(items) ? items : [])
                setPagination({
                    page: res.data?.pagination?.page ?? 1,
                    pageSize: res.data?.pagination?.pageSize ?? 50,
                    total: res.data?.pagination?.total ?? 0,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    // mac / range / kinds / includeNodeEvents 变化时重拉
    useEffect(() => {
        fetchData(1, pagination.pageSize)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mac, range[0].valueOf(), range[1].valueOf(), kinds.join(','), includeNodeEvents])

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
                dataIndex: 'kind',
                title: '事件',
                width: 140,
                render: (v: Kind) => (
                    <Tag color={KIND_COLOR[v]} style={{ margin: 0 }}>
                        {KIND_OPTIONS.find((k) => k.value === v)?.label ?? v}
                    </Tag>
                ),
            },
            {
                dataIndex: 'source',
                title: '来源',
                width: 70,
                render: (v: 'event' | 'sidecar') =>
                    v === 'sidecar' ? <Badge color="geekblue" text="Node" /> : <Badge color="blue" text="Device" />,
            },
            {
                dataIndex: 'payload',
                title: '摘要',
                ellipsis: true,
                render: (_: unknown, r: Uart.TerminalTimelineItem) => summarizePayload(r),
            },
            {
                dataIndex: 'nodeName',
                title: 'Node',
                width: 120,
                render: (v?: string, r?: Uart.TerminalTimelineItem) =>
                    v ? (
                        <Text style={{ fontSize: 12 }}>
                            {v}
                            {r?.nodeIp ? ` (${r.nodeIp})` : ''}
                        </Text>
                    ) : (
                        <Text type="secondary">—</Text>
                    ),
            },
            {
                key: 'invalid',
                title: '',
                width: 30,
                render: (_: unknown, r: Uart.TerminalTimelineItem) =>
                    r.invalidPayload ? <Tag color="red">!</Tag> : null,
            },
        ],
        [],
    )

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
                <RangePicker
                    value={range}
                    onChange={(v) => {
                        if (v && v[0] && v[1]) setRange([v[0], v[1]])
                    }}
                    showTime={{ format: 'HH:mm' }}
                    allowClear={false}
                />
                <Select
                    mode="multiple"
                    allowClear
                    placeholder="筛选事件类型（空 = 全部）"
                    style={{ minWidth: 240 }}
                    value={kinds}
                    onChange={(v: Kind[]) => setKinds(v)}
                    options={KIND_OPTIONS.map((k) => ({
                        value: k.value,
                        label: (
                            <Space size={4}>
                                <Tag color={KIND_COLOR[k.value]} style={{ margin: 0 }}>
                                    {k.value}
                                </Tag>
                                <span>{k.label}</span>
                            </Space>
                        ),
                    }))}
                    optionFilterProp="label"
                    maxTagCount="responsive"
                />
                <Checkbox
                    checked={includeNodeEvents}
                    onChange={(e) => setIncludeNodeEvents(e.target.checked)}
                >
                    包含 Node 事件
                </Checkbox>
            </Space>

            <Card size="small" styles={{ body: { padding: 0 } }}>
                <Table
                    size="small"
                    loading={loading}
                    dataSource={data as any}
                    rowKey="_id"
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['20', '50', '100', '200'],
                        showTotal: (t: number) => `共 ${t} 条`,
                    }}
                    onChange={(pag) => fetchData(pag.current ?? 1, pag.pageSize ?? 50)}
                    columns={columns as any}
                    onRow={(record: any) => ({
                        onClick: () => setDetailModal({ open: true, record }),
                        style: { cursor: 'pointer' },
                    })}
                />
            </Card>

            <Modal
                title={
                    detailModal.record ? (
                        <Space>
                            <Tag color={KIND_COLOR[detailModal.record.kind]}>
                                {KIND_OPTIONS.find((k) => k.value === detailModal.record?.kind)?.label ??
                                    detailModal.record.kind}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(detailModal.record.timeStamp).format('YYYY-MM-DD HH:mm:ss.SSS')}
                            </Text>
                        </Space>
                    ) : (
                        '事件详情'
                    )
                }
                open={detailModal.open}
                onCancel={() => setDetailModal({ open: false, record: null })}
                footer={null}
                width={680}
            >
                {detailModal.record && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                        <Field label="MAC" value={detailModal.record.mac || '—'} />
                        <Field label="来源" value={detailModal.record.source} />
                        <Field label="Node">
                            {detailModal.record.nodeName
                                ? `${detailModal.record.nodeName}${detailModal.record.nodeIp ? ` (${detailModal.record.nodeIp})` : ''}`
                                : '—'}
                        </Field>
                        {detailModal.record.legacyCollection && (
                            <Field label="Legacy">
                                <Space size={4}>
                                    <Tag>{detailModal.record.legacyCollection}</Tag>
                                    <Text type="secondary">{detailModal.record.legacyType}</Text>
                                </Space>
                            </Field>
                        )}
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Payload
                            </Text>
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
                                {JSON.stringify(detailModal.record.payload, null, 2)}
                            </pre>
                        </div>
                        {detailModal.record.invalidPayload && (
                            <Collapse
                                size="small"
                                items={[
                                    {
                                        key: 'invalid',
                                        label: <Tag color="red">⚠️ Schema 校验失败（dev 排查用）</Tag>,
                                        children: (
                                            <pre
                                                style={{
                                                    background: '#fff1f0',
                                                    padding: 12,
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    maxHeight: 200,
                                                    overflow: 'auto',
                                                }}
                                            >
                                                {JSON.stringify(detailModal.record.invalidPayload, null, 2)}
                                            </pre>
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </Space>
                )}
            </Modal>
        </Space>
    )
}

const Field: React.FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode }> = ({
    label,
    value,
    children,
}) => (
    <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
            {label}
        </Text>
        <div>{children ?? value}</div>
    </div>
)

export default TerminalTimelineTab