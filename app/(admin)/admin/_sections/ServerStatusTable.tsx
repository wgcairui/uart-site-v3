'use client'
import { useEffect, useState } from 'react'
import { Spin, Table } from 'antd'
import dayjs from 'dayjs'
import { NodeInfo, runingState } from '@/lib/api/fetchRoot'

/**
 * 主服务运行状态表 (Bento 表格)
 *
 * 复用老 ServerStatusSection 的数据 + 表格, 但改 v3 视觉:
 * - 紫色 header
 * - hover 紫光
 * - 跟 v3 通用 token 集成
 */
export function ServerStatusTable({ refreshTick }: { refreshTick: number }) {
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
      >
        <Table.Column dataIndex="NodeName" title="节点名称" />
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
      </Table>
    </div>
  )
}
