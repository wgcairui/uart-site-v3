'use client'

/**
 * MonitorCenter · 监控中心 (3 sub-tab + 徽标)
 *
 * 合并原 告警日志 + 设备通信日志 + 时间线 3 个 tab。
 * - 未确认告警徽标 (从告警日志接口拉一次, 24h 内)
 * - sub-tab 用 Segmented (比 antd Tabs 视觉轻, 跟 DebugCenter 一致)
 */

import { Segmented, Badge, Tabs, Empty } from 'antd'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertOutlined,
  CommentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { AlarmLogTab } from './AlarmLogTab'
import { LogTerminal } from './LogTerminal'
import { TerminalTimelineTab } from './TerminalTimelineTab'
import { loguartterminaldatatransfinites } from '@/lib/api/fetchRoot'
import dayjs from 'dayjs'

interface MonitorCenterProps {
  mac: string
}

type SubView = 'alarm' | 'log' | 'timeline'

export function MonitorCenter({ mac }: MonitorCenterProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const initView = (sp.get('mon') as SubView) || 'alarm'
  const [view, setView] = useState<SubView>(initView)
  const [unackCount, setUnackCount] = useState(0)

  // 拉最近 24h 告警, 计算未确认数
  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      try {
        const start = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
        const end = dayjs().format('YYYY-MM-DD')
        const { data, code } = await loguartterminaldatatransfinites(start, end, { page: 1, pageSize: 1 })
        if (cancelled || code !== 200) return
        // total 包含所有告警; 未确认 isOk=false 的需要拉详情 — 这里先 total 当粗估
        // 准确做法: 后端加轻量 count 接口, 或者临时拉全 page
        // 取折中: 直接读 pagination.total 展示
        setUnackCount(data?.pagination?.total ?? 0)
      } catch {
        // best-effort
      }
    }
    fetchCount()
    return () => { cancelled = true }
  }, [mac])

  const handleView = (v: string | number) => {
    const next = v as SubView
    setView(next)
    const url = new URL(window.location.href)
    url.searchParams.set('mon', next)
    window.history.pushState({}, '', url.toString())
  }

  return (
    <div
      className="bento-card"
      style={{
        padding: 20,
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'var(--shadow-bento)',
        borderRadius: 'var(--radius-2xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}
        >
          <AlertOutlined />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>监控中心</h3>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
            告警 · 通信 · 时间线
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {unackCount > 0 && (
            <Badge
              count={unackCount}
              style={{ backgroundColor: '#ef4444' }}
              title="最近 24h 告警总数"
            />
          )}
          <Segmented
            value={view}
            onChange={handleView}
            options={[
              { label: <span><AlertOutlined /> 告警</span>, value: 'alarm' },
              { label: <span><CommentOutlined /> 通信</span>, value: 'log' },
              { label: <span><ClockCircleOutlined /> 时间线</span>, value: 'timeline' },
            ]}
          />
        </div>
      </div>
      {view === 'alarm' && <AlarmLogTab mac={mac} />}
      {view === 'log' && <LogTerminal mac={mac} />}
      {view === 'timeline' && <TerminalTimelineTab mac={mac} />}
    </div>
  )
}
