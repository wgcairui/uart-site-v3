'use client'

/**
 * 终端详情页「定时操作」Tab (admin 端) (2026-06-30 决策 18)
 *
 * - 主体: ScheduledOpTable (固定 mac 过滤, 仅看本终端的任务)
 * - "快速新建" 按钮组: 收集 terminal 所有 mountDev 的协议操作指令 (instruct.name),
 *   点一下弹 ScheduleOpModal (admin 端 content = instruct.name 裸字符串)
 */
import { ScheduledOpTable } from '@/components/scheduled-op/ScheduledOpTable'
import { ScheduleOpModal } from '@/components/scheduled-op/ScheduleOpModal'
import { Button, Space, Spin } from 'antd'
import { useState } from 'react'
import { usePromise } from '@/lib/hooks/usePromise'
import { adminGetTerminal, getProtocols } from '@/lib/api/fetchRoot'

interface AdminScheduledOpTabProps {
    mac: string
}

interface QuickInstruct {
    name: string
    pid: number
    protocol: string
}

export const AdminScheduledOpTab: React.FC<AdminScheduledOpTabProps> = ({ mac }) => {
    const [createOpen, setCreateOpen] = useState(false)
    const [pendingItem, setPendingItem] = useState<Uart.OprateInstruct | null>(null)
    const [pendingPid, setPendingPid] = useState<number>(0)
    const [pendingProtocol, setPendingProtocol] = useState<string>('')

    const { data: quickList, loading } = usePromise<QuickInstruct[]>(
        async () => {
            const { data: term } = await adminGetTerminal(mac)
            // 拉所有协议 (admin 端无 getProtocol(name) 单查, 走 list 拉全集 + 客户端过滤)
            const { data: protPage } = await getProtocols({ page: 1, pageSize: 500 })
            const protMap = new Map<string, Uart.protocol>(
                (protPage?.items ?? []).map((p) => [p.Protocol, p])
            )
            const result: QuickInstruct[] = []
            for (const md of term?.mountDevs ?? []) {
                if (!md.protocol) continue
                const prot = protMap.get(md.protocol)
                if (!prot) continue
                for (const ins of prot.instruct ?? []) {
                    if (!ins.isUse) continue
                    result.push({
                        name: ins.name,
                        pid: md.pid,
                        protocol: md.protocol,
                    })
                }
            }
            return result
        },
        [],
        [mac]
    )

    const handlePick = (q: QuickInstruct) => {
        const item: Uart.OprateInstruct = {
            name: q.name,
            value: q.name,
            bl: '1',
            readme: '',
            tag: q.name,
        }
        setPendingItem(item)
        setPendingPid(q.pid)
        setPendingProtocol(q.protocol)
        setCreateOpen(true)
    }

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space wrap>
                <span style={{ color: 'var(--ink-500)' }}>快速新建 (按协议指令名):</span>
                {loading && <Spin size="small" />}
                {(quickList ?? []).slice(0, 16).map((q) => (
                    <Button
                        key={`${q.protocol}:${q.pid}:${q.name}`}
                        size="small"
                        onClick={() => handlePick(q)}
                    >
                        {q.pid}:{q.name}
                    </Button>
                ))}
            </Space>
            <ScheduledOpTable api="admin" fixedMac={mac} />
            {pendingItem && (
                <ScheduleOpModal
                    open={createOpen}
                    mac={mac}
                    pid={pendingPid}
                    item={pendingItem}
                    protocolName={pendingProtocol}
                    api="admin"
                    onCancel={() => {
                        setCreateOpen(false)
                        setPendingItem(null)
                    }}
                />
            )}
        </Space>
    )
}
