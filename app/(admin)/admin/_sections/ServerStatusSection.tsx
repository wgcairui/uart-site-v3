'use client'
import { Button, Col, Descriptions, Row, Spin, Table } from 'antd'
import { DesktopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { SectionTitle } from '@/components/common/SectionTitle'
import { NodeInfo, runingState } from '@/lib/api/fetchRoot'
import { useEffect, useMemo, useState } from 'react'
import type { runInfo } from '@/lib/api/endpoints/admin/dashboard'

const ob: Record<string, string> = {
  all: '全部',
  online: '在线',
}

interface ServerStatusSectionProps {
  /** 父组件传入是否刷新 tick（30s 一次） */
  refreshTick: number
}

/**
 * 服务端 / 主服务运行状态 section
 * - 系统总览（节点/版本/内存/CPU/loadavg）
 * - 各节点运行时数据表
 */
export function ServerStatusSection({ refreshTick }: ServerStatusSectionProps) {
  const [runInfo, setRunInfo] = useState<runInfo>()
  const [nodeInfo, setNodeInfo] = useState<Uart.nodeInfo[]>([])

  useEffect(() => {
    runingState().then((el) => setRunInfo(el?.data))
    NodeInfo().then((el) => setNodeInfo((el?.data as any)?.items || el?.data || []))
  }, [refreshTick])

  const parsed = useMemo(() => {
    if (!runInfo) return null
    const data = runInfo as any
    return {
      nodes: data.Node?.all || 0,
      sys: data.SysInfo || {},
    }
  }, [runInfo])

  if (!parsed) return <Spin />

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionTitle icon={<DesktopOutlined />} title="Server / 主服务运行状态" />
      <Descriptions column={6} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="节点数">{parsed.nodes}</Descriptions.Item>
        <Descriptions.Item label="系统版本">{parsed.sys?.version || '-'}</Descriptions.Item>
        <Descriptions.Item label="总内存">{parsed.sys?.totalmem || '-'}</Descriptions.Item>
        <Descriptions.Item label="使用内存">{Number(parsed.sys?.usemen || 0).toFixed(2)}%</Descriptions.Item>
        <Descriptions.Item label="使用cpu">{Number(parsed.sys?.usecpu || 0).toFixed(2)}</Descriptions.Item>
        <Descriptions.Item label="loadavg">{parsed.sys?.loadavg?.join(' | ') || '-'}</Descriptions.Item>
      </Descriptions>
      <Row gutter={24}>
        <Col span={24}>
          <Table
            size="small"
            dataSource={nodeInfo.map((el) => ({ ...el, key: (el as any)._id }))}
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
            <Table.Column
              title="操作"
              key="oprate"
              render={() => <Button type="primary" size="small" onClick={() => {}}>修改</Button>}
            />
          </Table>
        </Col>
      </Row>
    </section>
  )
}