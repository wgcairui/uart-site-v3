'use client'

/**
 * 设备型号详情页 — v3 hybrid (跟 list 页 / devmodel 列表 1:1 设计语言)
 *
 * 视觉结构 (4 段):
 * 1. PageHeader: title + breadcrumb + back + extra (刷新/改名/删除)
 * 2. PageSummary: 4 个 stat 卡 (替代原 TYPE_COLOR 15 处 hex)
 * 3. 协议集: BentoCard + SectionTitle + 协议卡片网格 (可点击跳协议详情)
 * 4. 设备类型元信息: BentoCard + KVList (4 KV)
 *
 * 关键决定:
 * - TYPE_COLOR map 删, 8 个设备类型 → StatusTag variant (4 distinct: info / warning / error / idle)
 * - antd `<Tag color>` 裸用 → `<StatusTag variant>` + `<StatusTag size="sm">`
 * - antd `<Empty>` → `<EmptyState>` (含主操作按钮, 统一最小高度)
 * - 内联 RenameInput → 提取为 DevTypeEditModal (走 _components 目录)
 * - 大量 inline gradient/style 移入 BentoCard + SectionTitle
 * - 防御性: `data?.items ?? []` / `Array.isArray()` / `protocols || []` 兜底
 * - 改 Modal.confirm 保留 antd 写法, 等 PR-00 sweep (PR-01 wrapper 还未合并)
 */

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { message, Modal, Spin } from 'antd'
import { confirm, success, info, error, warning } from '@/lib/utils/modal'
import {
  AppstoreOutlined,
  ClusterOutlined,
  DeleteFilled,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { DevType, deleteDevModel } from '@/lib/api/endpoints/admin/protocols'
import { useNav } from '@/lib/hooks/useNav'
import { usePromise } from '@/lib/hooks/usePromise'
import { Button } from '@/components/common/Button'
import { BentoCard } from '@/components/common/BentoCard'
import { EmptyState } from '@/components/common/EmptyState'
import { KVList } from '@/components/common/KVList'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { SectionTitle } from '@/components/common/SectionTitle'
import { StatusTag, type StatusTagVariant } from '@/components/common/StatusTag'
import { DevTypeEditModal } from './_components/DevTypeEditModal'

// 设备类型 → StatusTag variant 映射 (替代原 TYPE_COLOR 8 处硬编码 hex)
// 语义化: 温湿度/IO/空调/水浸 = info, UPS = warning, 电表/烟感 = error, 通用 = idle
const TYPE_VARIANT: Record<string, StatusTagVariant> = {
  '温湿度': 'info',
  'UPS':    'warning',
  'IO':     'info',
  '电表':   'error',
  '空调':   'info',
  '水浸':   'info',
  '烟感':   'error',
  '通用':   'idle',
}

function DevModelDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nav = useNav()
  const model = decodeURIComponent((params.model as string) || '')

  const [tab, setTab] = useState(searchParams.get('tab') || 'protocols')
  const [editOpen, setEditOpen] = useState(false)

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
  const { data, loading, fecth } = usePromise<Uart.DevsType | null | undefined>(
    async () => {
      const { data: list } = await DevType(model)
      // API 返回数组 (历史版本), 取最新一条
      if (Array.isArray(list) && list.length > 0) {
        return list[0] as Uart.DevsType
      }
      return null
    },
    null,
    [model],
  )

  // 防御性 ?? 兜底 (符合 types 未声明时 runtime 不崩)
  const protocols = Array.isArray(data?.Protocols) ? data.Protocols : []
  const typeName = data?.Type || '通用'
  const typeVariant = TYPE_VARIANT[typeName] || 'idle'

  const handleDelete = () => {
    confirm({
      title: `确认删除设备型号 [${model}] ?`,
      icon: <ExclamationCircleOutlined />,
      content: '该设备型号下如果还有设备在用, 删除会失败',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true, className: 'btn-danger' },
      cancelButtonProps: { className: 'btn-default' },
      onOk() {
        return deleteDevModel(model).then(el => {
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

  // 早期 return 必须在所有 hooks 之后 (memory 教训)
  if (loading) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-bento-canvas">
        <EmptyState
          description={`找不到设备型号 [${model}]`}
          actionLabel="返回设备类型列表"
          onAction={() => router.push('/admin/node/devmodel')}
        />
      </div>
    )
  }

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      <PageHeader
        title="设备型号详情"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: '设备类型', href: '/admin/node/devmodel' },
          { title: model },
        ]}
        back
        onBack={() => router.push('/admin/node/devmodel')}
        extra={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="default" icon={<ReloadOutlined />} onClick={() => fecth()}>
              刷新
            </Button>
            <Button variant="primary" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              改名
            </Button>
            <Button variant="danger" icon={<DeleteFilled />} onClick={handleDelete}>
              删除
            </Button>
          </div>
        }
      />

      <PageSummary
        column={4}
        items={[
          {
            label: '设备型号',
            value: data.DevModel || '—',
            variant: 'primary',
            icon: <InfoCircleOutlined />,
          },
          {
            label: '设备类型',
            value: <StatusTag variant={typeVariant} text={typeName} showDot />,
            variant: 'info',
            icon: <AppstoreOutlined />,
          },
          {
            label: '协议数',
            value: `${protocols.length} 个`,
            variant: 'success',
            icon: <ClusterOutlined />,
          },
          {
            label: '更新时间',
            value: data.updatedAt ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm') : '—',
            variant: 'warning',
          },
        ]}
      />

      {/* ─── 协议集 ─── */}
      <BentoCard padding="md" style={{ marginBottom: 20 }}>
        <SectionTitle
          icon={<AppstoreOutlined />}
          title="协议集"
          extra={
            <span
              style={{
                fontSize: 11,
                color: 'var(--ink-500)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {protocols.length} 个协议 · 点击查看协议详情
            </span>
          }
        />
        {protocols.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState description="该设备型号未配置任何协议" minHeight={240} />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {protocols.map((p, i) => (
              <ProtocolCard
                key={`${String(p.Type)}-${p.Protocol}-${i}`}
                type={String(p.Type)}
                protocol={p.Protocol}
                onView={() => nav(`/admin/node/protocols/info/${encodeURIComponent(p.Protocol)}`)}
              />
            ))}
          </div>
        )}
      </BentoCard>

      {/* ─── 设备类型元信息 ─── */}
      <BentoCard padding="md">
        <SectionTitle
          icon={<InfoCircleOutlined />}
          title="设备类型元信息"
          extra={
            <span
              style={{
                fontSize: 11,
                color: 'var(--ink-500)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              静态资料 · 4 KV
            </span>
          }
        />
        <div style={{ marginTop: 16 }}>
          <KVList
            column={2}
            items={[
              { label: '设备型号', value: data.DevModel || '—' },
              { label: '设备类型', value: typeName },
              { label: '设备 ID', value: data._id || '—' },
              {
                label: '更新时间',
                value: data.updatedAt
                  ? dayjs(data.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '—',
              },
            ]}
          />
        </div>
      </BentoCard>

      <DevTypeEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        model={model}
        type={typeName}
        protocols={protocols}
        onRenamed={newModel => {
          // 关闭 modal + 跳新 URL (路由参数变了, 整页会重新拉数据)
          router.push(`/admin/node/devmodel/${encodeURIComponent(newModel)}`)
        }}
      />
    </div>
  )
}

// 协议卡片 (点击跳协议详情) — 跟原 ProtocolCard 视觉一致, 改用 BentoCard 容器
function ProtocolCard({
  type,
  protocol,
  onView,
}: {
  type: string
  protocol: string
  onView: () => void
}) {
  const variant = TYPE_VARIANT[type] || 'idle'
  return (
    <BentoCard
      hoverable
      padding="sm"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))',
        border: '1px solid rgba(99,102,241,0.18)',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={onView}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onView()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--accent-500) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <ClusterOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink-900)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={protocol}
            >
              {protocol}
            </div>
            <div style={{ marginTop: 4 }}>
              <StatusTag variant={variant} text={type || '通用'} size="sm" showDot={false} />
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-500)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <LinkOutlined style={{ fontSize: 10 }} />
          <span>点击查看协议详情</span>
        </div>
      </div>
    </BentoCard>
  )
}

export default function DevModelDetailPage() {
  return (
    <Suspense fallback={<Spin />}>
      <DevModelDetailInner />
    </Suspense>
  )
}
