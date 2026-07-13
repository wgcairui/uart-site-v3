'use client'

import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { getDeviceTiles, getDeviceTileHistory } from '@/lib/api/endpoints/user'
import { getAdminTileCounts, getAdminTileHistory } from '@/lib/api/endpoints/admin/dashboard'

type TileName = 'Ua' | 'Ia' | 'P' | 'Q' | 'PF' | 'E'

const TILE_LABELS: Record<TileName, { label: string; unit: string }> = {
  Ua: { label: '电压 Ua', unit: 'V' },
  Ia: { label: '电流 Ia', unit: 'A' },
  P: { label: '有功功率', unit: 'kW' },
  Q: { label: '无功功率', unit: 'kVar' },
  PF: { label: '功率因数', unit: '' },
  E: { label: '今日能耗', unit: 'kWh' },
}

const TILE_ORDER: TileName[] = ['Ua', 'Ia', 'P', 'Q', 'PF', 'E']

interface LiveControlsProps {
  /** admin 仪表盘: 0 计数, 无 mac/pid */
  variant?: 'admin' | 'device'
  /** device variant: mac + pid 必填 */
  mac?: string
  pid?: number | string
  /** 刷新周期 (ms) 默认 3 秒 */
  refreshMs?: number
  /** 标题 */
  title?: string
}

/**
 * LiveControls · 6 tile 实时数据 (v3 hybrid Page B 配套)
 *
 * 6 tile: Ua / Ia / P / Q / PF / E (UPS 标准 modbus 寄存器)
 * 视觉: Glass 玻璃感 14px 圆角 + sparkline + 趋势
 *
 * admin 模式: 显示 server 端 6 status enum (online/offline/warning/error/info/idle) 计数
 * device 模式: 显示 per-device 6 tile (电压/电流/功率/功率因数/能耗) + 24h sparkline
 */
export function LiveControls({
  variant = 'device',
  mac,
  pid,
  refreshMs = 3000,
  title = '实时数据',
}: LiveControlsProps) {
  const [tiles, setTiles] = useState<Record<TileName, { value: number | null; unit: string }> | null>(null)
  const [counts, setCounts] = useState<Uart.AdminStatusCounts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (variant === 'admin') {
      let alive = true
      getAdminTileCounts()
        .then((res: any) => {
          if (!alive) return
          setCounts(res?.data)
        })
        .catch(() => {})
        .finally(() => alive && setLoading(false))
      const t = setInterval(() => {
        getAdminTileCounts()
          .then((res: any) => alive && setCounts(res?.data))
          .catch(() => {})
      }, refreshMs)
      return () => { alive = false; clearInterval(t) }
    }

    if (variant === 'device' && mac && pid !== undefined) {
      let alive = true
      const fetchTiles = () => {
        getDeviceTiles(mac!, Number(pid))
          .then((res: any) => {
            if (!alive) return
            const raw = res?.data?.tiles
            if (raw) setTiles(raw)
          })
          .catch(() => {})
          .finally(() => alive && setLoading(false))
      }
      fetchTiles()
      const t = setInterval(fetchTiles, refreshMs)
      return () => { alive = false; clearInterval(t) }
    }
  }, [variant, mac, pid, refreshMs])

  if (loading) return <Spin />

  // admin 模式: 6 status 计数大数字
  if (variant === 'admin' && counts) {
    const items: Array<{ key: keyof Uart.AdminStatusCounts; label: string; color: string; muted?: boolean }> = [
      { key: 'online', label: '在线', color: 'var(--color-success)' },
      { key: 'offline', label: '离线', color: 'var(--color-danger)' },
      { key: 'warning', label: '告警', color: 'var(--color-warning)', muted: true },
      { key: 'error', label: '故障', color: '#dc2626', muted: true },
      { key: 'info', label: '提示', color: 'var(--color-info)', muted: true },
      { key: 'idle', label: '空闲', color: 'var(--ink-400)', muted: true },
    ]
    return (
      <div className="live-controls-v3">
        <h3 className="live-controls-title">
          <ThunderboltOutlined /> {title}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)', fontWeight: 400 }}>
            3 秒前更新 · terminal.status live
          </span>
        </h3>
        <div className="live-controls-grid">
          {items.map((it) => {
            const v = counts[it.key] ?? 0
            const isZero = v === 0
            const dim = it.muted && isZero
            return (
              <div key={it.key} className="ctrl-tile" style={{ opacity: dim ? 0.5 : 1 }}>
                <div className="ctrl-tile-lbl">{it.label}</div>
                <div className="ctrl-tile-val" style={{ color: dim ? 'var(--ink-400)' : it.color }}>
                  {v}
                </div>
                <div className="ctrl-tile-foot">
                  <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{refreshMs / 1000}s refresh</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // device 模式: 6 tile 实时数据
  if (variant === 'device' && tiles) {
    return (
      <div className="live-controls-v3">
        <h3 className="live-controls-title">
          <ThunderboltOutlined /> {title}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)', fontWeight: 400 }}>
            {refreshMs / 1000} 秒前更新
          </span>
        </h3>
        <div className="live-controls-grid">
          {TILE_ORDER.map((name) => {
            const t = tiles[name]
            const meta = TILE_LABELS[name]
            const value = t?.value ?? null
            const unit = t?.unit ?? meta.unit
            return (
              <div key={name} className="ctrl-tile">
                <div className="ctrl-tile-lbl">{meta.label}</div>
                <div className="ctrl-tile-val">
                  {value === null ? '—' : name === 'PF' ? value.toFixed(2) : value.toFixed(name === 'E' ? 1 : 2)}
                  {unit && <span className="ctrl-tile-unit">{unit}</span>}
                </div>
                <Sparkline name={name} mac={mac!} pid={Number(pid)} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

/** 单 tile 24h sparkline (复用 decision 23 history) */
function Sparkline({ name, mac, pid }: { name: TileName; mac: string; pid: number }) {
  const [points, setPoints] = useState<number[]>([])

  useEffect(() => {
    let alive = true
    getDeviceTileHistory(mac, pid, name, 24)
      .then((res: any) => {
        if (!alive) return
        const buckets = res?.data?.buckets || []
        setPoints(buckets.map((b: any) => b.value ?? 0).filter((v: number) => Number.isFinite(v)))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [name, mac, pid])

  if (points.length < 2) {
    return <div className="ctrl-tile-foot" style={{ fontSize: 10, color: 'var(--ink-500)' }}>—</div>
  }

  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const w = 100
  const h = 32
  const step = w / (points.length - 1)
  const path = points
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="ctrl-tile-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--brand-500)" strokeWidth="2" />
    </svg>
  )
}
