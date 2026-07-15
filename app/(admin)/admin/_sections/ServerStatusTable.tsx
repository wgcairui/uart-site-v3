'use client'
import { useEffect, useState } from 'react'
import { Spin, Table } from 'antd'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { NodeInfo, runingState } from '@/lib/api/fetchRoot'
import { SafetyCertificateOutlined, GlobalOutlined, ArrowRightOutlined } from '@ant-design/icons'

/**
 * 主服务运行状态表 (Bento 表格)
 *
 * 复用老 ServerStatusSection 的数据 + 表格, 但改 v3 视觉:
 * - 紫色 header
 * - hover 紫光
 * - 跟 v3 通用 token 集成
 *
 * 节点行可点击 → /admin/node/nodes/info/[nodeName] 详情页
 */
export function ServerStatusTable({ refreshTick }: { refreshTick: number }) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [nodes, setNodes] = useState<Uart.nodeInfo[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([runingState(), NodeInfo()])
      .then(([r, n]) => {
        if (!alive) return
        setData(r?.data)
        setNodes(((n as any).data?.items || (n as any).data || []) as Uart.nodeInfo[])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [refreshTick])

  if (!data) return <Spin />

  const sys = data.SysInfo || {}

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>节点数</div>
          <div className="stat-card-value" style={{ fontSize: 20, color: 'var(--brand-500)' }}>{data.Node?.all || 0}</div>
        </div>
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>版本</div>
          <div className="stat-card-value" style={{ fontSize: 14, color: 'var(--ink-700)' }}>{sys?.version || '-'}</div>
        </div>
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>总内存</div>
          <div className="stat-card-value" style={{ fontSize: 14, color: 'var(--ink-700)' }}>{sys?.totalmem || '-'}</div>
        </div>
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>使用内存</div>
          <div className="stat-card-value" style={{ fontSize: 20, color: 'var(--color-warning)' }}>{Number(sys?.usemen || 0).toFixed(1)}%</div>
        </div>
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>CPU 使用</div>
          <div className="stat-card-value" style={{ fontSize: 20, color: Number(sys?.usecpu || 0) > 70 ? 'var(--color-danger)' : 'var(--color-success)' }}>{Number(sys?.usecpu || 0).toFixed(1)}%</div>
        </div>
        <div className="stat-card" style={{ padding: 12 }}>
          <div className="stat-card-label" style={{ fontSize: 10 }}>loadavg</div>
          <div className="stat-card-value" style={{ fontSize: 13, color: 'var(--ink-700)', fontFamily: 'var(--font-mono)' }}>{sys?.loadavg?.join(' | ') || '-'}</div>
        </div>
      </div>

      <Table
        size="small"
        dataSource={nodes.map((el) => ({ ...el, key: (el as any)._id }))}
        pagination={false}
        onRow={(record) => ({
          onClick: () => router.push(`/admin/node/nodes/info/${encodeURIComponent((record as any).NodeName)}`),
          style: { cursor: 'pointer' },
        })}
      >
        <Table.Column
          dataIndex="NodeName"
          title={
            <span>
              <GlobalOutlined style={{ marginRight: 6, color: 'var(--brand-500)' }} />
              节点名称
            </span>
          }
          render={(name) => (
            <span style={{ color: 'var(--brand-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {name}
              <ArrowRightOutlined style={{ fontSize: 10, color: 'var(--ink-400)' }} />
            </span>
          )}
        />
        <Table.Column dataIndex="totalmem" title="总内存" />
        <Table.Column dataIndex="freemem" title="空闲内存" />
        <Table.Column
          dataIndex="loadavg"
          title="loadavg"
          render={(val: number[]) => val?.join(' | ')}
        />
        <Table.Column dataIndex="uptime" title="运行时间" />
        <Table.Column dataIndex="Connections" title="连接数" />
        <Table.Column
          dataIndex="updateTime"
          title="更新时间"
          render={(val) => dayjs(val).format('YY-M-D H:m:s')}
        />
        <Table.Column
          key="hasToken"
          title="鉴权"
          render={(_, r: any) =>
            r.hasToken ? (
              <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <SafetyCertificateOutlined /> Token
              </span>
            ) : (
              <span style={{ color: 'var(--ink-500)', fontSize: 12 }}>IP</span>
            )
          }
        />
      </Table>
    </div>
  )
}
