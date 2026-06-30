'use client'

/**
 * 4 个 user 端 DevXxx 组件共用的「操作指令发送」hook
 *
 * 替代 lib/utils/util.ts 的 sendOprateInstruct, 改为弹 ScheduleOpModal
 * (支持 "立即发送" + "定时发送" 二选一)
 *
 * 用法:
 *   const { openScheduleOp, ScheduleOpModalPortal } = useScheduleOpModal()
 *   onClick={() => openScheduleOp({ mac, pid, tag, value })}
 *   return (<>{ScheduleOpModalPortal}</>)
 *
 * 注意: 因为 hook 不能直接返回 JSX (无 render 上下文), 改返回 React 节点,
 * 父组件在 JSX 里直接 render
 */
import { useCallback, useState } from 'react'
import { message } from 'antd'
import { ScheduleOpModal } from '@/components/scheduled-op/ScheduleOpModal'
import { buildInstructItem } from '@/lib/utils/sendInstruct'
import { getTerminalPidProtocol } from '@/lib/api/fetch'

interface OpenArgs {
    mac: string
    pid: number | string
    tag: string
    value?: number
    mountDev?: string
}

export const useScheduleOpModal = () => {
    const [open, setOpen] = useState(false)
    const [mac, setMac] = useState('')
    const [pid, setPid] = useState(0)
    const [mountDev, setMountDev] = useState('')
    const [item, setItem] = useState<Uart.OprateInstruct | null>(null)
    const [protocolName, setProtocolName] = useState('')

    const openScheduleOp = useCallback(async (args: OpenArgs) => {
        try {
            // 同时取 protocolName + build item, 一次拉取到位
            const { data: md } = await getTerminalPidProtocol(args.mac, args.pid)
            if (!md?.protocol) {
                message.error('未找到设备协议')
                return
            }
            const built = await buildInstructItem(
                'user',
                args.mac,
                args.pid,
                args.tag,
                args.value
            )
            setMac(args.mac)
            setPid(Number(args.pid))
            setMountDev(args.mountDev ?? md.mountDev)
            setItem(built)
            setProtocolName(md.protocol)
            setOpen(true)
        } catch (err) {
            message.error((err as Error).message || '操作失败')
        }
    }, [])

    const handleSuccess = useCallback(
        (_kind: 'now' | 'scheduled', _id?: string) => {
            // 成功消息 ScheduleOpModal 内部已发, 这里不重复
        },
        []
    )

    // 不返回 JSX, 返回 scheduleOpModal 状态让父组件自己渲染 (避免 SWC/TS 在
    // hook 文件内编译 JSX 报 "Expected '>'" 之类的解析错 — 推测是 Next 16 / Turbopack
    // 对 client hook 内 JSX 的类型推断路径有边角 case, 直接绕开)
    const isOpen = open
    const currentItem = item
    const currentMac = mac
    const currentPid = pid
    const currentMountDev = mountDev
    const currentProtocol = protocolName
    const closeModal = () => {
        setOpen(false)
        setItem(null)
    }

    return {
        openScheduleOp,
        // 父组件用 <ScheduleOpModalHost ... /> 渲染 (见 useScheduleOpModalHost)
        isOpen,
        currentItem,
        currentMac,
        currentPid,
        currentMountDev,
        currentProtocol,
        closeModal,
        handleSuccess,
    }
}
