'use client'

import { Empty, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import React, { Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AppstoreOutlined,
  ApiOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { getTerminal } from '@/lib/api/fetch'
import { TerminalMountDevs } from '@/components/terminal/TerminalMountDevs'
import { TerminalOverview } from '@/components/terminal/TerminalOverview'
import { usePromise } from '@/lib/hooks/usePromise'
import { useNav } from '@/lib/hooks/useNav'

/**
 * 透传网关设备详情页 — v3 hybrid Page B (user 端, 跟 admin terminal 对齐)
 *
 * 视觉: 薄导航条 + 紫渐变 hero + 8+4 grid (TerminalOverview + 设备快捷导航) + 挂载设备 bento-card
 * 防御: 全部 ?? '-' 兜底, trial mode 缺数据也漂亮渲染
 */
function TerminalInner() {
  const params = useParams()
  const router = useRouter()
  const nav = useNav()
  const id = (params.id as string) || ''

  const { data: terminal, loading, fecth } = usePromise(async () => {
    const { data } = await getTerminal(id)
    return data
  }, undefined, [id])

  if (loading) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!terminal) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>
        <Empty description="找不到该终端的数据" />
      </div>
    )
  }

  const online = !!terminal.online
  const mountDevCount = terminal.mountDevs?.length ?? 0
  const mountDevs = Array.isArray(terminal.mountDevs) ? terminal.mountDevs : []

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      {/* ─── 1. 薄导航条 (返回 + 面包屑, 标题让给 hero) ─── */}
      <nav
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: 'var(--ink-500)',
          marginBottom: 12,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <a
          onClick={() => router.back()}
          style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
        >
          ← 返回
        </a>
        <span style={{ color: 'var(--ink-300)' }}>/</span>
        <a
          onClick={() => router.push('/main')}
          style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
        >
          首页
        </a>
        <span style={{ color: 'var(--ink-300)' }}>/</span>
        <a
          onClick={() => router.push('/main')}
          style={{ cursor: 'pointer', color: 'var(--ink-500)' }}
        >
          终端
        </a>
        <span style={{ color: 'var(--ink-300)' }}>/</span>
        <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>{terminal.DevMac}</span>
      </nav>

      {/* ─── 2. device hero 紫渐变 (跟 admin terminal 一致) ─── */}
      <div
        className="bento-card v3-device-hero"
        style={{
          marginBottom: 20,
          padding: '20px 28px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)',
          color: '#fff',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: -80, right: -80,
            width: 240, height: 240,
            background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)',
            opacity: 0.4, pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3 }}>
              {terminal.name || terminal.DevMac}
            </h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              {terminal.DevMac} · 协议: {(terminal as any).protocol ?? (mountDevs[0]?.protocol) ?? '-'} · 挂载设备: {mountDevCount} 个
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {terminal.uptime ? (
                <Tag color="default" style={{ margin: 0, fontSize: 11, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}>
                  上线 {dayjs(terminal.uptime).format('YY-MM-DD HH:mm')}
                </Tag>
              ) : null}
              {terminal.ip ? (
                <Tag color="default" style={{ margin: 0, fontSize: 11, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono)' }}>
                  {terminal.ip}{terminal.port ? ':' + terminal.port : ''}
                </Tag>
              ) : null}
              {terminal.signal != null ? (
                <Tag color="default" style={{ margin: 0, fontSize: 11, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}>
                  信号 {terminal.signal}
                </Tag>
              ) : null}
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              border: `1px solid ${online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              color: online ? '#86efac' : '#fda4af',
              fontSize: 12, fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#86efac' : '#fda4af', animation: 'pulse-dot 2s infinite' }} />
            {online ? '实时连接' : '离线'}
          </span>
        </div>
      </div>

      {/* ─── 3. 8+4 grid: TerminalOverview 完整 15 KV (复用 admin 组件) + 设备快捷导航 ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
        <div style={{ gridColumn: 'span 8', minHeight: 360 }}>
          <TerminalOverview terminal={terminal} onChange={fecth} />
        </div>
        <div style={{ gridColumn: 'span 4', minHeight: 360 }}>
          <QuickNavCard terminal={terminal} onNav={(mac) => nav(mac)} />
        </div>
      </div>

      {/* ─── 4. 挂载设备完整管理 (TerminalMountDevs 保留, 包在 bento-card 里) ─── */}
      <div
        className="bento-card"
        style={{
          padding: 20,
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-bento)',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #06b6d4 0%, var(--brand-500) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16,
            }}
          >
            <AppstoreOutlined />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>挂载设备</h3>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {mountDevCount} 个子设备 · 点击 PID 卡片进入设备详情
            </div>
          </div>
        </div>
        <TerminalMountDevs
          terminal={terminal}
          ex={true}
          showTitle={false}
          InterValShow
          onChange={fecth}
        />
      </div>
    </div>
  )
}

function QuickNavCard({ terminal, onNav }: { terminal: Uart.Terminal; onNav: (path: string) => void }) {
  const mountDevs = Array.isArray(terminal.mountDevs) ? terminal.mountDevs : []
  const online = !!terminal.online

  return (
    <div
      className="device-actions-v3"
      style={{ height: '100%' }}
    >
      <h3>设备快捷导航</h3>

      <button
        className="device-action-btn-v3 primary"
        onClick={() => onNav('/main')}
      >
        <span className="ico"><ApiOutlined /></span>
        <span className="grow">返回设备列表</span>
        <span className="arrow">→</span>
      </button>

      {mountDevs.length > 0 ? (
        <>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-mono)',
              margin: '4px 0 -4px',
            }}
          >
            跳转到挂载设备 ({mountDevs.length})
          </div>
          {mountDevs.map((dev) => {
            const path = `/main/dev/${terminal.DevMac}${dev.pid}`
            const devOnline = !!dev.online
            return (
              <button
                key={dev.pid}
                className="device-action-btn-v3"
                onClick={() => onNav(path)}
              >
                <span className="ico">
                  <InfoCircleOutlined />
                </span>
                <span className="grow" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: devOnline ? 'var(--color-success)' : 'var(--ink-300)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dev.mountDev} <span style={{ color: 'var(--ink-400)', fontSize: 11 }}>({dev.pid})</span>
                  </span>
                </span>
                <span className="arrow"><ArrowRightOutlined style={{ fontSize: 11 }} /></span>
              </button>
            )
          })}
        </>
      ) : (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            color: 'var(--ink-400)',
            fontSize: 12,
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 10,
            border: '1px dashed var(--ink-200)',
          }}
        >
          暂无挂载设备
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px dashed var(--ink-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
        }}
      >
        <span>状态: {online ? '在线' : '离线'}</span>
        <span>{mountDevs.length} 挂载</span>
      </div>
    </div>
  )
}

export default function Terminal() {
  return (
    <Suspense fallback={<Spin />}>
      <TerminalInner />
    </Suspense>
  )
}
