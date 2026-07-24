'use client'

/**
 * UsageInfoModal — 协议使用情况 (PageHeader meta「已挂载终端」cell 唤出)
 *
 * 来自原 page.tsx 顶部 hero 内 "已挂载终端" cell (line 481-484) — 原代码是只读文本 "—",
 * 没有交互。这里升级为可点击 cell + 唤出 v3 modal 显示使用情况。
 *
 * **数据源限制**:
 * 服务端 `/api/v2/admin/protocols/:name` 当前不返回 `mountedTerminals` 字段,
 * hero 上的 "—" 一直为占位。本 modal 在后端补字段前展示 EmptyState + 升级说明,
 * 后续 server 端补字段后只需替换 placeholder 即可展示真实数据。
 *
 * 视觉规范 (v2):
 * - antd `<Modal>` (footer null, 单 Close 按钮)
 * - 内部 EmptyState 业务组件 (style-guide §0.2 反模式: 不用 antd `<Empty>`)
 * - Bento 容器 + tabular-nums 数字
 * - destroyOnHidden
 *
 * 调用方:
 * ```tsx
 * <UsageInfoModal
 *   open={usageOpen}
 *   protocolName={Protocol}
 *   onClose={() => setUsageOpen(false)}
 * />
 * ```
 */

import { useMemo } from 'react'
import { Modal } from 'antd'
import { ClusterOutlined, DatabaseOutlined, LinkOutlined } from '@ant-design/icons'
import { KVList } from '@/components/common/KVList'
import { EmptyState } from '@/components/common/EmptyState'
import { SectionTitle } from '@/components/common/SectionTitle'

export interface UsageInfoModalProps {
  open: boolean
  protocolName: string
  onClose: () => void
  /** 后续 server 端补字段后传入真实数据 */
  data?: {
    mountedTerminals: number
    referencedInRules: number
    referencedInConstants: number
  }
}

export function UsageInfoModal({
  open,
  protocolName,
  onClose,
  data,
}: UsageInfoModalProps) {
  const hasData = !!data && data.mountedTerminals > 0

  const summaryItems = useMemo(
    () => [
      {
        label: '已挂载终端',
        value: data?.mountedTerminals ?? '—',
        icon: <ClusterOutlined />,
      },
      {
        label: '规则引用',
        value: data?.referencedInRules ?? '—',
        icon: <LinkOutlined />,
      },
      {
        label: '常量引用',
        value: data?.referencedInConstants ?? '—',
        icon: <DatabaseOutlined />,
      },
    ],
    [data],
  )

  return (
    <Modal
      title={`协议使用情况 · ${protocolName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <SectionTitle title="使用汇总" />
      <KVList items={summaryItems} column={3} />

      {!hasData && (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            description={
              <>
                协议 <code style={{ fontFamily: 'var(--font-mono)' }}>{protocolName}</code> 当前未挂载到任何终端。
                <br />
                (数据接入待后端 <code>protocol.mountedTerminals</code> 字段上线)
              </>
            }
            minHeight={220}
          />
        </div>
      )}
    </Modal>
  )
}

export default UsageInfoModal
