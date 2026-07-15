'use client'
import { Modal, Form, Select, message } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { addTerminalMountDev, getTerminal } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { DevTypesCascader } from "@/components/protocol/DevTypesCascader";
interface addMountDev {
    /**
     * 是否显示
     */
    visible: boolean
    /**
     *
     */
    mac: string

    onCancel?: () => void;

    onChange?: () => void;
}

/**
 * 添加挂载设备
 * @returns
 */
export const TerminalAddMountDev: React.FC<addMountDev> = ({ visible, mac, onCancel, onChange }) => {

    /**
     * 新的挂载
     */
    const [mountDev, setMountDev] = useState<Uart.TerminalMountDevs>({
        pid: 1,
        protocol: '',
        mountDev: '',
        Type: "UPS"
    })

    /**
     * 弹窗打开时重置 (避免上次选择残留)
     */
    useEffect(() => {
        if (visible) {
            setMountDev({
                pid: 1,
                protocol: '',
                mountDev: '',
                Type: "UPS",
            });
        }
    }, [visible]);

    /**
     * 获取设备挂载下已使用的pids
     */
    const { data: mountDevPids } = usePromise(async () => {
        const { data } = await getTerminal(mac)
        return data.mountDevs ? data.mountDevs.map((el: any) => el.pid) : []
    }, [])




    const pids = useMemo(() => {
        const ns: number[] = []
        const pidSet = new Set(mountDevPids)
        for (let index = 0; index < 255; index++) {
            if (!pidSet.has(index)) ns.push(index)
        }
        return ns
    }, [mountDevPids])

    // Cascader 受控 value: [Type, mountDev, protocol]
    // 只有三段都填了才回显, 否则 undefined (显示 placeholder)
    const cascaderValue = useMemo<(string[] | undefined)>(() => {
        if (mountDev.Type && mountDev.mountDev && mountDev.protocol) {
            return [mountDev.Type, mountDev.mountDev, mountDev.protocol]
        }
        return undefined
    }, [mountDev.Type, mountDev.mountDev, mountDev.protocol])

    const postMountDev = () => {
        if (mountDev.protocol) {
            Modal.confirm({
                content: `确认添加地址[${mountDev.pid}]设备[${mountDev.mountDev}/${mountDev.protocol}]?`,
                onOk: () => {
                    const key = mac + mountDev.pid
                    message.loading({ content: '正在添加', key })
                    addTerminalMountDev(mac, mountDev).then(result => {
                        if (result.code === 200) {
                            message.success({ content: '添加成功', key })
                            onCancel && onCancel()
                            onChange && onChange()
                        } else {
                            message.warning({ content: "添加失败:" + result.message, key })
                        }
                    })
                }
            })
        }
    }

    return (
        <Modal
            title="添加设备"
            open={visible}
            confirmLoading={!mountDev.protocol}
            okText="添加"
            cancelText="取消"
            {...(onCancel !== undefined ? { onCancel } : {})}
            onOk={postMountDev}
            destroyOnHidden
        >
            <Form layout="vertical">
                <Form.Item label="设备协议" required>
                    <DevTypesCascader
                        value={cascaderValue}
                        placeholder="选择 Type / 设备型号 / 协议"
                        changeOnSelect={false}
                        onChange={(value: any) => {
                            if (Array.isArray(value) && value.length >= 3) {
                                setMountDev({
                                    ...mountDev,
                                    Type: value[0] as string,
                                    mountDev: value[1] as string,
                                    protocol: value[2] as string,
                                })
                            }
                        }}
                    />
                </Form.Item>
                <Form.Item label="设备地址 (pid)" required>
                    <Select
                        value={mountDev.pid}
                        placeholder="选择 PID (0-254 中未使用的)"
                        onChange={(pid: any) => setMountDev({ ...mountDev, pid })}
                        style={{ width: '100%' }}
                        showSearch
                        optionFilterProp="children"
                    >
                        {
                            pids.map(n => <Select.Option value={n} key={n}>{n}</Select.Option>)
                        }
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}
