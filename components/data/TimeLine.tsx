'use client'
import dayjs from "dayjs"
import React, { useState } from "react"
import { usePromise } from "@/lib/hooks/usePromise"

interface TimelineProps {
    mac: string
    pid: number | string
    name: string
}

export const TimeLine: React.FC<TimelineProps> = ({ mac, pid, name }) => {

    const [date] = useState(dayjs())

    // getTerminalDatas not available in v3 API
    usePromise(async () => {
        return [] as any[]
    }, [], [date])

    return (
        <>
        </>
    )
}
