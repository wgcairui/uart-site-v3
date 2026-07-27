'use client'

/**
 * ViewInstructModal — 只读 instruct 列表查看器 (协议版本历史 tab 用)
 *
 * 用法: 历史 tab点 "查看" (目前仅 current version 可用, 历史 version 数据 BE 未暴露 instruct[])
 * ```tsx
 * <ViewInstructModal
 *   open={open}
 *   version={currentVersion}
 *   instruct={protocolMeta.instruct}
 *   onClose={...}
 * />
 * ```
 *
 * 设计:
 * - 标题: `v{version} instruct ({count} 条)`
 * - 跟 page.tsx 采集指令 tab 同样的 9 列 (名称/转换器/启用/非标/去头/去尾/分隔符/参数数/备注)
 * - 灰色 read-only 风格, cell 颜色 var(--ink-500)
 * - expand row 展示 formResize 参数列表 (跟 page.tsx 完全一致)
 * - 不允许编辑, 不允许添加/复制/删除 (只读)
 *
 * v1 (2026-07-27 ship): 配 server PR #118 (protocol history) — 只读查看当前 version 的完整 instruct.
 * 历史 version 的 instruct 详情需要 BE 补 /instruct?version=N 端点 (history API 不返回 instruct[]).
 */

import { Modal, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import { generateTableKey } from '@/lib/utils/tableCommon'

const { Text } = Typography

export interface ViewInstructModalProps {
  open: boolean
  /** 该 version 数字 (e.g. 3 / 7) */
  version: number
  /** 该 version 的完整 instruct 数组 (current version 直接用 protocolMeta.instruct) */
  instruct: Uart.protocolInstruct[]
  /** 来源标签 (admin / ai-generate / ai-chat) — title 副标题 */
  source?: string | undefined
  /** 创建人/创建时间 — title 副信息 */
  createdBy?: string | undefined
  createdAt?: string | undefined
  onClose: () => void
}

export function ViewInstructModal({
  open,
  version,
  instruct,
  source,
  createdBy,
  createdAt,
  onClose,
}: ViewInstructModalProps) {
  return (
    <Modal
      title={
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>v{version} instruct</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({instruct.length} 条)
          </Text>
          {source && (
            <Tag
              color={source === 'admin' ? 'blue' : source === 'ai-generate' ? 'purple' : 'cyan'}
              style={{ marginInlineEnd: 0 }}
            >
              {source}
            </Tag>
          )}
          {createdAt && (
            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              {createdAt}
              {createdBy ? ` · ${createdBy}` : ''}
            </Text>
          )}
        </span>
      }
      open={open}
      onCancel={onClose}
      width={960}
      destroyOnHidden
      footer={null}
    >
      <Table
        dataSource={generateTableKey(instruct || [], 'name')}
        pagination={false}
        size="small"
        rowClassName={() => 'view-instruct-row'}
        columns={
          [
            { dataIndex: 'name', title: '名称' },
            {
              dataIndex: 'resultType',
              title: '转换器',
              render: (v: string) => <Text type="secondary">{v || '—'}</Text>,
            },
            {
              dataIndex: 'isUse',
              title: '启用',
              render: (v: boolean) => <Text type="secondary">{v ? '是' : '否'}</Text>,
            },
            {
              dataIndex: 'noStandard',
              title: '非标',
              render: (v: boolean) => <Text type="secondary">{v ? '是' : '否'}</Text>,
            },
            {
              dataIndex: 'shift',
              title: '去头',
              render: (val: boolean, re: Uart.protocolInstruct) => (
                <Text type="secondary">{val ? `是/${re.shiftNum}` : '否'}</Text>
              ),
            },
            {
              dataIndex: 'pop',
              title: '去尾',
              render: (val: boolean, re: Uart.protocolInstruct) => (
                <Text type="secondary">{val ? `是/${re.popNum}` : '否'}</Text>
              ),
            },
            {
              dataIndex: 'isSplit',
              title: '分隔符',
              width: 90,
              render: (isSplit: boolean, re: Uart.protocolInstruct) => {
                if (!isSplit) return <Text type="secondary">—</Text>
                const val = re.splitStr as string | undefined
                if (val === '') return <Tag color="orange">无</Tag>
                if (val === ' ') return '空格'
                if (val === ',') return '逗号'
                if (val && val.length > 0) {
                  return (
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {Array.from(val)
                        .map((c) => '\\x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
                        .join('')}
                    </code>
                  )
                }
                return <Text type="secondary">—</Text>
              },
            },
            { dataIndex: 'remark', title: '备注', render: (v?: string) => <Text type="secondary">{v || '—'}</Text> },
            {
              key: 'len',
              title: '参数数',
              render: (_: unknown, val: Uart.protocolInstruct) => (
                <Text type="secondary">{val.formResize.length}</Text>
              ),
            },
          ] as ColumnsType<Uart.protocolInstruct>
        }
        expandable={{
          expandedRowRender: (re) => (
            <div style={{ padding: 8, background: 'var(--ink-50, #f8fafc)', borderRadius: 6 }}>
              {(re.formResize || []).map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '4px 0',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-700, #334155)',
                  }}
                >
                  <span style={{ minWidth: 120 }}>name: {p.name}</span>
                  <span style={{ minWidth: 160 }}>regx: {p.regx ?? '—'}</span>
                  <span style={{ minWidth: 60 }}>bl: {p.bl ?? '—'}</span>
                  <span>unit: {p.unit ?? '—'}</span>
                </div>
              ))}
            </div>
          ),
        }}
      />
    </Modal>
  )
}

export default ViewInstructModal
