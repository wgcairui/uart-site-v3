'use client'

/**
 * 立即发送 / 定时发送 共享 Modal (2026-06-30 决策 18 第一阶段)
 *
 * 流程:
 * 1. 调用方调 buildInstructItem 拿到组装好的 OprateInstruct
 * 2. 弹此 Modal, 让用户选 "立即发送" / "定时发送"
 * 3. 不勾: 调 sendInstructNow (admin/user 走不同 endpoint)
 * 4. 勾上 + 选 scheduledAt: 调 sendInstructScheduled (入 BullMQ delayed job)
 *
 * 校验:
 * - scheduledAt 必须 > now+30s (留 BullMQ 调度余量)
 * - remark ≤ 256 字符
 */
import { Button, Checkbox, DatePicker, Form, Input, Modal, Space, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useState } from 'react'
import { sendInstructNow, sendInstructScheduled, showSendResult } from '@/lib/utils/sendInstruct'

interface ScheduleOpModalProps {
    open: boolean
    mac: string
    pid: number
    item: Uart.OprateInstruct
    protocolName: string
    mountDev?: string
    api: 'admin' | 'user'
    onCancel: () => void
    onSuccess?: (kind: 'now' | 'scheduled', id?: string) => void
}

const MIN_DELAY_MS = 30_000 // 最小延迟 30s, 留 BullMQ 调度余量
const MAX_REMARK = 256

export const ScheduleOpModal: React.FC<ScheduleOpModalProps> = (props) => {
    const { open, mac, pid, item, protocolName, mountDev, api, onCancel, onSuccess } = props

    const [schedule, setSchedule] = useState(false)
    const [scheduledAt, setScheduledAt] = useState<Dayjs | null>(dayjs().add(5, 'minute'))
    const [remark, setRemark] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleOk = async () => {
        if (schedule) {
            if (!scheduledAt) {
                message.error('请选择计划触发时间')
                return
            }
            const ts = scheduledAt.valueOf()
            if (ts <= Date.now() + MIN_DELAY_MS) {
                message.error('计划触发时间必须晚于当前时间 30 秒')
                return
            }
            if (remark.length > MAX_REMARK) {
                message.error(`备注不能超过 ${MAX_REMARK} 字符`)
                return
            }
        }

        setSubmitting(true)
        try {
            if (!schedule) {
                const r = await sendInstructNow(api, mac, pid, item, protocolName, mountDev)
                showSendResult(r)
                onSuccess?.('now')
            } else {
                const r = await sendInstructScheduled({
                    api,
                    mac,
                    pid,
                    item,
                    protocolName,
                    scheduledAt: scheduledAt!.valueOf(),
                    ...(remark ? { remark } : {}),
                })
                message.success(
                    `定时操作已创建, 计划于 ${scheduledAt!.format('YYYY-MM-DD HH:mm:ss')} 触发`
                )
                onSuccess?.('scheduled', r.id)
            }
            onCancel()
        } catch (err) {
            message.error((err as Error).message || '操作失败')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            title={`操作指令 - ${item.name}${schedule ? ' (定时发送)' : ' (立即发送)'}`}
            onCancel={onCancel}
            destroyOnClose
            footer={[
                <Button key="cancel" onClick={onCancel} disabled={submitting}>
                    取消
                </Button>,
                <Button
                    key="ok"
                    type="primary"
                    loading={submitting}
                    onClick={handleOk}
                >
                    {schedule ? '定时发送' : '立即发送'}
                </Button>,
            ]}
        >
            <Form layout="vertical">
                <Form.Item label="指令">
                    <Input value={item.value} disabled />
                </Form.Item>
                {item.value.includes('%i') && (
                    <Form.Item label="参数值 (val)">
                        <Input value={item.val ?? ''} disabled />
                    </Form.Item>
                )}
                <Form.Item>
                    <Checkbox
                        checked={schedule}
                        onChange={(e) => setSchedule(e.target.checked)}
                    >
                        定时发送 (创建定时任务, BullMQ 到点自动触发)
                    </Checkbox>
                </Form.Item>
                {schedule && (
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Form.Item
                            label="计划触发时间"
                            required
                            extra={`需晚于当前时间 30s 以上, 后端 BullMQ 会按这个时间入队 delayed job`}
                        >
                            <DatePicker
                                showTime
                                value={scheduledAt}
                                onChange={setScheduledAt}
                                format="YYYY-MM-DD HH:mm:ss"
                                disabledDate={(d) => d.isBefore(dayjs().startOf('minute'))}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item
                            label="备注 (可选)"
                            extra={`最多 ${MAX_REMARK} 字符, 用于说明业务场景`}
                        >
                            <Input.TextArea
                                rows={2}
                                maxLength={MAX_REMARK}
                                showCount
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="例如: 下班前关闭空调"
                            />
                        </Form.Item>
                    </Space>
                )}
            </Form>
        </Modal>
    )
}
