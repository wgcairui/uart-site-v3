'use client'
import { Modal, Form, Select, message } from "antd";
import React, { useMemo, useState } from "react";
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
        <Modal title="添加设备" open={visible} confirmLoading={!mountDev.protocol} {...(onCancel !== undefined ? { onCancel } : {})} onOk={postMountDev}>
            <Form>
                {<Form.Item label="设备协议">
                    <DevTypesCascader onChange={([Type, mountDe, protocol]) => {
                        setMountDev({ ...mountDev, Type: Type as string, protocol: protocol as string, mountDev: mountDe as string })
                    }}></DevTypesCascader>
                </Form.Item>}
                <Form.Item label="设备地址">
                    <Select defaultValue={mountDev.pid} onSelect={(pid: any) => setMountDev({ ...mountDev, pid })}>
                        {
                            pids.map(n => <Select.Option value={n} key={n}>{n}</Select.Option>)
                        }
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}
