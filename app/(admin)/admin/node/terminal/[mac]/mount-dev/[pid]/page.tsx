'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Spin, Tabs, Tag, Descriptions, Button } from 'antd'
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  WarningFilled,
  ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { getTerminalPidProtocol } from '@/lib/api/fetch'
import { getTerminal } from '@/lib/api/fetch'
import { usePromise } from '@/lib/hooks/usePromise'
import { devType } from '@/lib/utils/devImgSource'
import { devTypeIcon } from '@/components/common/IconFont'
import { TerminalDevPage } from '@/components/terminal/TerminalDevPage'
import { TerminalCurData, TerminalHistoryData } from '../../TerminalDataTab'
import dayjs from 'dayjs'

function MountDevPageInner() {
  const params = useParams()
  const router = useRouter()
  const mac = params.mac as string
  const pid = parseInt(params.pid as string, 10)

  // 拉 terminal (拿 mountDev 详情) + mountDev pid/protocol 详情
  const { data: terminal, loading: tLoading } = usePromise(async () => {
    const { data } = await getTerminal(mac)
    return data
  }, undefined, [mac])

  const dev = terminal?.mountDevs?.find((d) => d.pid === pid)
  const online = !!dev?.online
  const lastEmit = (dev as any)?.lastEmit
  const lastRecord = (dev as any)?.lastRecord

  const { data: mountDev, loading: mLoading } = usePromise(async () => {
    const { data } = await getTerminalPidProtocol(mac, pid)
    return data
  }, null, [mac, pid])

  if (tLoading || mLoading) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!dev) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>
        找不到该挂载设备 (mac={mac}, pid={pid})
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => router.back()}>← 返回</Button>
        </div>
      </div>
    )
  }

  const iconEl = devTypeIcon[dev.Type] || <AppstoreOutlined />
  const imgSrc = (devType as Record<string, string>)[dev.Type]

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      {/* 面包屑导航 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
        <a onClick={() => router.back()} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeftOutlined /> 返回
        </a>
        <span>/</span>
        <a onClick={() => router.push(`/admin/node/terminal/${mac}`)} style={{ cursor: 'pointer' }}>{mac}</a>
        <span>/</span>
        <span style={{ color: 'var(--ink-700)' }}>{dev.mountDev || '未命名'} (pid={pid})</span>
      </div>

      {/* Hero (跟终端页同构) */}
      <div
        className="bento-card"
        style={{
          marginBottom: 20,
          padding: '20px 28px',
          background: online
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #6d28d9 100%)'
            : 'linear-gradient(135deg, #1e1b4b 0%, #5b1d1d 60%, #9f1239 100%)',
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
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: '#fff',
                flexShrink: 0,
              }}
            >
              {iconEl}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3 }}>
                {dev.mountDev || '未命名'}
              </h2>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                PID {dev.pid} · {dev.protocol || '未配置协议'} · {dev.Type || '未知类型'} · 终端 {mac}
              </div>
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

      {/* Meta strip */}
      <div
        className="bento-card"
        style={{
          marginBottom: 20,
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
        }}
      >
        <span>设备ID: {mac}</span>
        <span>·</span>
        <span>PID: {dev.pid}</span>
        {lastEmit ? (
          <>
            <span>·</span>
            <span>上行: {dayjs(lastEmit).format('MM-DD HH:mm:ss')}</span>
          </>
        ) : null}
        {lastRecord ? (
          <>
            <span>·</span>
            <span>采集: {dayjs(lastRecord).format('MM-DD HH:mm:ss')}</span>
          </>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => router.refresh()}>
            刷新
          </Button>
        </div>
      </div>

      {/* 4 段 Tabs */}
      <div className="bento-card" style={{ padding: 24 }}>
        <Tabs
          defaultActiveKey="detail"
          items={[
            {
              key: 'detail',
              label: <span><AppstoreOutlined /> 设备详情</span>,
              children: (
                <div>
                  <Descriptions
                    size="small"
                    column={3}
                    bordered
                    style={{ marginBottom: 20 }}
                    items={[
                      { key: 'name', label: '设备名', children: dev.mountDev || '-' },
                      { key: 'type', label: '类型', children: dev.Type || '-' },
                      { key: 'protocol', label: '协议', children: dev.protocol || '-' },
                      { key: 'pid', label: 'PID', children: dev.pid },
                      { key: 'mac', label: '终端 MAC', children: mac },
                      { key: 'status', label: '在线状态', children: online ? <Tag color="success">在线</Tag> : <Tag color="warning">离线</Tag> },
                      ...(mountDev as any)?.remark ? [{ key: 'remark', label: '备注', children: (mountDev as any).remark }] : [],
                    ]}
                  />
                  {/* 设备类型特定组件 (温湿度/IO/空调/UPS) */}
                  <TerminalDevPage mac={mac} pid={pid} />
                </div>
              ),
            },
            {
              key: 'cur',
              label: <span>📊 实时数据</span>,
              children: <TerminalCurData mac={mac} pid={pid} />,
            },
            {
              key: 'history',
              label: <span>📈 历史数据</span>,
              children: <TerminalHistoryData mac={mac} pid={pid} />,
            },
            {
              key: 'config',
              label: <span>⚙ 告警配置</span>,
              children: (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-500)' }}>
                  <Button
                    type="primary"
                    icon={<ExportOutlined />}
                    onClick={() => router.push(`/main/constant?mac=${encodeURIComponent(mac)}&pid=${pid}`)}
                  >
                    打开告警配置
                  </Button>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    (跳转 user-side 告警配置页面, 待统一)
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}

export default function MountDevPage() {
  return (
    <Suspense fallback={<Spin />}>
      <MountDevPageInner />
    </Suspense>
  )
}
