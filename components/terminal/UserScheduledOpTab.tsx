'use client'

/**
 * 设备详情页「定时操作」Tab (user 端) (2026-06-30 决策 18)
 *
 * - 主体: ScheduledOpTable (api='user', 列表由后端按 createdBy 强制过滤)
 * - 此 tab 嵌在 /main/dev/[id] page, 由父级在 PageHeader 下方提供 Tabs
 */
import { ScheduledOpTable } from '@/components/scheduled-op/ScheduledOpTable'

interface UserScheduledOpTabProps {
    mac: string
    pid: number
}

export const UserScheduledOpTab: React.FC<UserScheduledOpTabProps> = ({ mac }) => {
    return <ScheduledOpTable api="user" fixedMac={mac} />
}
