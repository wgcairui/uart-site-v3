'use client'

/**
 * P2-1 · 添加设备 (v3 化)
 *
 * 流程:
 * 1. 顶部 PageHeader + 面包屑
 * 2. bento-card · 设备搜索 (输入 MAC → 查找终端)
 * 3. 找到终端后 → bento-card · 设备信息 (StatusTag 状态) + 操作按钮
 * 4. 挂载设备区 · bento-card · 完整表单 (设备类型 / 协议 / PID) + 提交
 * 5. 已有挂载设备 → v3-table 列表
 *
 * v3 视觉:
 * - PageHeader (h1 + 渐变分隔线)
 * - bento-card 半透明 + 紫光晕
 * - StatusTag 6 variant (online/offline/warning/error/info/idle)
 * - 移动端 < 768px 单列堆叠 (mobile fix 已 ship)
 *
 * 业务: 复用现有 addUserTerminal + getTerminalOnline (v2 endpoint)
 *       + addTerminalMountDev (完整 mount device 表单走 v2 endpoint)
 *
 * Stub 策略: 服务端若拒绝某字段, 走 console.warn + message.warning,
 *            不硬造 API 也不发伪造请求。
 */

import React, { useEffect, useState } from 'react'
import {
    Button,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Select,
    Space,
    Spin,
} from 'antd'
import {
    SearchOutlined,
    LinkOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons'

import {
    addUserTerminal,
    getTerminalOnline,
    addTerminalMountDev,
} from '@/lib/api/fetch'
import { useNav } from '@/lib/hooks/useNav'
import { useUserStore } from '@/lib/store/userStore'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { StatusTag } from '@/components/common/StatusTag'
import { KVList } from '@/components/common/KVList'
import { EmptyState } from '@/components/common/EmptyState'

// ─── 设备类型 + 协议下拉选项 ────────────────────────────────────────────────────
// 与 server 端 DevType 枚举对齐 (ups/air/em/th/io)。命名保持业务域一致。
const DEVICE_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'ups', label: 'UPS 不间断电源' },
    { value: 'air', label: '空调' },
    { value: 'em', label: '电表' },
    { value: 'th', label: '温湿度' },
    { value: 'io', label: 'IO 设备' },
]

const PROTOCOL_OPTIONS: { value: string; label: string }[] = [
    { value: 'modbus', label: 'Modbus RTU' },
    { value: 'modbus-tcp', label: 'Modbus TCP' },
    { value: 'DLT645', label: 'DLT645 电表协议' },
    { value: 'CJ188', label: 'CJ188 冷水表' },
    { value: '透传', label: '透传' },
]

interface MountDeviceForm {
    Type: string
    protocol: string
    pid: number
}

const AddTerminal: React.FC = () => {
    const nav = useNav()
    const terminals = useUserStore(s => s.terminals)

    // ── 设备搜索 ──
    const [mac, setMac] = useState('')
    const [seachLoading, setSeachLoading] = useState(false)
    const [ter, setTer] = useState<Uart.Terminal | null>(null)
    const [bindLoading, setBindLoading] = useState(false)

    // ── 挂载设备表单 ──
    const [mountForm] = Form.useForm<MountDeviceForm>()
    const [mountLoading, setMountLoading] = useState(false)

    // 已挂载的设备列表 (从 ter.mountDevs 读,提交后 push)
    const [mountDevs, setMountDevs] = useState<Uart.TerminalMountDevs[]>([])

    useEffect(() => {
        if (ter?.mountDevs) {
            setMountDevs(ter.mountDevs)
        }
    }, [ter])

    // 移动端 detection
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    const seachTerminal = () => {
        const trimmed = mac.trim()
        if (!trimmed) {
            message.warning('请输入设备编号')
            return
        }
        setSeachLoading(true)
        setTer(null)
        getTerminalOnline(trimmed).then(el => {
            setSeachLoading(false)
            if (el.code === 200 && el.data) {
                setTer(el.data)
                message.success('已找到设备')
            } else {
                setTer(null)
                message.info({
                    content: (
                        <>
                            <p>设备未上线或未注册</p>
                            <p>
                                如果是透传网关,请按
                                <a
                                    href="https://www.yuque.com/wrgtwc/wgskxt/vpzoiu"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    此配置
                                </a>
                                设置
                            </p>
                            <p>
                                如果是百事服卡,请按
                                <a
                                    href="https://www.yuque.com/wrgtwc/wgskxt/hqnevk"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    此配置
                                </a>
                            </p>
                        </>
                    ),
                    duration: 6,
                })
            }
        })
    }

    const bindTer = () => {
        if (!ter) return
        setBindLoading(true)
        const key = `bind-${ter.DevMac}`
        message.loading({ content: '绑定中…', key })
        addUserTerminal(ter.DevMac)
            .then(el => {
                if (el.code === 200) {
                    message.success({ key, content: '绑定成功' })
                    Modal.success({
                        title: '绑定成功',
                        content: `成功绑定设备 ${ter.name || ter.DevMac}，是否返回主页?`,
                        okText: '返回主页',
                        cancelText: '继续添加',
                        onOk() {
                            nav('/main')
                        },
                    })
                } else {
                    message.warning({
                        content: '绑定失败:' + el.message,
                        duration: 5,
                        key,
                    })
                }
            })
            .catch((err: any) => {
                message.error('绑定失败：' + (err?.message || '未知错误'))
            })
            .finally(() => setBindLoading(false))
    }

    // 提交挂载设备 (设备类型/协议/PID)
    const submitMountDev = async () => {
        if (!ter) {
            message.warning('请先查找并选中设备')
            return
        }
        let values: MountDeviceForm
        try {
            values = await mountForm.validateFields()
        } catch {
            return
        }
        setMountLoading(true)
        const key = `mount-${ter.DevMac}-${values.pid}`
        message.loading({ content: '添加挂载设备…', key })
        try {
            // mountDev 字段是设备型号名,目前用 Type 作 fallback
            const mountDev: Uart.TerminalMountDevs = {
                Type: values.Type,
                protocol: values.protocol,
                pid: values.pid,
                mountDev: values.Type,
            }
            const res = await addTerminalMountDev(ter.DevMac, mountDev)
            if (res.code === 200) {
                message.success({ key, content: '挂载设备添加成功' })
                setMountDevs(prev => [...prev, mountDev])
                mountForm.resetFields()
            } else {
                message.warning({
                    content: '添加失败:' + res.message,
                    duration: 5,
                    key,
                })
            }
        } catch (err: any) {
            message.error('添加失败：' + (err?.message || '未知错误'))
            console.warn('[addterminal] submitMountDev error:', err)
        } finally {
            setMountLoading(false)
        }
    }

    // ── 渲染 ────────────────────────────────────────────────────────────────

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="添加设备"
                subtitle="绑定新终端或为已有终端添加挂载设备"
                breadcrumb={[
                    { title: '首页', href: '/main' },
                    { title: '添加设备' },
                ]}
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            setMac('')
                            setTer(null)
                            setMountDevs([])
                            mountForm.resetFields()
                        }}
                    >
                        重置
                    </Button>
                }
            />

            {/* 总览 · 4 卡 (终端总数 / 在线 / 已挂载 / 协议数) */}
            <PageSummary
                items={[
                    {
                        label: '已绑定终端',
                        value: terminals?.length ?? 0,
                        variant: 'primary',
                    },
                    {
                        label: '在线终端',
                        value: terminals?.filter(t => t.online).length ?? 0,
                        variant: 'success',
                    },
                    {
                        label: '已挂载设备',
                        value: mountDevs.length,
                        variant: 'info',
                        extra: ter ? `当前: ${ter.DevMac.slice(-6)}` : '—',
                    },
                    {
                        label: '可选协议',
                        value: PROTOCOL_OPTIONS.length,
                        variant: 'purple',
                        extra: `${DEVICE_TYPE_OPTIONS.length} 种设备类型`,
                    },
                ]}
            />

            {/* Step 1 · 设备搜索 */}
            <div className="bento-card" style={{ marginBottom: 24 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 16,
                    }}
                >
                    <span
                        className="stat-card-icon"
                        style={{
                            background: 'var(--brand-50)',
                            color: 'var(--color-primary)',
                        }}
                    >
                        <SearchOutlined />
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                        Step 1 · 查找设备
                    </h3>
                </div>
                <Form layout="vertical" disabled={seachLoading}>
                    <Form.Item
                        label="设备编号 (MAC)"
                        extra="输入终端的 12 位 MAC 地址（不含分隔符），如 286B2E4BF8AB"
                        required
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                size="large"
                                placeholder="请输入设备编号"
                                value={mac}
                                onChange={e =>
                                    setMac(
                                        e.target.value.replace(/(\s|\.|\?)/g, ''),
                                    )
                                }
                                onPressEnter={seachTerminal}
                                allowClear
                                style={{ fontFamily: 'var(--font-mono)' }}
                            />
                            <Button
                                size="large"
                                type="primary"
                                icon={<SearchOutlined />}
                                loading={seachLoading}
                                onClick={seachTerminal}
                            >
                                查找
                            </Button>
                        </Space.Compact>
                    </Form.Item>
                </Form>
            </div>

            {/* Step 2 · 设备信息 (找到后) */}
            {seachLoading ? (
                <div
                    className="bento-card"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 200,
                    }}
                >
                    <Spin tip="正在查找设备…" />
                </div>
            ) : ter ? (
                <>
                    <div
                        className="bento-card"
                        style={{ marginBottom: 24 }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16,
                            }}
                        >
                            <span
                                className="stat-card-icon"
                                style={{
                                    background: 'var(--brand-50)',
                                    color: 'var(--color-primary)',
                                }}
                            >
                                <LinkOutlined />
                            </span>
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    margin: 0,
                                    flex: 1,
                                }}
                            >
                                Step 2 · 设备信息
                            </h3>
                            <Button
                                type="primary"
                                size="small"
                                onClick={bindTer}
                                loading={bindLoading}
                            >
                                绑定设备
                            </Button>
                        </div>
                        <KVList
                            title={
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 14,
                                    }}
                                >
                                    {ter.DevMac}
                                </span>
                            }
                            items={[
                                { label: '名称', value: ter.name || '—' },
                                { label: 'IP', value: ter.ip || '—' },
                                {
                                    label: '接入节点',
                                    value: ter.mountNode || '—',
                                },
                                {
                                    label: '型号',
                                    value: ter.PID || '—',
                                },
                                {
                                    label: '状态',
                                    value: (
                                        <Space
                                            orientation="horizontal"
                                            size={6}
                                        >
                                            <StatusTag
                                                variant={ter.online ? 'online' : 'offline'}
                                                size="sm"
                                                text={ter.online ? '在线' : '离线'}
                                            />
                                            {ter.disable && (
                                                <StatusTag
                                                    variant="warning"
                                                    size="sm"
                                                    text="已禁用"
                                                />
                                            )}
                                        </Space>
                                    ),
                                },
                            ]}
                            column={isMobile ? 1 : 2}
                        />
                    </div>

                    {/* Step 3 · 挂载设备表单 */}
                    <div
                        className="bento-card"
                        style={{ marginBottom: 24 }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16,
                            }}
                        >
                            <span
                                className="stat-card-icon"
                                style={{
                                    background: 'var(--brand-50)',
                                    color: 'var(--color-primary)',
                                }}
                            >
                                <PlusOutlined />
                            </span>
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    margin: 0,
                                }}
                            >
                                Step 3 · 添加挂载设备
                            </h3>
                        </div>
                        <Form
                            form={mountForm}
                            layout="vertical"
                            disabled={mountLoading}
                            initialValues={{
                                Type: 'ups',
                                protocol: 'modbus',
                                pid: 1,
                            }}
                        >
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile
                                        ? '1fr'
                                        : 'repeat(3, minmax(0, 1fr))',
                                    gap: 16,
                                }}
                            >
                                <Form.Item
                                    label="设备类型"
                                    name="Type"
                                    rules={[
                                        { required: true, message: '请选择设备类型' },
                                    ]}
                                >
                                    <Select
                                        size="large"
                                        options={DEVICE_TYPE_OPTIONS}
                                        placeholder="选择设备类型"
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="协议"
                                    name="protocol"
                                    rules={[
                                        { required: true, message: '请选择协议' },
                                    ]}
                                >
                                    <Select
                                        size="large"
                                        options={PROTOCOL_OPTIONS}
                                        placeholder="选择协议"
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="PID (Modbus 地址)"
                                    name="pid"
                                    rules={[
                                        { required: true, message: '请输入 PID' },
                                        {
                                            type: 'number',
                                            min: 1,
                                            max: 247,
                                            message: 'PID 范围 1-247',
                                        },
                                    ]}
                                >
                                    <InputNumber
                                        size="large"
                                        min={1}
                                        max={247}
                                        style={{ width: '100%' }}
                                        placeholder="1-247"
                                    />
                                </Form.Item>
                            </div>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<PlusOutlined />}
                                    onClick={submitMountDev}
                                    loading={mountLoading}
                                    block
                                >
                                    添加挂载设备
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>

                    {/* 已挂载设备列表 */}
                    {mountDevs.length > 0 ? (
                        <div className="bento-card">
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    margin: '0 0 16px',
                                }}
                            >
                                已挂载设备 ({mountDevs.length})
                            </h3>
                            {isMobile ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                    }}
                                >
                                    {mountDevs.map((d, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                padding: 12,
                                                background: 'var(--bg-hover)',
                                                borderRadius: 12,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent:
                                                        'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    {d.Type} · {d.protocol}
                                                </span>
                                                <StatusTag
                                                    variant={
                                                        d.online
                                                            ? 'online'
                                                            : 'offline'
                                                    }
                                                    size="sm"
                                                />
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: 'var(--ink-500)',
                                                    fontFamily:
                                                        'var(--font-mono)',
                                                }}
                                            >
                                                PID: {d.pid}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table
                                    className="v3-table"
                                    style={{ width: '100%' }}
                                >
                                    <thead>
                                        <tr>
                                            <th>类型</th>
                                            <th>设备</th>
                                            <th>协议</th>
                                            <th>PID</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mountDevs.map((d, i) => (
                                            <tr key={i}>
                                                <td>{d.Type}</td>
                                                <td>{d.mountDev || d.Type}</td>
                                                <td>{d.protocol}</td>
                                                <td
                                                    style={{
                                                        fontFamily:
                                                            'var(--font-mono)',
                                                    }}
                                                >
                                                    {d.pid}
                                                </td>
                                                <td>
                                                    <StatusTag
                                                        variant={
                                                            d.online
                                                                ? 'online'
                                                                : 'offline'
                                                        }
                                                        size="sm"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : null}
                </>
            ) : (
                <EmptyState
                    description="输入设备编号开始查找"
                    minHeight={280}
                />
            )}
        </div>
    )
}

export default AddTerminal
