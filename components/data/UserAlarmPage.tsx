'use client'
import { PlusOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Collapse, Descriptions, Empty, Form, Input, message, Modal, Space, Spin, Tabs } from "antd";
import React, { useState } from "react";
import {
    addAdminUserAlarmSetupProtocol,
    delAdminUserAlarmSetupProtocol,
    getUserAlarmSetup,
    initAdminUserAlarmSetupProtocol,
    initUserAlarmSetup,
} from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { ProtocolAlarmStatUser } from "@/components/protocol/ProtocolAlarmStatUser";
import { ProtocolShowTagUser } from "@/components/protocol/ProtocolShowTagUser";
import { ProtocolThresholdUser } from "@/components/protocol/ProtocolThresholdUser";
import { ProtocolsCascader } from "@/components/protocol/ProtocolsCascader";
import { EditableContact } from "./UserDes";

/**
 * Admin 端用户告警设置页 (server PR #119 配对 UI)
 *
 * 改动 (2026-07-27):
 * - 顶部加"新增协议"按钮 → 弹 modal 输入 protocol → add endpoint
 * - 每个 protocol entry (Collapse label 右侧) 加"初始化"+"删除"两个按钮
 *   - 初始化: 弹 confirm, 调 init endpoint (覆盖 ShowTag/Threshold/AlarmStat 为 DevConstant 默认)
 *   - 删除: 弹 confirm, 调 del endpoint ($pull entry)
 * - 调完任意一个接口后 fecth() 刷新整页 (跟现有 admin 端 mutation 模式一致)
 *
 * 错误处理: 4xx 走 message.error 显示后端 { message } 字段, 不只 generic error
 *   - 404 (协议在 DevConstant 不存在): 后端返 `{ message: '协议 X 在 DevConstant 中不存在' }`
 *   - 400 (protocol 字段缺失): 后端返 `{ message: 'protocol 字段不能为空' }`
 *
 * @returns
 */
export const UserAlarmPage: React.FC<{ user: string }> = ({ user }) => {

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getUserAlarmSetup(user)
        return data
    }, undefined)

    const [addOpen, setAddOpen] = useState(false)
    const [addForm] = Form.useForm<{ protocol: string }>()
    const [adding, setAdding] = useState(false)
    // Cascader 受控值: [ProtocolType, Protocol] 数组, 跟 ProtocolsCascader 内部 value 类型一致
    const [cascaderVal, setCascaderVal] = useState<string[]>([])

    /**
     * 整体初始化 — 跟 server 端 initUserAlarmSetup 走全量 init
     */
    const initSetup = async () => {
        const load = message.loading('loading')
        await initUserAlarmSetup(user)
        fecth()
        load()
    }

    /**
     * 单协议 init (server POST /:user/alarm-setup/protocols/:name/init)
     * 已存在 entry 覆盖 ShowTag/Threshold/AlarmStat 为 DevConstant 默认, 不存在 push
     */
    const initOne = async (protocol: string) => {
        const load = message.loading({ content: `正在重新初始化 ${protocol}…`, key: 'init' })
        try {
            const res: any = await initAdminUserAlarmSetupProtocol(user, protocol)
            // 修法: 跟 useDashboardStat.ts:60-64 一致 — BE 返 {code: 200, data} success / {code: 0, status: 4xx/5xx, message} error
            // 检查 status 字段 (HTTP 风格) 而非 code 字段 (避免 7/25 同样的 ship-blocker 颠倒)
            const httpStatus = res?.status ?? res?.code
            const isSuccess = typeof httpStatus === 'number' && httpStatus >= 200 && httpStatus < 300
            if (isSuccess) {
                message.success({ content: `${protocol} 初始化成功`, key: 'init' })
            } else {
                message.error({ content: res?.message || `${protocol} 初始化失败`, key: 'init' })
            }
        } catch (e: any) {
            // fetch-impl 把 4xx/5xx 包成 { code, data, msg }, message 字段在 msg 里
            const errBody = e?.message || e?.msg || JSON.stringify(e)
            message.error({ content: `初始化失败: ${errBody}`, key: 'init' })
        } finally {
            fecth()
        }
    }

    /**
     * 单协议 delete (server DELETE /:user/alarm-setup/protocols/:name)
     * 不存在 entry → 静默 no-op
     */
    const delOne = async (protocol: string) => {
        const load = message.loading({ content: `正在删除 ${protocol}…`, key: 'del' })
        try {
            const res: any = await delAdminUserAlarmSetupProtocol(user, protocol)
            const httpStatus = res?.status ?? res?.code
            const isSuccess = typeof httpStatus === 'number' && httpStatus >= 200 && httpStatus < 300
            if (isSuccess) {
                message.success({ content: `${protocol} 已删除`, key: 'del' })
            } else {
                message.error({ content: res?.message || `${protocol} 删除失败`, key: 'del' })
            }
        } catch (e: any) {
            const errBody = e?.message || e?.msg || JSON.stringify(e)
            message.error({ content: `删除失败: ${errBody}`, key: 'del' })
        } finally {
            fecth()
        }
    }

    /**
     * 新增协议 entry (server POST /:user/alarm-setup/protocols body { protocol })
     * 同 init 底层逻辑 (upsert from DevConstant), 缺 protocol → 400
     *
     * 现在走 Cascader 选协议 (跟 "为设备选协议" 体验一致), values.protocol
     * 是 Cascader 写入隐藏字段的字符串, 不需要 trim
     */
    const addOne = async () => {
        try {
            const values = await addForm.validateFields()
            setAdding(true)
            const res: any = await addAdminUserAlarmSetupProtocol(user, values.protocol)
            const httpStatus = res?.status ?? res?.code
            const isSuccess = typeof httpStatus === 'number' && httpStatus >= 200 && httpStatus < 300
            if (isSuccess) {
                message.success(`协议 ${values.protocol} 已添加`)
                setAddOpen(false)
                addForm.resetFields()
                setCascaderVal([])
            } else {
                message.error(res?.message || `新增协议失败`)
            }
        } catch (e: any) {
            // 表单校验失败 (e.errorFields) 不弹, antd Form 已经标红
            if (e?.errorFields) return
            // 4xx/5xx 网络错误
            const errBody = e?.message || JSON.stringify(e)
            message.error(`新增协议失败: ${errBody}`)
        } finally {
            setAdding(false)
            fecth()
        }
    }

    /**
     * 弹 confirm modal (Pattern: 用 antd Modal.confirm, 跟现有 admin 端 mutation 模式一致)
     */
    const confirmInit = (protocol: string) => {
        Modal.confirm({
            title: `重新初始化协议 ${protocol}?`,
            content: '现有 ShowTag / Threshold / AlarmStat 会被 DevConstant 默认值覆盖。该操作不可撤销。',
            okText: '确认初始化',
            okButtonProps: { danger: false },
            cancelText: '取消',
            onOk: () => initOne(protocol),
        })
    }

    const confirmDel = (protocol: string) => {
        Modal.confirm({
            title: `删除协议 ${protocol} 的告警配置?`,
            content: '该 entry 会从 ProtocolSetup[] 里移除, 现有阈值/状态/显示参数配置都会丢失。该操作不可撤销。',
            okText: '确认删除',
            okButtonProps: { danger: true },
            cancelText: '取消',
            onOk: () => delOne(protocol),
        })
    }

    const protocolList: any[] = Array.isArray((data as any)?.ProtocolSetup) ? (data as any).ProtocolSetup : []

    return (
        loading ? <Spin />
            : (
                !data
                    ? (
                        <Empty description="该用户尚未初始化告警配置">
                            <Button type="primary" onClick={() => initSetup()} icon={<SyncOutlined />}>
                                初始化告警配置
                            </Button>
                        </Empty>
                    )
                    : (
                        <>
                            <Space style={{ marginBottom: 16 }} wrap>
                                <Button type="primary" size="small" onClick={() => fecth()} icon={<ReloadOutlined />}>更新信息</Button>
                                <Button danger size="small" onClick={() => initSetup()} icon={<SyncOutlined />}>重新初始化</Button>
                                <Button size="small" onClick={() => setAddOpen(true)} icon={<PlusOutlined />}>新增协议</Button>
                            </Space>
                            <Descriptions>
                                <Descriptions.Item label="手机号">
                                    {data.tels && <EditableContact user={user} type="tels" values={data.tels} onUpdate={fecth} />}
                                </Descriptions.Item>
                                <Descriptions.Item label="邮箱">
                                    {data.mails && <EditableContact user={user} type="mails" values={data.mails} onUpdate={fecth} />}
                                </Descriptions.Item>
                                <Descriptions.Item label="微信">
                                    {data.wxs && <EditableContact user={user} type="wxs" values={data.wxs} onUpdate={fecth} />}
                                </Descriptions.Item>
                            </Descriptions>

                            {
                                protocolList.length > 0 && (
                                    <Collapse
                                        accordion
                                        ghost
                                        items={protocolList.map((el: any) => ({
                                            key: el.Protocol,
                                            label: (
                                                <Space>
                                                    <span>{el.Protocol}</span>
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        icon={<SyncOutlined />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            confirmInit(el.Protocol)
                                                        }}
                                                    >
                                                        初始化
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        danger
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            confirmDel(el.Protocol)
                                                        }}
                                                    >
                                                        删除
                                                    </Button>
                                                </Space>
                                            ),
                                            children: (
                                                <Tabs items={[
                                                    {
                                                        key: 'show',
                                                        label: '显示参数',
                                                        children: <ProtocolShowTagUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                    },
                                                    {
                                                        key: 'Threld',
                                                        label: '阈值配置',
                                                        children: <ProtocolThresholdUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                    },
                                                    {
                                                        key: 'stat',
                                                        label: '状态配置',
                                                        children: <ProtocolAlarmStatUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                    },
                                                ]} />
                                            ),
                                        }))}
                                    />
                                )
                            }

                            {/* 新增协议 Modal (server PR #119 配对) */}
                            <Modal
                                title="新增协议告警配置"
                                open={addOpen}
                                onOk={addOne}
                                onCancel={() => {
                                    setAddOpen(false)
                                    addForm.resetFields()
                                    setCascaderVal([])
                                }}
                                confirmLoading={adding}
                                okText="确认新增"
                                cancelText="取消"
                                destroyOnHidden
                            >
                                <Form
                                    form={addForm}
                                    layout="vertical"
                                    onFinish={addOne}
                                    preserve={false}
                                >
                                    {/* Cascader 单选 (跟 AddDevModelModal "为设备选协议" 体验一致):
                                        - 第一级选 ProtocolType (UPS/空调/电量仪/温湿度/IO, 跟 BE 端 5 个 ProtocolType 对齐)
                                        - 第二级选 Protocol 名字
                                        - 选完后 onChange 拿 val[1] 写到隐藏的 protocol 字段, 给 Form.validateFields 用
                                        - 体验: 用户不会输错协议名, 也不会调出 404 (BE 端只能在 DevConstant 已有协议里选)
                                    */}
                                    <Form.Item label="选择协议" required tooltip="协议名需在 DevConstant 中存在, 否则后端会返回 404">
                                        <ProtocolsCascader
                                            value={cascaderVal}
                                            onChange={(val: any) => {
                                                if (Array.isArray(val) && val.length >= 2) {
                                                    // val = [ProtocolType, Protocol]
                                                    setCascaderVal(val)
                                                    addForm.setFieldsValue({ protocol: val[1] })
                                                } else {
                                                    setCascaderVal([])
                                                    addForm.resetFields(['protocol'])
                                                }
                                            }}
                                        />
                                    </Form.Item>
                                    {/* 隐藏字段: 给 Form.validateFields 校验, 实际值由 Cascader 写入 */}
                                    <Form.Item
                                        name="protocol"
                                        hidden
                                        rules={[
                                            { required: true, message: '请选择协议' },
                                        ]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </>
                    )
            )

    )
}



/**
 * 展示用户日志信息
 * @param param0
 */
