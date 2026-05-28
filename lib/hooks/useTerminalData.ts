'use client'
import { useEffect, useState } from "react"
import { getTerminal, getTerminalData } from "@/lib/api/fetch"
import { subscribeEvent, unSubscribeEvent } from "@/lib/socket"
import { usePromise } from "./usePromise"

/**
 * 获取设备数据最新状态
 * @param mac
 * @param pid
 * @returns
 */
export const useTerminalData = (mac: string, pid: string | number) => {

    const event = mac + pid

    const data = usePromise(async () => {
        const { data } = await getTerminalData(mac, pid)
        return data
    }, undefined, [mac, pid])

    /**
     * 订阅设备数据更新,
     * 注销时取消订阅
     */
    useEffect(() => {
        const n = subscribeEvent(event, () => data.fecth())
        return () => unSubscribeEvent(event, n)
    }, [mac, pid])

    return data
}


type setTerminals = (value: React.SetStateAction<Uart.Terminal[]> & React.SetStateAction<Uart.Terminal[]>) => void

/**
 * 监听设备变更
 * @param macs 监听设备mac数组
 * @param set 设备变更set
 * @param Call 获取设备设备数据回调
 * @returns
 */
export const useTerminalUpdate = (macs: string[], setData?: setTerminals, Call?: (data: Uart.Terminal) => void) => {

    const [mac, setMac] = useState<string>('')

    /**
     * 监听数组
     */
    useEffect(() => {
        const sets = new Set(macs)
        const n = subscribeEvent("MacUpdate", ({ data }) => {
            if (sets.has(data.mac)) {
                setMac(data.mac)
            }
        })
        return () => unSubscribeEvent("MacUpdate", n)
    }, [macs])


    /**
     * 获取终端数据
     */
    const ter = usePromise(async () => {
        if (mac) {
            const { data } = await getTerminal(mac)
            Call && Call(data)
            return data
        }
    }, undefined, [mac])

    /**
     * 更新数据
     */
    useEffect(() => {
        const data = ter.data
        if (setData && data) {
            setData(terminals => {
                const i = terminals.findIndex(el => el.DevMac === data.DevMac)
                terminals.splice(i, 1, data!)
                return [...terminals]
            })
        }
    }, [ter.data])
    return ter
}
