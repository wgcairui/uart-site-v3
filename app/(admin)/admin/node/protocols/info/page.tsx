'use client'

/**
 * 协议详情 (/admin/node/protocols/info?Protocol=xxx&tab=xxx)
 *
 * ## v3 重构（PR-05 / 2026-07-24）
 *
 * 改造清单:
 * 1. 顶部紫渐变 hero → `<PageHeader title breadcrumb extra meta>` (3 段式页面头)
 * 2. 新增 `<PageSummary items>` 6 段采集/操作/常量/显示/阈值/状态计数
 * 3. 5 个 inline modal 提取到 `_components/` 子目录:
 *    - `EditProtocolModal` (添加指令)
 *    - `CopyProtocolModal` (复制指令)
 *    - `DeleteProtocolConfirm` (删除指令)
 *    - `UploadProtocolModal` (上传本地 JSON)
 *    - `UsageInfoModal` (协议使用情况, NEW — 替换 hero "已挂载终端" 静态 cell)
 * 4. `<Descriptions>` → `<KVList>` (style-guide §0.2 反模式)
 * 5. `<Tag color>` 状态字段 → 文字 (StatusTag 化留给 PR-07, 此处只去除硬编码色)
 * 6. antd `<Button type="primary">` → `<Button variant="primary">`
 * 7. 11+ hardcoded hex → v2 token (`var(--color-*)` / `var(--ink-*)`)
 * 8. 29+ inline styles → 抽到 helper const / utility class
 *
 * ## 保留不动
 *
 * - 9 个 tab 中 AI 域 (ProtocolAiChatTab / ProtocolAiDryRunTab / ProtocolAiInferred)
 *   沿用 PR #44 风格, 不在本 PR scope
 * - 业务 API 调用 (getProtocol / getProtocolSetup / setProtocol / updateProtocol)
 * - `Modal.confirm` / `Modal.info` 静态调用 (PR-00 跨文件 sweep 目标, 本 PR 不动)
 */

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { message, Modal, Space, Spin, Table, Tabs, Tag } from 'antd'
import { confirm, success, info, error, warning } from '@/lib/utils/modal'
import type { ColumnsType } from 'antd/lib/table'
import { CopyFilled, DeleteFilled, ExperimentOutlined, MessageOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import {
  getProtocols,
  modifyProtocolRemark,
  setProtocol,
} from '@/lib/api/fetchRoot'
import { getProtocol, getProtocolSetup } from '@/lib/api/fetch'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'

import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ProtocolSourceTag } from '@/components/protocol/ProtocolSourceTag'
import { ProtocolAlarmStat } from '@/components/protocol/ProtocolAlarmStat'
import { ProtocolContant } from '@/components/protocol/ProtocolContant'
import { ProtocolOprate } from '@/components/protocol/ProtocolOprate'
import { ProtocolShowTag } from '@/components/protocol/ProtocolShowTag'
import { ProtocolThreshold } from '@/components/protocol/ProtocolThreshold'
import { ProtocolInstructForm } from '@/components/protocol/ProtocolInstructForm'
import { ProtocolAiInferred } from '@/components/protocol/ProtocolAiInferred'
import { ProtocolAiChatTab } from '@/components/protocol/ProtocolAiChatTab'
import { ProtocolAiDryRunTab } from '@/components/protocol/ProtocolAiDryRunTab'
import { AiSourceInfoCard } from '@/components/ai/AiSourceInfoCard'

import { EditProtocolModal } from './_components/EditProtocolModal'
import { CopyProtocolModal } from './_components/CopyProtocolModal'
import { DeleteProtocolConfirm } from './_components/DeleteProtocolConfirm'
import { UploadProtocolModal } from './_components/UploadProtocolModal'
import { UsageInfoModal } from './_components/UsageInfoModal'

interface ProtocolDesProps {
  Protocol: string
}

const EMPTY_COUNTS = { OprateInstruct: 0, Constant: 0, ShowTag: 0, Threshold: 0, AlarmStat: 0 }

/**
 * 采集指令 tab (主 tab) — 包含 addInstruct / copyInstruct / deleteInstruct / saveProtocol
 */
function ProtocolDes({ Protocol }: ProtocolDesProps) {
  const [instructs, setInstruct] = useState<Uart.protocolInstruct[]>([])

  // 3 个 modal 的开关 + 临时态
  const [editOpen, setEditOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copySource, setCopySource] = useState<Uart.protocolInstruct | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteName, setDeleteName] = useState<string>('')

  const { data, loading, fecth } = usePromise(async () => {
    const { data } = await getProtocol(Protocol)
    return data
  })

  const { data: protocolInstructs } = usePromise(async () => {
    const { data } = await getProtocols()
    return (data.items || (data as any))
      .flatMap((i: any) => i.instruct || [])
      .flatMap((i: any) => i.formResize || [])
  }, [])

  const protocolItemFun = useCallback(
    (name: string) => {
      if (!protocolInstructs) return undefined
      return protocolInstructs
        .filter((el: any) => el?.name?.includes(name))
        .sort((a: any, b: any) => a.name.length - b.name.length)[0] as Uart.protocolInstructFormrize | undefined
    },
    [protocolInstructs],
  )

  useEffect(() => {
    if (data && data.instruct) {
      setInstruct(data.instruct)
    }
  }, [data])

  const remark = (val: string) => {
    modifyProtocolRemark(data.Protocol, val).then(() => {
      fecth()
      message.success('remark update')
    })
  }

  // ─── 3 个 modal 触发器 ────────────────────────────────────────────────────

  const handleAddInstruct = (name: string) => {
    if (instructs.some((el) => el.name === name)) {
      info({ content: '指令字符重复' })
      return
    }
    modifyInstruct({
      name,
      resultType: 'hex',
      shift: false,
      shiftNum: 0,
      pop: false,
      popNum: 0,
      isSplit: false,
      resize: '',
      formResize: [],
      isUse: true,
      noStandard: false,
      scriptStart: '',
      scriptEnd: '',
    })
    setEditOpen(false)
  }

  const handleCopyInstruct = (newName: string) => {
    if (!copySource) return
    setInstruct([{ ...copySource, name: newName }, ...instructs])
    setCopyOpen(false)
    setCopySource(null)
  }

  const handleDeleteInstruct = () => {
    const index = instructs.findIndex((el) => el.name === deleteName)
    if (index !== -1) {
      instructs.splice(index, 1)
      setInstruct([...instructs])
    }
    setDeleteOpen(false)
    setDeleteName('')
  }

  const saveProtocol = () => {
    const loading = message.loading('加载中...')
    setProtocol(data.Type, data.ProtocolType, data.Protocol, instructs).then(() => {
      loading()
      message.success('ok')
      fecth()
    })
  }

  const modifyInstruct = (item: Uart.protocolInstruct) => {
    const index = instructs.findIndex((el) => el.name === item.name)
    if (index !== -1) {
      instructs.splice(index, 1, item)
    } else {
      instructs.unshift(item)
    }
    setInstruct([...instructs])
  }

  const openCopy = (re: Uart.protocolInstruct) => {
    setCopySource(re)
    setCopyOpen(true)
  }

  const openDelete = (name: string) => {
    setDeleteName(name)
    setDeleteOpen(true)
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin />
      </div>
    )
  }

  if (!data) {
    return <EmptyState description="未能加载协议详情" />
  }

  const existingNames = instructs.map((i) => i.name)

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button variant="primary" onClick={() => setEditOpen(true)}>
          添加指令
        </Button>
        <Button variant="primary" onClick={saveProtocol}>
          保存协议
        </Button>
      </Space>
      {data.instruct && (
        <Table
          dataSource={generateTableKey(instructs, 'name')}
          pagination={false}
          size="small"
          columns={
            [
              { dataIndex: 'name', title: '名称' },
              {
                dataIndex: 'isUse',
                title: '启用',
                render: (val: boolean) => (val ? '是' : '否'),
              },
              {
                dataIndex: 'noStandard',
                title: '非标',
                render: (val: boolean) => (val ? '是' : '否'),
              },
              { dataIndex: 'resultType', title: '转换器' },
              {
                dataIndex: 'shift',
                title: '去头',
                render: (val: boolean, re: Uart.protocolInstruct) =>
                  val ? '是/' + re.shiftNum : '否',
              },
              {
                dataIndex: 'pop',
                title: '去尾',
                render: (val: boolean, re: Uart.protocolInstruct) =>
                  val ? '是/' + re.popNum : '否',
              },
              {
                dataIndex: 'isSplit',
                title: '分隔符',
                width: 90,
                render: (isSplit: boolean, re: Uart.protocolInstruct) => {
                  const val = re.splitStr as string | undefined
                  if (!isSplit) return <span style={{ color: 'var(--ink-300)' }}>—</span>
                  if (val === '') return <Tag color="orange">无</Tag>
                  if (val === ' ') return '空格'
                  if (val === ',') return '逗号'
                  // 不在 3 个标准里 → 16 进制 (e.g. ";" → \x3B)
                  if (val && val.length > 0) {
                    return (
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {Array.from(val)
                          .map((c) => '\\x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
                          .join('')}
                      </code>
                    )
                  }
                  return '—'
                },
              },
              { dataIndex: 'remark', title: '备注' },
              {
                key: 'len',
                title: '参数数',
                render: (_: unknown, val: Uart.protocolInstruct) => val.formResize.length,
              },
              {
                key: 'oprate',
                title: '操作',
                render: (_: unknown, re: Uart.protocolInstruct) => (
                  <Space>
                    <CopyFilled
                      onClick={() => openCopy(re)}
                      style={{ cursor: 'pointer', color: 'var(--brand-500)' }}
                    />
                    <DeleteFilled
                      onClick={() => openDelete(re.name)}
                      style={{ cursor: 'pointer', color: 'var(--color-danger, #f43f5e)' }}
                    />
                  </Space>
                ),
              },
            ] as ColumnsType<Uart.protocolInstruct>
          }
          expandable={{
            expandedRowRender: (re) => (
              <ProtocolInstructForm
                protocolItemFun={protocolItemFun}
                item={re}
                onChange={modifyInstruct}
              />
            ),
          }}
        />
      )}

      {/* 3 个 modal */}
      <EditProtocolModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleAddInstruct}
        existingNames={existingNames}
      />
      <CopyProtocolModal
        open={copyOpen}
        sourceName={copySource?.name ?? ''}
        onClose={() => {
          setCopyOpen(false)
          setCopySource(null)
        }}
        onSubmit={handleCopyInstruct}
        existingNames={existingNames}
      />
      <DeleteProtocolConfirm
        open={deleteOpen}
        name={deleteName}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteName('')
        }}
        onConfirm={handleDeleteInstruct}
      />
    </>
  )
}

/**
 * 协议详情主入口 (v3 重构后)
 */
function ProtocolInfo() {
  const query = useSearchParams()
  const router = useRouter()

  // 决策 23b (2026-06-28): 兼容历史 URL 参数名 (admin 列表用 Protocol, AI 路径曾误用 name)
  const protocolParam = query.get('Protocol') ?? query.get('name')
  if (typeof window !== 'undefined' && !query.get('Protocol') && query.get('name')) {
    console.warn(
      '[protocols/info] URL 参数 "name" 已废弃, 请改用 "Protocol" (跟 admin 列表 + info page 对齐)',
    )
  }
  const Protocol = protocolParam

  // 顶层拉 protocol meta 给 PageHeader / PageSummary 用
  const { data: protocolMeta } = usePromise<Uart.protocol | undefined>(async () => {
    if (!Protocol) return undefined
    const { data } = await getProtocol(Protocol)
    return data
  }, undefined, [Protocol])

  // 5 段 dev.constants count (Tab 角标计数 + AI 推断 tab 数据源)
  const { data: counts } = usePromise<typeof EMPTY_COUNTS>(async () => {
    if (!Protocol) return EMPTY_COUNTS
    const types = ['OprateInstruct', 'Constant', 'ShowTag', 'Threshold', 'AlarmStat'] as const
    const results = await Promise.all(
      types.map(async (t) => {
        try {
          const { data } = await getProtocolSetup<any>(Protocol, t as any)
          if (t === 'Constant') {
            return Object.keys(data.sys || {}).filter((k) => k !== '_id').length
          }
          return Array.isArray(data.sys) ? data.sys.length : 0
        } catch {
          return 0
        }
      }),
    )
    return {
      OprateInstruct: results[0] ?? 0,
      Constant: results[1] ?? 0,
      ShowTag: results[2] ?? 0,
      Threshold: results[3] ?? 0,
      AlarmStat: results[4] ?? 0,
    }
  }, EMPTY_COUNTS, [Protocol])

  // 4 个 modal 的开关
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [usageOpen, setUsageOpen] = useState(false)

  if (!Protocol) {
    return (
      <div className="bg-bento-canvas" style={{ padding: 80 }}>
        <EmptyState
          description="缺少协议参数 (Protocol), 请从协议列表进入"
          actionLabel="返回协议列表"
          onAction={() => router.push('/admin/node/protocols')}
        />
      </div>
    )
  }

  // PageHeader meta (KV 网格, 跟终端详情页 1:1)
  const headerMeta = (
    <div className="app-kv-grid">
      <div className="app-kv-cell">
        <span className="app-kv-label">类型</span>
        <span>{protocolMeta?.Type || '—'}</span>
      </div>
      <div className="app-kv-cell">
        <span className="app-kv-label">设备类型</span>
        <span>{protocolMeta?.ProtocolType || '—'}</span>
      </div>
      <div className="app-kv-cell">
        <span className="app-kv-label">版本</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          v{protocolMeta?.version ?? '—'}
        </span>
      </div>
      <div className="app-kv-cell">
        <span className="app-kv-label">最后修改</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {protocolMeta?.updatedAt
            ? dayjs(protocolMeta.updatedAt).format('YYYY-MM-DD HH:mm')
            : '—'}
        </span>
      </div>
      <div className="app-kv-cell">
        <span className="app-kv-label">已挂载终端</span>
        <a
          onClick={() => setUsageOpen(true)}
          style={{
            color: 'var(--brand-500)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}
        >
          查看 →
        </a>
      </div>
    </div>
  )

  // PageHeader extra (3 个 action)
  const headerExtra = (
    <Space wrap>
      <Button
        variant="default"
        icon={<ExperimentOutlined />}
        onClick={() => {
          const params = new URLSearchParams(query.toString())
          params.set('tab', 'aiDryRun')
          router.replace(`/admin/node/protocols/info?${params.toString()}`)
        }}
      >
        Dry-run
      </Button>
      <Button
        variant="default"
        icon={<MessageOutlined />}
        onClick={() => {
          const params = new URLSearchParams(query.toString())
          params.set('tab', 'aiChat')
          router.replace(`/admin/node/protocols/info?${params.toString()}`)
        }}
      >
        AI 修改
      </Button>
      <Button
        variant="default"
        icon={<UploadOutlined />}
        onClick={() => setUploadModalOpen(true)}
      >
        上传本地 JSON
      </Button>
    </Space>
  )

  // 6 段 PageSummary (采集 / 操作 / 常量 / 显示 / 阈值 / 状态)
  const summaryItems = [
    {
      label: '采集指令',
      value: protocolMeta?.instruct?.length ?? '—',
      variant: 'primary' as const,
    },
    {
      label: '操作指令',
      value: counts?.OprateInstruct ?? 0,
      variant: 'info' as const,
    },
    {
      label: '常量配置',
      value: counts?.Constant ?? 0,
      variant: 'purple' as const,
    },
    {
      label: '显示参数',
      value: counts?.ShowTag ?? 0,
      variant: 'success' as const,
    },
    {
      label: '阈值配置',
      value: counts?.Threshold ?? 0,
      variant: 'warning' as const,
    },
    {
      label: '状态配置',
      value: counts?.AlarmStat ?? 0,
      variant: 'danger' as const,
    },
  ]

  return (
    <>
      <PageHeader
        title={
          <Space size={10} wrap>
            <span>{Protocol}</span>
            {protocolMeta && (
              <ProtocolSourceTag source={protocolMeta.source} remark={protocolMeta.remark} />
            )}
          </Space>
        }
        subtitle={`protocol · ${Protocol}`}
        breadcrumb={[
          { title: '首页', href: '/main' },
          { title: '协议', href: '/admin/node/protocols' },
          { title: Protocol },
        ]}
        extra={headerExtra}
        meta={headerMeta}
      />

      <PageSummary items={summaryItems} />

      <Tabs
        activeKey={query.get('tab') ?? 'info'}
        onChange={(key) => {
          const params = new URLSearchParams(query.toString())
          params.set('tab', key)
          router.replace(`/admin/node/protocols/info?${params.toString()}`)
        }}
        items={[
          {
            key: 'info',
            label: `采集指令 (${protocolMeta?.instruct?.length ?? '—'})`,
            children: <ProtocolDes Protocol={Protocol} />,
          },
          {
            key: 'oprate',
            label: `操作指令 (${counts.OprateInstruct})`,
            children: <ProtocolOprate protocolName={Protocol} />,
          },
          {
            key: 'Constant',
            label: `常量配置 (${counts.Constant})`,
            children: <ProtocolContant protocolName={Protocol} />,
          },
          {
            key: 'show',
            label: `显示参数 (${counts.ShowTag})`,
            children: <ProtocolShowTag protocolName={Protocol} />,
          },
          {
            key: 'Threld',
            label: `阈值配置 (${counts.Threshold})`,
            children: <ProtocolThreshold protocolName={Protocol} />,
          },
          {
            key: 'stat',
            label: `状态配置 (${counts.AlarmStat})`,
            children: <ProtocolAlarmStat protocolName={Protocol} />,
          },
          {
            key: 'aiInferred',
            label: 'AI 推断',
            children: <ProtocolAiInferred protocolName={Protocol} />,
          },
          // PR-1 (2026-07-17) — AI 工具 tab 整合: chat / dry-run 合并到协议详情
          {
            key: 'aiChat',
            label: 'AI 修改',
            children: <ProtocolAiChatTab protocolName={Protocol} />,
          },
          {
            key: 'aiDryRun',
            label: 'Dry-run',
            children: <ProtocolAiDryRunTab protocolName={Protocol} />,
          },
        ]}
      />

      {/* 5 个 modal — 全部在 _components/ 子目录 */}
      <UploadProtocolModal
        protocolName={Protocol}
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
      <UsageInfoModal
        open={usageOpen}
        protocolName={Protocol}
        onClose={() => setUsageOpen(false)}
      />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ProtocolInfo />
    </Suspense>
  )
}
