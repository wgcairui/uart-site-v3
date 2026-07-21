'use client'
/**
 * 邮件详情 Modal (cairui 2026-07-21 拍板: 整个 model 重设计)
 *
 * 设计要点 (跟老 DesList 三段式对比):
 * 1. HTML 渲染: <iframe sandbox srcdoc> 隔离样式 + 禁脚本 + 允许图片 + 允许外链弹窗
 *    - 不用 dangerouslySetInnerHTML, 因为邮件 HTML 可能带 <style> 污染外层
 * 2. Success 格式化: 拆字段 KV 网格 (accepted/rejected/response/messageId/时间/大小),
 *    envelope 嵌套也单独展示, 不用 JSON.stringify 一坨
 * 3. Error 格式化: 红色 Alert 头部 + errorCode/message 字段 + stack 折叠
 * 4. 邮件正文 Tab 切换: 默认"渲染" (iframe), 右上角"源码"看原始 HTML
 * 5. 顶部状态条: 5 列 KV (状态 Tag / 主题 / 时间 / 收件人数 / 邮件大小)
 *
 * 只依赖:
 * - antd (Modal / Tabs / Tag / Alert / Space / Empty)
 * - SectionTitle (跟 admin log 风格一致)
 * - Uart.logMailSend / Uart.mailResponse (types/uart.d.ts)
 */

import {
    Alert, Empty, Modal, Space, Tabs, Tag,
} from 'antd'
import {
    CheckCircleOutlined, CloseCircleOutlined, CodeOutlined,
    CopyOutlined, EyeOutlined, MailOutlined, WarningOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'

import { SectionTitle } from '@/components/common/SectionTitle'

// ─── 顶层状态条 5 列 KV (左键右值) ──────────────────────────────────────────

interface StatusBarProps {
    record: Uart.logMailSend
}

const StatusBar: React.FC<StatusBarProps> = ({ record }) => {
    const isOk = !!record.Success
    const mailSize = record.Success?.messageSize
    // envelopeTime + messageTime 拼成总耗时 (用户更关心整体时长)
    const totalTime = (() => {
        if (!record.Success) return null
        const e = record.Success.envelopeTime ?? 0
        const m = record.Success.messageTime ?? 0
        if (!e && !m) return null
        return e + m
    })()

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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
                    <Tag color="success" icon={<CheckCircleOutlined />}>发送成功</Tag>
                ) : (
                    <Tag color="error" icon={<CloseCircleOutlined />}>发送失败</Tag>
                )}
            </Field>
            <Field label="主题">
                <span style={{ fontWeight: 500 }}>{record.sendParams?.subject || '—'}</span>
            </Field>
            <Field label="发送时间">
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {record.timeStamp
                        ? dayjs(record.timeStamp).format('YYYY-MM-DD HH:mm:ss')
                        : '—'}
                </span>
            </Field>
            <Field label="收件人">
                <Tag color="blue">{record.mails?.length ?? 0} 个</Tag>
            </Field>
            <Field label="耗时 / 大小">
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {totalTime != null ? `${totalTime} ms` : '—'}
                    {typeof mailSize === 'number' && (
                        <span style={{ color: 'var(--ink-400)', marginLeft: 6 }}>· {mailSize.toLocaleString()} B</span>
                    )}
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

// ─── 收发件人 (Tag 列表) ─────────────────────────────────────────────────────

const AddressSection: React.FC<{ record: Uart.logMailSend }> = ({ record }) => {
    return (
        <>
            <SectionTitle icon={<MailOutlined />} title="发件人 / 收件人" />
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px 16px', marginBottom: 16 }}>
                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>发件人</span>
                <div>
                    {record.sendParams?.from ? (
                        <Tag color="purple" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                            {record.sendParams.from}
                        </Tag>
                    ) : (
                        <span style={{ color: 'var(--ink-300)' }}>—</span>
                    )}
                </div>

                <span style={{ color: 'var(--ink-500)', fontSize: 13, paddingTop: 2 }}>收件人</span>
                <div>
                    {Array.isArray(record.mails) && record.mails.length ? (
                        <Space size={[6, 6]} wrap>
                            {record.mails.map((m, i) => (
                                <Tag
                                    key={`${m}-${i}`}
                                    color="blue"
                                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, margin: 0 }}
                                >
                                    {m}
                                </Tag>
                            ))}
                        </Space>
                    ) : (
                        <span style={{ color: 'var(--ink-300)' }}>—</span>
                    )}
                </div>
            </div>
        </>
    )
}

// ─── 邮件正文 (渲染 / 源码 tab) ─────────────────────────────────────────────

const HtmlBodySection: React.FC<{ html: string | undefined }> = ({ html }) => {
    const [copied, setCopied] = useState(false)

    const handleCopyHtml = async () => {
        if (!html) return
        try {
            await navigator.clipboard.writeText(html)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // fallback: 用 MyCopy 的老路径 (modal fallback 已处理)
        }
    }

    if (!html) {
        return (
            <>
                <SectionTitle icon={<EyeOutlined />} title="邮件正文" />
                <Empty description="无 HTML 正文" />
            </>
        )
    }

    return (
        <>
            <SectionTitle
                icon={<EyeOutlined />}
                title="邮件正文"
                extra={
                    <Space size={8}>
                        <Tag
                            icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                            color={copied ? 'success' : 'default'}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={handleCopyHtml}
                        >
                            {copied ? '已复制' : '复制源码'}
                        </Tag>
                    </Space>
                }
            />
            <Tabs
                defaultActiveKey="render"
                size="small"
                items={[
                    {
                        key: 'render',
                        label: <span><EyeOutlined /> 渲染预览</span>,
                        children: (
                            <div
                                style={{
                                    border: '1px solid var(--ink-200)',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#fff',
                                }}
                            >
                                <iframe
                                    title="邮件预览"
                                    // sandbox 默认禁脚本 (我们要的: 邮件 HTML 不可执行 JS)
                                    // allow-popups 允许 <a target="_blank"> 在新窗口打开链接
                                    // allow-popups-to-escape-sandbox 让弹窗脱离 sandbox (正常浏览器窗口)
                                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                                    srcDoc={html}
                                    style={{
                                        width: '100%',
                                        height: 480,
                                        border: 'none',
                                        display: 'block',
                                    }}
                                />
                            </div>
                        ),
                    },
                    {
                        key: 'source',
                        label: <span><CodeOutlined /> HTML 源码</span>,
                        children: (
                            <pre
                                style={{
                                    margin: 0,
                                    padding: 16,
                                    background: 'var(--ink-50)',
                                    border: '1px solid var(--ink-200)',
                                    borderRadius: 8,
                                    maxHeight: 480,
                                    overflow: 'auto',
                                    fontSize: 12,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    lineHeight: 1.6,
                                    color: 'var(--ink-800)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {html}
                            </pre>
                        ),
                    },
                ]}
            />
        </>
    )
}

// ─── SMTP 响应 (Success 字段格式化) ────────────────────────────────────────

const SuccessSection: React.FC<{ success: Uart.mailResponse | undefined }> = ({ success }) => {
    if (!success) return null

    const envelope = success.envelope ?? ({} as NonNullable<typeof success.envelope>)

    return (
        <>
            <SectionTitle
                icon={<CheckCircleOutlined />}
                title="SMTP 响应"
                extra={<Tag color="success">accepted × {success.accepted?.length ?? 0}</Tag>}
            />

            {/* 1. 顶层标量字段 KV 网格 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px 24px',
                    marginBottom: 16,
                }}
            >
                <KV label="response" value={
                    <Tag color={/^\d{3}\s/.test(success.response ?? '') ? 'success' : 'warning'}>
                        {success.response || '—'}
                    </Tag>
                } />
                <KV label="messageId" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-all' }}>
                        {success.messageId || '—'}
                    </span>
                } />
                <KV label="envelopeTime" value={
                    typeof success.envelopeTime === 'number'
                        ? <span style={{ fontFamily: 'ui-monospace, monospace' }}>{success.envelopeTime} ms</span>
                        : '—'
                } />
                <KV label="messageTime" value={
                    typeof success.messageTime === 'number'
                        ? <span style={{ fontFamily: 'ui-monospace, monospace' }}>{success.messageTime} ms</span>
                        : '—'
                } />
            </div>

            {/* 2. accepted / rejected 收件人对比 (用户最关心: 哪些进了, 哪些被拒) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <ListGroup
                    title="accepted"
                    color="success"
                    items={success.accepted ?? []}
                />
                <ListGroup
                    title="rejected"
                    color="error"
                    items={success.rejected ?? []}
                />
            </div>

            {/* 3. envelope (from / to) 单独展示 */}
            <div
                style={{
                    padding: 12,
                    background: 'var(--ink-50)',
                    borderRadius: 8,
                    border: '1px solid var(--ink-100)',
                }}
            >
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}>envelope</div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 12px', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-500)' }}>from</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{envelope.from || '—'}</span>
                    <span style={{ color: 'var(--ink-500)' }}>to</span>
                    <Space size={[4, 4]} wrap>
                        {Array.isArray(envelope.to) && envelope.to.length
                            ? envelope.to.map((t, i) => (
                                <Tag key={`${t}-${i}`} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, margin: 0 }}>
                                    {t}
                                </Tag>
                            ))
                            : <span style={{ color: 'var(--ink-300)' }}>—</span>
                        }
                    </Space>
                </div>
            </div>
        </>
    )
}

const KV: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
        </span>
        <div style={{ minWidth: 0 }}>{value}</div>
    </div>
)

const ListGroup: React.FC<{
    title: string
    color: 'success' | 'error' | 'warning' | 'processing'
    items: string[]
}> = ({ title, color, items }) => (
    <div
        style={{
            padding: 12,
            background: 'var(--ink-50)',
            borderRadius: 8,
            border: '1px solid var(--ink-100)',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{title}</span>
            <Tag color={color} style={{ margin: 0 }}>{items.length}</Tag>
        </div>
        {items.length ? (
            <Space size={[4, 4]} wrap>
                {items.map((it, i) => (
                    <Tag
                        key={`${it}-${i}`}
                        color={color}
                        style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, margin: 0 }}
                    >
                        {it}
                    </Tag>
                ))}
            </Space>
        ) : (
            <span style={{ color: 'var(--ink-300)', fontSize: 12 }}>无</span>
        )}
    </div>
)

// ─── 错误 (Error 字段格式化) ────────────────────────────────────────────────

interface MailErrorLike {
    code?: string | number
    errcode?: string | number
    errorCode?: string | number
    message?: string
    errMessage?: string
    response?: string
    responseCode?: string | number
    stack?: string
}

const ErrorSection: React.FC<{ error: unknown }> = ({ error }) => {
    // Error 字段 server 端类型是 any, 实际可能是字符串 / 对象 / 异常对象
    // 做防御性归一化
    const normalized = useMemo<MailErrorLike | null>(() => {
        if (error == null) return null
        if (typeof error === 'string') {
            return { message: error }
        }
        if (typeof error === 'object') {
            return error as MailErrorLike
        }
        return { message: String(error) }
    }, [error])

    if (!normalized) return null

    const code = normalized.code ?? normalized.errcode ?? normalized.errorCode ?? normalized.responseCode
    const message = normalized.message ?? normalized.errMessage ?? normalized.response
    const hasStack = !!normalized.stack

    return (
        <>
            <SectionTitle
                icon={<WarningOutlined />}
                title="错误信息"
                extra={<Tag color="error">failed</Tag>}
            />
            <Alert
                type="error"
                showIcon
                message={code != null ? `[${code}] ${message ?? '发送失败'}` : (message ?? '发送失败')}
                style={{ marginBottom: hasStack ? 12 : 0 }}
            />
            {hasStack && (
                <details
                    style={{
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8,
                        background: 'rgba(239,68,68,0.04)',
                        padding: 12,
                    }}
                >
                    <summary
                        style={{
                            cursor: 'pointer',
                            fontSize: 12,
                            color: 'var(--ink-500)',
                            userSelect: 'none',
                            marginBottom: 8,
                        }}
                    >
                        展开堆栈 ({normalized.stack!.split('\n').length} 行)
                    </summary>
                    <pre
                        style={{
                            margin: 0,
                            padding: 12,
                            background: 'var(--ink-50)',
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            lineHeight: 1.5,
                            color: 'var(--ink-800)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 240,
                            overflow: 'auto',
                        }}
                    >
                        {normalized.stack}
                    </pre>
                </details>
            )}

            {/* 原始 payload (兜底: 如果有上面没覆盖到的字段, JSON 展示) */}
            <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink-500)' }}>
                    原始 payload
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
                        color: 'var(--ink-700)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {JSON.stringify(error, null, 2)}
                </pre>
            </details>
        </>
    )
}

// ─── 顶层 Modal ─────────────────────────────────────────────────────────────

interface MailDetailModalProps {
    open: boolean
    record: Uart.logMailSend | null
    onClose: () => void
}

export const MailDetailModal: React.FC<MailDetailModalProps> = ({ open, record, onClose }) => {
    return (
        <Modal
            title="邮件详情"
            open={open}
            onCancel={onClose}
            footer={null}
            width={880}
            destroyOnHidden
            // modal body max-height, 防超大 HTML 撑爆屏幕
            styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
        >
            {record && (
                <div style={{ paddingTop: 8 }}>
                    <StatusBar record={record} />
                    <AddressSection record={record} />
                    <HtmlBodySection html={record.sendParams?.html} />
                    {record.Success ? (
                        <SuccessSection success={record.Success} />
                    ) : (
                        <ErrorSection error={record.Error} />
                    )}

                    {/* 文末: _id + raw json (调试用, 默认折叠) */}
                    <details style={{ marginTop: 20 }}>
                        <summary
                            style={{
                                cursor: 'pointer',
                                fontSize: 11,
                                color: 'var(--ink-400)',
                                userSelect: 'none',
                            }}
                        >
                            调试 · 原始记录 (_id: {record._id})
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
                </div>
            )}
        </Modal>
    )
}
