'use client'
/**
 * 短信详情 Modal (cairui 2026-07-22 拍板: 跟 mail 一样整个 model 重设计)
 *
 * 设计要点 (跟老 DesList 三段式对比, 设计语言跟 MailDetailModal 对齐):
 * 1. TemplateParam JSON 解析: 老版本是 'TemplateParam: {"name":"Yozi",...}'
 *    一坨, 改成 key-value 表格, 每个变量一行
 * 2. Success 拆字段: Message / RequestId / BizId / Code 单独展示
 * 3. Error 拆字段: 跟 mail 一样红色 Alert + stack 折叠
 * 4. 顶部状态条 4 列: 状态 / 签名 / 时间 / 收件人数
 * 5. 收件人: 手机号 Tag 列表 (每个可复制)
 * 6. 发送参数: RegionId / SignName / TemplateCode 拆字段
 *
 * 注意:
 * - SMS 是给管理员查问题的工具 (admin 后台), 不是给用户看的
 *   所以不加"使用小程序/PDF"链接 (那是给最终用户的)
 * - 真实短信文本还原需要阿里云后台的 TemplateCode -> 模板内容映射
 *   这个在 server 端没有, 所以本 modal 只展示 TemplateParam 变量
 *   (cairui 想要还原真实短信再单独做 SMS 模板映射)
 */

import {
    Alert, Empty, Modal, Space,
} from 'antd'
import {
    CheckCircleOutlined, CloseCircleOutlined, CopyOutlined,
    MailOutlined, PhoneOutlined, WarningOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'

import { SectionTitle } from '@/components/common/SectionTitle'
import { StatusTag } from '@/components/common/StatusTag'

/** 短信详情 Modal 宽度 (v2 token 替代硬编码 780) */
export const SMS_DETAIL_MODAL_WIDTH = 780

// ─── 顶层状态条 4 列 KV ────────────────────────────────────────────────────

interface StatusBarProps {
    record: Uart.logSmsSend
}

const StatusBar: React.FC<StatusBarProps> = ({ record }) => {
    const isOk = !!record.Success
    const phoneCount = record.tels?.length ?? 0
    // 阿里云 SMS 按 70 字/条 切条, 估算条数
    const estimatedSegments = (() => {
        // sendParams.TemplateParam 是 JSON, 但实际发送长度取决于渲染后文本
        // 这里用 TemplateParam 字符串长度粗略估算
        return Math.max(1, Math.ceil((record.sendParams?.TemplateParam?.length ?? 0) / 60))
    })()

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '12px 20px',
                padding: '14px 18px',
                background: isOk
                    ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-success) 6%, transparent), color-mix(in srgb, var(--color-success) 2%, transparent))'
                    : 'linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 6%, transparent), color-mix(in srgb, var(--color-danger) 2%, transparent))',
                border: `1px solid ${isOk ? 'color-mix(in srgb, var(--color-success) 20%, transparent)' : 'color-mix(in srgb, var(--color-danger) 20%, transparent)'}`,
                borderRadius: 10,
                marginBottom: 16,
            }}
        >
            <Field label="状态">
                {isOk ? (
                    <StatusTag variant="online" text="发送成功" icon={<CheckCircleOutlined />} />
                ) : (
                    <StatusTag variant="error" text="发送失败" icon={<CloseCircleOutlined />} />
                )}
            </Field>
            <Field label="签名">
                <span style={{ fontWeight: 500 }}>{record.sendParams?.SignName || '—'}</span>
            </Field>
            <Field label="发送时间">
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {record.timeStamp
                        ? dayjs(record.timeStamp).format('YYYY-MM-DD HH:mm:ss')
                        : '—'}
                </span>
            </Field>
            <Field label="收件人 / 条数">
                <Space size={6}>
                    <StatusTag
                        variant="info"
                        text={`${phoneCount} 个`}
                        icon={<PhoneOutlined />}
                        showDot={false}
                    />
                    {isOk && (
                        <StatusTag
                            variant="idle"
                            text={`≈ ${estimatedSegments} 条`}
                            showDot={false}
                            size="sm"
                        />
                    )}
                </Space>
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

// ─── 收件人 (手机号 Tag 列表) ─────────────────────────────────────────────

const AddressSection: React.FC<{ tels: string[] }> = ({ tels }) => {
    return (
        <>
            <SectionTitle icon={<PhoneOutlined />} title="收件人" />
            {Array.isArray(tels) && tels.length ? (
                <Space size={[6, 6]} wrap style={{ marginBottom: 16 }}>
                    {tels.map((tel, i) => (
                        <StatusTag
                            key={`${tel}-${i}`}
                            variant="info"
                            text={tel}
                            showDot={false}
                            size="sm"
                        />
                    ))}
                </Space>
            ) : (
                <Empty description="无收件人" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginBottom: 16 }} />
            )}
        </>
    )
}

// ─── 短信内容 (TemplateParam 解析) ───────────────────────────────────────

interface ParsedTemplateParam {
    [key: string]: any
}

const ContentSection: React.FC<{ templateParam: string | undefined; templateCode: string | undefined }> = ({
    templateParam,
    templateCode,
}) => {
    const [copied, setCopied] = useState(false)

    const parsed = useMemo<ParsedTemplateParam | null>(() => {
        if (!templateParam) return null
        try {
            return JSON.parse(templateParam) as ParsedTemplateParam
        } catch {
            return null
        }
    }, [templateParam])

    const handleCopy = async () => {
        if (!templateParam) return
        try {
            await navigator.clipboard.writeText(templateParam)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // ignore
        }
    }

    if (!templateParam) {
        return (
            <>
                <SectionTitle icon={<MailOutlined />} title="短信内容" />
                <Empty description="无 TemplateParam" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </>
        )
    }

    const entries = parsed ? Object.entries(parsed) : []

    return (
        <>
            <SectionTitle
                icon={<MailOutlined />}
                title="短信内容 (TemplateParam)"
                extra={
                    <Space size={8}>
                        {templateCode && (
                            <StatusTag
                                variant="info"
                                text={templateCode}
                                showDot={false}
                                size="sm"
                            />
                        )}
                        <span
                            onClick={handleCopy}
                            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex' }}
                        >
                            <StatusTag
                                icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                                variant={copied ? 'online' : 'idle'}
                                text={copied ? '已复制' : '复制 JSON'}
                                showDot={false}
                            />
                        </span>
                    </Space>
                }
            />

            {parsed ? (
                // 解析成功: 展示 key-value 表格
                <div
                    style={{
                        background: 'var(--ink-50)',
                        border: '1px solid var(--ink-100)',
                        borderRadius: 8,
                        marginBottom: 16,
                        overflow: 'hidden',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 13,
                        }}
                    >
                        <tbody>
                            {entries.map(([key, value], i) => (
                                <tr
                                    key={key}
                                    style={{
                                        borderBottom: i < entries.length - 1 ? '1px solid var(--ink-100)' : 'none',
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: '10px 14px',
                                            color: 'var(--ink-500)',
                                            fontFamily: 'ui-monospace, monospace',
                                            fontSize: 12,
                                            width: 120,
                                            verticalAlign: 'top',
                                        }}
                                    >
                                        {key}
                                    </td>
                                    <td
                                        style={{
                                            padding: '10px 14px',
                                            color: 'var(--ink-800)',
                                            fontWeight: 500,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {String(value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // 解析失败: fallback 原始字符串
                <>
                    <Alert
                        type="warning"
                        showIcon
                        message="TemplateParam 不是合法 JSON, 显示原始字符串"
                        style={{ marginBottom: 8 }}
                    />
                    <pre
                        style={{
                            margin: 0,
                            padding: 12,
                            background: 'var(--ink-50)',
                            border: '1px solid var(--ink-200)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'ui-monospace, monospace',
                            color: 'var(--ink-800)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            marginBottom: 16,
                        }}
                    >
                        {templateParam}
                    </pre>
                </>
            )}
        </>
    )
}

// ─── 发送参数 ─────────────────────────────────────────────────────────────

const SendParamsSection: React.FC<{ sendParams: Uart.logSmsSend['sendParams'] }> = ({ sendParams }) => {
    if (!sendParams) return null

    return (
        <>
            <SectionTitle icon={<MailOutlined />} title="发送参数" />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px 24px',
                    marginBottom: 16,
                }}
            >
                <KV label="RegionId" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                        {sendParams.RegionId || '—'}
                    </span>
                } />
                <KV label="SignName" value={
                    <span style={{ fontWeight: 500 }}>{sendParams.SignName || '—'}</span>
                } />
                <KV label="TemplateCode" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                        {sendParams.TemplateCode || '—'}
                    </span>
                } />
                <KV label="PhoneNumbers (原始)" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-all' }}>
                        {sendParams.PhoneNumbers || '—'}
                    </span>
                } />
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

// ─── SMS API 响应 (Success) ───────────────────────────────────────────────

const SuccessSection: React.FC<{ success: NonNullable<Uart.logSmsSend['Success']> | undefined }> = ({ success }) => {
    if (!success) return null

    return (
        <>
            <SectionTitle
                icon={<CheckCircleOutlined />}
                title="API 响应"
                extra={
                    <StatusTag
                        variant={success.Code === 'OK' ? 'online' : 'warning'}
                        text={`Code: ${success.Code || '—'}`}
                    />
                }
            />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px 24px',
                    marginBottom: 16,
                }}
            >
                <KV label="Message" value={
                    <span style={{ fontWeight: 500 }}>{success.Message || '—'}</span>
                } />
                <KV label="BizId" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-all' }}>
                        {success.BizId || '—'}
                    </span>
                } />
                <KV label="RequestId" value={
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, wordBreak: 'break-all' }}>
                        {success.RequestId || '—'}
                    </span>
                } />
                <KV label="Code" value={
                    <StatusTag
                        variant={success.Code === 'OK' ? 'online' : 'warning'}
                        text={success.Code || '—'}
                        showDot={false}
                    />
                } />
            </div>
        </>
    )
}

// ─── 错误 (Error) ─────────────────────────────────────────────────────────

interface SmsErrorLike {
    code?: string | number
    message?: string
    stack?: string
    response?: any
}

const ErrorSection: React.FC<{ error: unknown }> = ({ error }) => {
    const normalized = useMemo<SmsErrorLike | null>(() => {
        if (error == null) return null
        if (typeof error === 'string') return { message: error }
        if (typeof error === 'object') return error as SmsErrorLike
        return { message: String(error) }
    }, [error])

    if (!normalized) return null

    const code = normalized.code
    const message = normalized.message
    const hasStack = !!normalized.stack

    return (
        <>
            <SectionTitle
                icon={<WarningOutlined />}
                title="错误信息"
                extra={<StatusTag variant="error" text="failed" />}
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
                        marginTop: 8,
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
        </>
    )
}

// ─── 顶层 Modal ───────────────────────────────────────────────────────────

interface SmsDetailModalProps {
    open: boolean
    record: Uart.logSmsSend | null
    onClose: () => void
}

export const SmsDetailModal: React.FC<SmsDetailModalProps> = ({ open, record, onClose }) => {
    return (
        <Modal
            title="短信详情"
            open={open}
            onCancel={onClose}
            footer={null}
            width={SMS_DETAIL_MODAL_WIDTH}
            destroyOnHidden
            styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
        >
            {record && (
                <div style={{ paddingTop: 8 }}>
                    <StatusBar record={record} />
                    <AddressSection tels={record.tels} />
                    <ContentSection
                        templateParam={record.sendParams?.TemplateParam}
                        templateCode={record.sendParams?.TemplateCode}
                    />
                    <SendParamsSection sendParams={record.sendParams} />
                    {record.Success ? (
                        <SuccessSection success={record.Success} />
                    ) : (
                        <ErrorSection error={record.Error} />
                    )}

                    {/* 文末: 调试用原始记录 */}
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
