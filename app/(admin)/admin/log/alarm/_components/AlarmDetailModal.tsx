'use client'
/**
 * 告警详情 Modal (跟 mail/sms 系列保持一致: 点击行弹窗模式)
 *
 * 设计要点 (跟 MailDetailModal 同源, 简化版 — alarm 字段少, 不需要 iframe HTML 渲染):
 * 1. 顶部 StatusBar 4 列 KV (状态 Tag / 设备名 / 协议 / 时间)
 * 2. MAC + PID + 标签 (KV 网格)
 * 3. 消息原文 (whiteSpace: pre-wrap + wordBreak: break-all, 防长字符串撑爆)
 * 4. 文末: 原始记录 JSON (调试用, 默认折叠)
 *
 * 视觉规范: 跟 app/(admin)/admin/log/mail/_components/MailDetailModal.tsx 同源
 *  - 标题栏 title="告警详情"
 *  - 状态 Tag 配色: 告警中 = error / 已恢复 = success
 *  - 严重程度 (server v2 enum): critical / warning / info
 */

import { Modal, Space, Tag } from 'antd'
import {
    CheckCircleOutlined, CloseCircleOutlined, BellOutlined,
    FireOutlined, ExclamationCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import React from 'react'

import { SectionTitle } from '@/components/common/SectionTitle'

// ─── 顶部状态条 4 列 KV ──────────────────────────────────────────────────────

interface StatusBarProps {
    record: Uart.uartAlarmObject
}

const StatusBar: React.FC<StatusBarProps> = ({ record }) => {
    const isOk = !!record.isOk
    const severity = record.severity ?? 'warning'

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '12px 20px',
                padding: '14px 18px',
                background: isOk
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))',
                border: `1px solid ${isOk ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 10,
                marginBottom: 16,
            }}
        >
            <Field label="状态">
                {isOk ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>已恢复</Tag>
                ) : (
                    <Tag color="error" icon={<CloseCircleOutlined />}>告警中</Tag>
                )}
            </Field>
            <Field label="设备">
                <span style={{ fontWeight: 500 }}>{record.devName || '—'}</span>
            </Field>
            <Field label="严重程度">
                {severity === 'critical' ? (
                    <Tag color="error" icon={<FireOutlined />} style={{ margin: 0 }}>严重</Tag>
                ) : severity === 'warning' ? (
                    <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>警告</Tag>
                ) : (
                    <Tag color="blue" icon={<InfoCircleOutlined />} style={{ margin: 0 }}>提示</Tag>
                )}
            </Field>
            <Field label="告警时间">
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {record.timeStamp
                        ? dayjs(record.timeStamp).format('YYYY-MM-DD HH:mm:ss')
                        : '—'}
                </span>
            </Field>
        </div>
    )
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </span>
        <div style={{ minWidth: 0 }}>{children}</div>
    </div>
)

// ─── 设备标识 (MAC / PID / 协议 / 标签) ──────────────────────────────────────

const DeviceSection: React.FC<{ record: Uart.uartAlarmObject }> = ({ record }) => {
    return (
        <>
            <SectionTitle icon={<BellOutlined />} title="设备标识" />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr',
                    gap: '10px 16px',
                    marginBottom: 16,
                }}
            >
                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>MAC 地址</span>
                <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {record.mac || '—'}
                </code>

                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>PID</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{record.pid ?? '—'}</span>

                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>协议</span>
                <div>
                    {record.protocol ? (
                        <Tag color="blue" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, margin: 0 }}>
                            {record.protocol}
                        </Tag>
                    ) : (
                        <span style={{ color: 'var(--ink-300)' }}>—</span>
                    )}
                </div>

                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>标签</span>
                <div>
                    {record.tag ? (
                        <Tag color="purple" style={{ margin: 0 }}>{record.tag}</Tag>
                    ) : (
                        <span style={{ color: 'var(--ink-300)' }}>—</span>
                    )}
                </div>

                {record.parentId && (
                    <>
                        <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>parentId</span>
                        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--ink-600)' }}>
                            {record.parentId}
                        </code>
                    </>
                )}
            </div>
        </>
    )
}

// ─── 消息原文 ────────────────────────────────────────────────────────────────

const MessageSection: React.FC<{ record: Uart.uartAlarmObject }> = ({ record }) => {
    return (
        <>
            <SectionTitle title="告警消息" />
            <div
                style={{
                    padding: '12px 16px',
                    background: 'var(--ink-50)',
                    border: '1px solid var(--ink-200)',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--ink-800)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 320,
                    overflowY: 'auto',
                }}
            >
                {record.msg || <span style={{ color: 'var(--ink-300)' }}>— 无消息内容 —</span>}
            </div>
        </>
    )
}

// ─── 顶层 Modal ──────────────────────────────────────────────────────────────

interface AlarmDetailModalProps {
    open: boolean
    record: Uart.uartAlarmObject | null
    onClose: () => void
}

export const AlarmDetailModal: React.FC<AlarmDetailModalProps> = ({ open, record, onClose }) => {
    return (
        <Modal
            title="告警详情"
            open={open}
            onCancel={onClose}
            footer={null}
            width={720}
            destroyOnHidden
            styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
        >
            {record && (
                <div style={{ paddingTop: 8 }}>
                    <StatusBar record={record} />
                    <DeviceSection record={record} />
                    <MessageSection record={record} />

                    {/* 文末: 原始记录 JSON (调试用, 默认折叠) */}
                    <details style={{ marginTop: 20 }}>
                        <summary
                            style={{
                                cursor: 'pointer',
                                fontSize: 11,
                                color: 'var(--ink-400)',
                                userSelect: 'none',
                            }}
                        >
                            {/* _id 是 mongo 必有字段, 但 Uart.uartAlarmObject TS 类型没声明 (跟 mail/sms 一致), 这里 as any 读 */}
                            调试 · 原始记录 (_id: {(record as any)._id})
                        </summary>
                        <pre
                            style={{
                                margin: '8px 0 0',
                                padding: 12,
                                background: 'var(--ink-50)',
                                border: '1px solid var(--ink-100)',
                                borderRadius: 6,
                                fontSize: 11,
                                fontFamily: 'ui-monospace, monospace',
                                color: 'var(--ink-600)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 320,
                                overflow: 'auto',
                            }}
                        >
                            {JSON.stringify(record, null, 2)}
                        </pre>
                    </details>

                    <Space style={{ marginTop: 8 }} size={4}>
                        <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                            提示: 点击空白处或按 Esc 关闭
                        </span>
                    </Space>
                </div>
            )}
        </Modal>
    )
}

export default AlarmDetailModal
