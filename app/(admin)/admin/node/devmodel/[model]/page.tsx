'use client'

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Spin, Tag, Empty, Button, Modal, message, Popconfirm, Tooltip } from 'antd'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  StopOutlined,
  DeleteFilled,
  ArrowLeftOutlined,
  ReloadOutlined,
  EditOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  ClusterOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { DevType, deleteDevModel, addDevType } from '@/lib/api/endpoints/admin/protocols'
import { getProtocols } from '@/lib/api/endpoints/admin/protocols'
import { usePromise } from '@/lib/hooks/usePromise'
import { useNav } from '@/lib/hooks/useNav'

const TYPE_COLOR: Record<string, string> = {
  '温湿度': 'cyan',
  'UPS': 'gold',
  'IO': 'purple',
  '电表': 'volcano',
  '空调': 'blue',
  '水浸': 'geekblue',
  '烟感': 'red',
  '通用': 'default',
}

function DevModelDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nav = useNav()
  const model = decodeURIComponent((params.model as string) || '')

  const [tab, setTab] = useState(searchParams.get('tab') || 'protocols')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  const handleTabChange = useCallback((key: string) => {
    setTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.pushState({}, '', url.toString())
  }, [])

  // 拉当前设备型号的详细数据
  const { data, loading, fecth } = usePromise<Uart.DevsType | null | undefined>(async () => {
    const { data: list } = await DevType(model)
    // API 返回数组 (历史版本), 取最新一条
    if (Array.isArray(list) && list.length > 0) {
      return list[0] as Uart.DevsType
    }
    return null
  }, null, [model])

  // 关联协议列表 (用于显示协议名 / 类型)
  const { data: allProtocols } = usePromise<{ items: Uart.protocol[]; total: number }>(async () => {
    const { data: d } = await getProtocols({ page: 1, pageSize: 1000, needTotal: false } as any)
    return { items: (d?.items as any) || [], total: (d?.pagination as any)?.total ?? 0 }
  }, { items: [], total: 0 }, [])

  const protocolMap = useMemo(() => {
    const m = new Map<string, Uart.protocol>()
    ;(allProtocols?.items || []).forEach((p: any) => {
      m.set(`${p.ProtocolType}:${p.Protocol}`, p)
    })
    return m
  }, [allProtocols])

  const handleDelete = () => {
    Modal.confirm({
      title: `确认删除设备型号 [${model}] ?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: '该设备型号下如果还有设备在用, 删除会失败',
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk() {
        return deleteDevModel(model).then((el) => {
          if (el.code) {
            message.success('已删除')
            router.push('/admin/node/devmodel')
          } else {
            message.error(el.message || (el.data as any) || '删除失败')
          }
        })
      },
    })
  }

  const handleRename = (newModel: string) => {
    if (!newModel || newModel === model) {
      setEditing(false)
      return
    }
    // 后端只有 add / delete, 无 rename endpoint
    // 用 add + delete 组合模拟 (如果协议列表一样)
    const protocols = (data?.Protocols || []).map(p => ({
      ProtocolType: p.Type as unknown as Uart.protocolType,
      Protocol: p.Protocol,
    }))
    return addDevType(data?.Type || '通用', newModel, protocols)
      .then(() => deleteDevModel(model))
      .then((el) => {
        if (el.code) {
          message.success('已改名')
          router.push(`/admin/node/devmodel/${encodeURIComponent(newModel)}`)
        } else {
          message.error('改名失败: ' + (el.message || (el.data as any)))
        }
      })
      .finally(() => setEditing(false))
  }

  if (loading) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>
        <Empty description={`找不到设备型号 [${model}]`} />
        <Button type="link" onClick={() => router.push('/admin/node/devmodel')}>
          返回设备类型列表
        </Button>
      </div>
    )
  }

  const protocols = Array.isArray(data.Protocols) ? data.Protocols : []
  const typeColor = TYPE_COLOR[data.Type] || 'default'
  const protocolCount = protocols.length

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      {/* ─── 1. 单个 ← 返回 link (面包屑由 layout AdminHeader 顶栏提供) ─── */}
      <a
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: 'var(--ink-500)',
          fontFamily: 'var(--font-mono)',
          marginBottom: 12, cursor: 'pointer',
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> 返回
      </a>

      {/* ─── 2. device hero 紫渐变 (跟 protocols info / terminal 1:1) ─── */}
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
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: 0, lineHeight: 1.3, display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {editing ? (
                <RenameInput defaultValue={model} onSave={handleRename} onCancel={() => setEditing(false)} />
              ) : (
                <>
                  {data.DevModel}
                  <Tag color={typeColor} style={{ margin: 0, fontSize: 12 }}>
                    {data.Type || '通用'}
                  </Tag>
                </>
              )}
            </h2>
            <div
              style={{
                marginTop: 14,
                display: 'flex', gap: '12px 28px', flexWrap: 'wrap',
                fontSize: 12, color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div className="app-kv-cell" style={{ color: 'inherit' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>协议数</span>
                <span style={{ color: '#fff' }}>{protocolCount} 个</span>
              </div>
              <div className="app-kv-cell" style={{ color: 'inherit' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>设备 ID</span>
                <span style={{ color: '#fff' }}>{data._id || '—'}</span>
              </div>
              <div className="app-kv-cell" style={{ color: 'inherit' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>创建时间</span>
                <span style={{ color: '#fff' }}>
                  {data.createdAt ? dayjs(data.createdAt).format('YYYY-MM-DD HH:mm') : '—'}
                </span>
              </div>
              <div className="app-kv-cell" style={{ color: 'inherit' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>更新时间</span>
                <span style={{ color: '#fff' }}>
                  {data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm') : '—'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={fecth}
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              刷新
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              改名
            </Button>
            <Popconfirm
              title={`确认删除 [${model}] ?`}
              okType="danger"
              okText="确认删除"
              onConfirm={handleDelete}
            >
              <Button
                danger
                icon={<DeleteFilled />}
                style={{ background: 'rgba(244, 63, 94, 0.2)', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' }}
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>

      {/* ─── 3. 协议集 bento-card (auto-fill minmax 280px 卡片) ─── */}
      <div
        className="bento-card"
        style={{
          padding: 20,
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-bento)',
          borderRadius: 'var(--radius-2xl)',
          marginBottom: 20,
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>协议集</h3>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {protocolCount} 个协议 · 点击查看协议详情
            </div>
          </div>
        </div>

        {protocols.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该设备型号未配置任何协议" style={{ padding: '24px 0' }} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
              padding: '4px 2px 8px',
            }}
          >
            {protocols.map((p, i) => {
              const key = `${p.Type}:${p.Protocol}`
              return (
                <ProtocolCard
                  key={`${String(p.Type)}-${p.Protocol}-${i}`}
                  type={String(p.Type)}
                  protocol={p.Protocol}
                  onView={() => nav(`/admin/node/protocols/info/${encodeURIComponent(p.Protocol)}`)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ─── 4. 设备类型元信息 (glass bento-card 16 KV) ─── */}
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
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16,
            }}
          >
            <InfoCircleOutlined />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>设备类型元信息</h3>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              静态资料 · 4 KV
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '4px 18px',
          }}
        >
          <KVRow label="设备型号" value={data.DevModel} copyable={data.DevModel} />
          <KVRow label="设备类型" value={data.Type || '—'} />
          <KVRow label="设备 ID" value={data._id || '—'} copyable={data._id} mono />
          <KVRow
            label="更新时间"
            value={data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '—'}
            mono
          />
        </div>
      </div>
    </div>
  )
}

function ProtocolCard({ type, protocol, onView }: { type: string; protocol: string; onView: () => void }) {
  const typeColor = TYPE_COLOR[type] || 'default'
  return (
    <div
      onClick={onView}
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.18)',
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-bento-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, flexShrink: 0,
          }}
        >
          <ClusterOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={protocol}
          >
            {protocol}
          </div>
          <div
            style={{
              fontSize: 11, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)',
            }}
          >
            <Tag color={typeColor} style={{ margin: 0, fontSize: 10, padding: '0 6px' }}>
              {type || '通用'}
            </Tag>
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: 11, color: 'var(--ink-500)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <LinkOutlined style={{ fontSize: 10 }} />
        <span>点击查看协议详情</span>
      </div>
    </div>
  )
}

function KVRow({ label, value, copyable, mono }: { label: string; value: React.ReactNode; copyable?: string | undefined; mono?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--ink-100)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--ink-900)',
          fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        {copyable ? (
          <Tooltip title="复制">
            <CopyOutlined
              style={{ color: 'var(--ink-400)', cursor: 'pointer', fontSize: 12 }}
              onClick={() => navigator.clipboard?.writeText(copyable)}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function RenameInput({ defaultValue, onSave, onCancel }: { defaultValue: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(val.trim())
          if (e.key === 'Escape') onCancel()
        }}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6,
          color: '#fff',
          padding: '4px 8px',
          fontSize: 18,
          fontWeight: 600,
          outline: 'none',
          width: 200,
        }}
      />
      <Button size="small" type="primary" onClick={() => onSave(val.trim())}>保存</Button>
      <Button size="small" onClick={onCancel}>取消</Button>
    </span>
  )
}

export default function DevModelDetailPage() {
  return (
    <Suspense fallback={<Spin />}>
      <DevModelDetailInner />
    </Suspense>
  )
}
