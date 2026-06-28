'use client'

import { DeleteFilled, EditFilled, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Form, Input, message, Modal, Select, Space, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import React, { useEffect, useMemo } from 'react'
import { getProtocol, getProtocolSetup } from '@/lib/api/fetch'

import { usePromise } from '@/lib/hooks/usePromise'
import { addDevConstant } from '@/lib/api/fetchRoot'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { AiProtocolEmpty } from './AiProtocolEmpty'

interface ProtocolProps {
    protocolName: string
}

/**
 * 状态配置 tab (2026-06-28 重构)
 *
 * 之前设计 (bug):
 * - 从 ProtocolInstructFormrizeParse 解析 `instruct.formResize[].unit` (e.g. "{0,1,2}")
 *   生成 enum 字典 → Checkbox.Group
 * - AI 协议 unit="" → parse: {} → options 空 → 整个 tab 无可选项
 *   admin 截图 "状态配置现在都没办法配置"
 *
 * 重构后:
 * - Form + Table 模式 (跟「操作指令」「阈值配置」一致)
 * - Form: name (dropdown 从 instruct state fields 选) + alarmStat codes (逗号分隔字符串)
 * - Table: 已配置的 state field + alarmStat 状态码 (Tag 列表)
 * - 编辑/删除/上传保存
 *
 * 容错:
 * - 老 admin 协议: 27 个有 AlarmStat 配置 → Table 显示历史, admin 可编辑/删除/上传
 * - 老 AI 协议 (Sl6200LdsAir / UpsApcSmart3000 / UpsOnline3Phase): unit="" → 现在 admin
 *   可以手动从 instruct state fields 选 name + 输入告警状态码 → 上传保存
 * - 新 AI 协议 (E 方案后): AlarmStat 真写入 → admin 可编辑覆盖
 */
export const ProtocolAlarmStat: React.FC<ProtocolProps> = ({ protocolName }) => {
    const [form] = Form.useForm()

    const Protocol = usePromise(async () => {
        const el = await getProtocol(protocolName)
        return el.data
    })

    const { data, loading, fecth, setData } = usePromise<Uart.ConstantAlarmStat[]>(async () => {
        const { data } = await getProtocolSetup<Uart.ConstantAlarmStat>(protocolName, 'AlarmStat')
        return data.sys || []
    }, [])

    // instruct 里 isState=true 的 fields (dropdown options for Form.name)
    const stateFieldNames = useMemo(() => {
        const instructs = Protocol.data?.instruct
        if (!Array.isArray(instructs)) return [] as string[]
        const set = new Set<string>()
        instructs.forEach((ins: any) => {
            if (Array.isArray(ins.formResize)) {
                ins.formResize.forEach((fr: any) => {
                    if (fr?.isState === true && typeof fr.name === 'string') {
                        set.add(fr.name)
                    }
                })
            }
        })
        return Array.from(set)
    }, [Protocol.data])

    // 编辑行
    const edit = (item: Uart.ConstantAlarmStat) => {
        form.setFieldsValue({
            name: item.name,
            alarmStat: (item.alarmStat || []).join(','),
        })
    }

    // 删除行
    const deleteRow = (item: Uart.ConstantAlarmStat) => {
        Modal.confirm({
            content: `确认删除状态配置: ${item.name}?`,
            onOk() {
                const idx = (data || []).findIndex((el) => el.name === item.name)
                if (idx !== -1) {
                    const next = [...(data || [])]
                    next.splice(idx, 1)
                    setData(next)
                }
            },
        })
    }

    /**
     * 保存单行（添加到 data 或覆盖现有）
     */
    const save = (values: { name: string; alarmStat: string }) => {
        const codes = (values.alarmStat || '')
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean)
        if (!values.name || codes.length === 0) {
            message.warning('请填写状态名称和至少一个告警状态码')
            return
        }
        const next = [...(data || [])]
        const idx = next.findIndex((el) => el.name === values.name)
        const existing = idx !== -1 ? next[idx] : undefined
        const newRow: Uart.ConstantAlarmStat = {
            name: values.name,
            value: existing?.value ?? '',
            parseValue: existing?.parseValue ?? '',
            unit: existing?.unit ?? null,
            alarmStat: codes,
        }
        if (idx === -1) {
            next.unshift(newRow)
        } else {
            next.splice(idx, 1, newRow)
        }
        setData(next)
        form.setFieldsValue({ name: undefined, alarmStat: '' })
    }

    /**
     * 上传保存到 device.constants.AlarmStat
     */
    const uploadSave = () => {
        if (!Protocol.data) return
        const load = message.loading({ content: '上传中...' })
        addDevConstant(
            Protocol.data.ProtocolType,
            Protocol.data.Protocol,
            'AlarmStat',
            data || [],
        )
            .then(() => {
                load()
                message.success(`保存状态配置成功 (${(data || []).length} 条)`)
                fecth()
            })
            .catch((err: any) => {
                load()
                message.error(`保存失败: ${err?.message || err}`)
            })
    }

    // 编辑后 form 状态同步
    useEffect(() => {
        // 不主动重置, 由用户主动清空
    }, [])

    return (
        <>
            <Card title="状态配置" bordered={false}>
                <AiProtocolEmpty
                    typeName="状态配置"
                    typeKey="AlarmStat"
                    protocolName={protocolName}
                    source={Protocol.data?.source}
                    remark={Protocol.data?.remark}
                    empty={!loading && (!data || data.length === 0)}
                />

                <Form
                    form={form}
                    layout="inline"
                    initialValues={{ name: undefined, alarmStat: '' }}
                    onFinish={save}
                    style={{ marginBottom: 16, rowGap: 8 }}
                >
                    <Form.Item
                        name="name"
                        label="状态名称"
                        rules={[{ required: true, message: '请选择状态名称' }]}
                        style={{ minWidth: 220 }}
                    >
                        <Select
                            placeholder="从 instruct state fields 选"
                            showSearch
                            optionFilterProp="children"
                            allowClear
                        >
                            {stateFieldNames.map((n) => (
                                <Select.Option value={n} key={n}>
                                    {n}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="alarmStat"
                        label="告警状态码"
                        rules={[{ required: true, message: '请输入告警状态码' }]}
                        extra="多个用英文/中文逗号分隔，如 0,1,2,3 或 0，1，2，3"
                        style={{ minWidth: 360 }}
                    >
                        <Input placeholder="0,1,2,3" />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                                添加到列表
                            </Button>
                            <Button onClick={() => form.resetFields()}>清空</Button>
                        </Space>
                    </Form.Item>
                </Form>

                <Divider plain>已配置状态码 ({(data || []).length})</Divider>

                <Space style={{ marginBottom: 12 }}>
                    <Button type="primary" onClick={uploadSave} disabled={!data?.length}>
                        上传保存到设备
                    </Button>
                </Space>

                <Table
                    loading={loading}
                    dataSource={generateTableKey(data || [], 'name')}
                    pagination={false}
                    size="small"
                    rowKey="name"
                    columns={
                        [
                            { dataIndex: 'name', title: '状态名称', width: 240 },
                            {
                                title: '告警状态码',
                                render: (_, re: Uart.ConstantAlarmStat) => (
                                    <Space wrap size={4}>
                                        {(re.alarmStat || []).map((code, i) => (
                                            <Tag key={i} color="blue">
                                                {code}
                                            </Tag>
                                        ))}
                                        {!re.alarmStat?.length && (
                                            <span style={{ color: '#999', fontSize: 12 }}>—</span>
                                        )}
                                    </Space>
                                ),
                            },
                            {
                                key: 'oprate',
                                title: '操作',
                                width: 100,
                                render: (_, re) => (
                                    <Space>
                                        <EditFilled onClick={() => edit(re)} />
                                        <DeleteFilled onClick={() => deleteRow(re)} />
                                    </Space>
                                ),
                            },
                        ] as ColumnsType<Uart.ConstantAlarmStat>
                    }
                    locale={{ emptyText: '暂无配置，请在上方表单添加状态码后点击「上传保存」' }}
                />
            </Card>
        </>
    )
}

/**
 * 显示参数配置
 * @param param0
 * @returns
 */