'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Button,
    Checkbox,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Spin,
    Tag,
    message,
} from 'antd'
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    SearchOutlined,
    SwapOutlined,
} from '@ant-design/icons'
import { users as getUsers } from '@/lib/api/fetchRoot'
import { migrateUserResources, type MigrateUserResourcesReq } from '@/lib/api/endpoints/admin/users'
import SectionTitle from '@/components/common/SectionTitle'
import KVList from '@/components/common/KVList'

interface MigrateUserResourcesModalProps {
    visible: boolean
    /** 预填 fromUser (从 user 详情页打开) */
    fromUser?: string
    onCancel?: () => void
    onSuccess?: (result: Uart.MigrateUserResourcesResp) => void
}

type Mode = 'idle' | 'preview' | 'done'

/**
 * Admin: 用户资源迁移 modal
 *
 * 2026-07-13 cairui 拍板: admin user page 加快捷功能, 方便离职 user 资源转移
 * 流程: 选 fromUser/toUser → 填 reason → 勾选要迁的 4 类资源 → 预览 (dry-run) → 确认迁移
 * 视觉规则：复用现有 bento / glass token + 跟 hybrid.html 1:1
 */
export const MigrateUserResourcesModal: React.FC<MigrateUserResourcesModalProps> = ({
    visible,
    fromUser: fromUserProp,
    onCancel,
    onSuccess,
}) => {
    const [form] = Form.useForm()
    const [fromUser, setFromUser] = useState<string | undefined>(fromUserProp)
    const [toUser, setToUser] = useState<string | undefined>(undefined)
    const [migrateOpts, setMigrateOpts] = useState({
        devices: true,
        alarmSetups: true,
        scheduledOps: true,
        shareOwner: true,
    })
    const [fromSearchKw, setFromSearchKw] = useState('')
    const [toSearchKw, setToSearchKw] = useState('')
    const [fromOptions, setFromOptions] = useState<Uart.UserInfo[]>([])
    const [toOptions, setToOptions] = useState<Uart.UserInfo[]>([])
    const [searching, setSearching] = useState(false)
    const [mode, setMode] = useState<Mode>('idle')
    const [preview, setPreview] = useState<Uart.MigrateUserResourcesResp | null>(null)
    const [result, setResult] = useState<Uart.MigrateUserResourcesResp | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fromDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const toDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // === 同步 prop fromUser ===
    useEffect(() => {
        if (visible) {
            setFromUser(fromUserProp)
            setMode('idle')
            setPreview(null)
            setResult(null)
            form.setFieldsValue({
                fromUser: fromUserProp,
                reason: '',
                migrate: { devices: true, alarmSetups: true, scheduledOps: true, shareOwner: true },
            })
        }
    }, [visible, fromUserProp, form])

    // === 搜索 user (debounce 300ms) ===
    const searchUsers = async (kw: string, setter: (u: Uart.UserInfo[]) => void) => {
        if (!kw || kw.length < 1) {
            setter([])
            return
        }
        setSearching(true)
        try {
            const { data } = await getUsers({
                page: 1,
                pageSize: 20,
                needTotal: false,
                search: { user: kw, name: kw, tel: kw, mail: kw } as any,
            } as any)
            setter((data?.items ?? []) as Uart.UserInfo[])
        } catch {
            setter([])
        } finally {
            setSearching(false)
        }
    }

    const handleFromSearch = (kw: string) => {
        setFromSearchKw(kw)
        if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current)
        fromDebounceRef.current = setTimeout(() => searchUsers(kw, setFromOptions), 300)
    }

    const handleToSearch = (kw: string) => {
        setToSearchKw(kw)
        if (toDebounceRef.current) clearTimeout(toDebounceRef.current)
        toDebounceRef.current = setTimeout(() => searchUsers(kw, setToOptions), 300)
    }

    // === 提交 (dryRun=true 预览 / dryRun=false 确认迁移) ===
    const handleSubmit = async (dryRun: boolean) => {
        if (!fromUser) {
            message.warning('请先选择源用户 (fromUser)')
            return
        }
        if (!toUser) {
            message.warning('请先选择目标用户 (toUser)')
            return
        }
        if (fromUser === toUser) {
            message.warning('源用户和目标用户不能相同')
            return
        }
        const reason = (form.getFieldValue('reason') || '').trim()
        if (!reason) {
            message.warning('请填写迁移原因 (审计用)')
            return
        }

        const req: MigrateUserResourcesReq = {
            fromUser,
            toUser,
            dryRun,
            migrate: migrateOpts,
            reason,
        }
        setSubmitting(true)
        const key = `migrate-${dryRun ? 'preview' : 'commit'}`
        message.loading({
            content: dryRun ? '正在预览迁移范围…' : '正在执行资源迁移…',
            key,
            duration: 0,
        })
        try {
            const res = await migrateUserResources(req)
            message.destroy(key)
            if (res.code === 200 && res.data) {
                if (dryRun) {
                    setPreview(res.data)
                    setMode('preview')
                } else {
                    setResult(res.data)
                    setMode('done')
                    onSuccess?.(res.data)
                }
            } else {
                message.warning(res.message || (dryRun ? '预览失败' : '迁移失败'))
            }
        } catch (e: any) {
            message.destroy(key)
            const errMsg = e?.response?.data?.message || e?.message || '请求失败'
            const errCode = e?.response?.data?.status
            if (errCode === 404) {
                message.error('用户不存在: ' + errMsg)
            } else if (errCode === 409) {
                message.error('另一 admin 正在迁移该用户，请稍后重试 (30s 锁)')
            } else if (errCode === 403) {
                message.error('权限不足，仅 admin/root 可执行')
            } else if (errCode === 400) {
                message.error('参数错误: ' + errMsg)
            } else {
                message.error('请求失败: ' + errMsg)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleClose = () => {
        form.resetFields()
        setFromUser(fromUserProp)
        setToUser(undefined)
        setPreview(null)
        setResult(null)
        setMode('idle')
        onCancel?.()
    }

    const userOptionRender = (u: Uart.UserInfo) => (
        <Space size={6} style={{ width: '100%' }}>
            <span style={{ fontWeight: 500 }}>{u.name || u.user}</span>
            <span style={{ color: 'var(--ink-400)', fontSize: 12 }}>{u.user}</span>
            {u.tel && <Tag style={{ marginLeft: 'auto' }}>{u.tel}</Tag>}
            {u.userGroup && <Tag color="blue">{u.userGroup}</Tag>}
        </Space>
    )

    const previewSection = useMemo(() => {
        if (!preview) return null
        const { resources, fromUserInfo, toUserInfo } = preview
        return (
            <div style={{ marginTop: 16 }}>
                <SectionTitle
                    icon={<InfoCircleOutlined />}
                    title={`预览: ${fromUserInfo.name || fromUserInfo.user} → ${toUserInfo.name || toUserInfo.user}`}
                />
                <div
                    className="bento-card"
                    style={{ marginTop: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
                >
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>设备绑定</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--brand-600)' }}>
                            {resources.devices.totalMacs}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                            {resources.devices.userBindDeviceDocs} 文档 / {resources.devices.macs.slice(0, 3).join(', ')}
                            {resources.devices.macs.length > 3 && '…'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>告警设置</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--warning-600, #f59e0b)' }}>
                            {resources.alarmSetups.fromProtocolSetup_count}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                            {resources.alarmSetups.fromTels.length} 电话 / {resources.alarmSetups.fromMails.length} 邮箱
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>共享设备 (owner)</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--info-600, #3b82f6)' }}>
                            {resources.shareOwner.terminalsCount}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                            {resources.shareOwner.terminals.slice(0, 3).map((t) => t.DevMac).join(', ')}
                            {resources.shareOwner.terminals.length > 3 && '…'}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [preview])

    const resultSection = useMemo(() => {
        if (!result) return null
        return (
            <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16 }}
                message="迁移完成"
                description={
                    <div style={{ marginTop: 8 }}>
                        <KVList
                            column={2}
                            items={[
                                { label: '设备绑定', value: result.migrated.devices },
                                { label: '告警设置', value: result.migrated.alarmSetups },
                                { label: '定时操作', value: result.migrated.scheduledOps },
                                { label: '共享设备', value: result.migrated.shareOwner },
                                {
                                    label: '审计 ID',
                                    value: <code style={{ fontSize: 11 }}>{result._migrationLogId || '(no id)'}</code>,
                                },
                                { label: '操作人', value: result.by || '-' },
                                { label: '原因', value: result.reason || '-' },
                            ]}
                        />
                    </div>
                }
            />
        )
    }, [result])

    return (
        <Modal
            title={
                <Space>
                    <SwapOutlined style={{ color: 'var(--brand-600)' }} />
                    <span>用户资源迁移</span>
                    <Tag color="purple">离职转交</Tag>
                </Space>
            }
            open={visible}
            onCancel={handleClose}
            width={680}
            footer={
                mode === 'done' ? (
                    <Button type="primary" className="btn-brand" onClick={handleClose}>
                        完成
                    </Button>
                ) : (
                    <Space>
                        <Button onClick={handleClose} disabled={submitting}>
                            取消
                        </Button>
                        <Button
                            onClick={() => handleSubmit(true)}
                            loading={submitting}
                            disabled={mode === 'preview'}
                            icon={<SearchOutlined />}
                        >
                            预览 (dry-run)
                        </Button>
                        <Button
                            type="primary"
                            className="btn-brand"
                            onClick={() => handleSubmit(false)}
                            loading={submitting}
                            icon={<SwapOutlined />}
                        >
                            确认迁移
                        </Button>
                    </Space>
                )
            }
            destroyOnHidden
        >
            <Alert
                type="info"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
                message="离职 user 资源一键转交"
                description={
                    <>
                        把 <b>fromUser</b> (离职) 的设备绑定 / 告警设置 / 定时操作 / 共享设备 owner
                        4 类资源合并或转移到 <b>toUser</b> (在职)。
                        建议先 <b>预览 (dry-run)</b> 查看范围，确认无误后再执行。
                    </>
                }
            />

            <Form form={form} layout="vertical">
                <Form.Item label="源用户 (fromUser, 离职)" required>
                    <Select
                        showSearch
                        placeholder={fromUserProp ? `已选: ${fromUserProp}` : '搜索 user / 昵称 / 手机 / 邮箱'}
                        value={fromUser}
                        onChange={setFromUser}
                        onSearch={handleFromSearch}
                        filterOption={false}
                        notFoundContent={searching ? <Spin size="small" /> : '输入关键字搜索'}
                        optionLabelProp="label"
                        style={{ width: '100%' }}
                        disabled={!!fromUserProp}
                    >
                        {fromOptions.map((u) => (
                            <Select.Option key={u.user} value={u.user} label={u.name || u.user}>
                                {userOptionRender(u)}
                            </Select.Option>
                        ))}
                    </Select>
                    {fromUserProp && (
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
                            从用户详情页打开, 源用户已锁定
                        </div>
                    )}
                </Form.Item>

                <Form.Item label="目标用户 (toUser, 在职)" required>
                    <Select
                        showSearch
                        placeholder="搜索 user / 昵称 / 手机 / 邮箱 (不能是 admin/root)"
                        value={toUser}
                        onChange={setToUser}
                        onSearch={handleToSearch}
                        filterOption={false}
                        notFoundContent={searching ? <Spin size="small" /> : '输入关键字搜索'}
                        optionLabelProp="label"
                        style={{ width: '100%' }}
                    >
                        {toOptions.map((u) => (
                            <Select.Option key={u.user} value={u.user} label={u.name || u.user}>
                                {userOptionRender(u)}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="reason"
                    label="迁移原因 (审计必填)"
                    rules={[{ required: true, message: '请填写原因, 用于审计追溯' }]}
                >
                    <Input.TextArea
                        rows={2}
                        placeholder="例: 张三 2026-07-13 离职, 资源转给李四"
                        maxLength={200}
                        showCount
                    />
                </Form.Item>

                <Form.Item label="选迁资源 (默认全勾)">
                    <Checkbox.Group
                        value={Object.entries(migrateOpts)
                            .filter(([_, v]) => v)
                            .map(([k]) => k)}
                        onChange={(vals) => {
                            const next = { ...migrateOpts }
                            Object.keys(next).forEach((k) => {
                                next[k as keyof typeof next] = vals.includes(k)
                            })
                            setMigrateOpts(next)
                        }}
                        style={{ width: '100%' }}
                    >
                        <Space size={[16, 8]} wrap>
                            <Checkbox value="devices">设备绑定 (UTs/ECs/UTsShare/ECsShare)</Checkbox>
                            <Checkbox value="alarmSetups">告警设置 (tels/mails/wxs/ProtocolSetup)</Checkbox>
                            <Checkbox value="scheduledOps">定时操作 (P3 留口)</Checkbox>
                            <Checkbox value="shareOwner">共享设备 ownerId (P3 留口)</Checkbox>
                        </Space>
                    </Checkbox.Group>
                </Form.Item>
            </Form>

            {previewSection}
            {resultSection}
        </Modal>
    )
}

export default MigrateUserResourcesModal
