'use client'
import React, { useState, useEffect } from 'react'
import { Card, DatePicker, Space, Spin, Alert, Table, Modal, Tag, Typography } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getUserMailRecords } from '@/lib/api/fetchRoot'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface MailStatsChartProps {
  user: string
}

interface MailRecord {
  id: number
  email: string
  subject: string
  content: string
  status: string
  createdAt: string
  terminalId?: string
  nodeId?: string
}

interface MailDayItem {
  date: string
  count: number
}

export const MailStatsChart: React.FC<MailStatsChartProps> = ({ user }) => {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(90, 'day'),
    dayjs(),
  ])
  const [chartData, setChartData] = useState<MailDayItem[]>([])
  const [loading, setLoading] = useState(false)

  // 列表相关状态
  const [records, setRecords] = useState<MailRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordPagination, setRecordPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: MailRecord | null }>({
    open: false,
    record: null
  })

  const fetchRecords = async (page = 1, pageSize = 20) => {
    setRecordsLoading(true)
    setLoading(true)
    try {
      const res = await getUserMailRecords(user, {
        page,
        pageSize,
        start: range[0].format('YYYY-MM-DD'),
        end: range[1].format('YYYY-MM-DD')
      })
      if (res.code === 200) {
        const items = res.data?.items || []
        setRecords(items)

        // 构建趋势图数据：按日期聚合
        const dateMap = new Map<string, number>()
        items.forEach((record: MailRecord) => {
          const date = dayjs(record.createdAt).format('YYYY-MM-DD')
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        })
        const aggregated: MailDayItem[] = []
        let current = range[0]
        while (current.isBefore(range[1]) || current.isSame(range[1], 'day')) {
          const dateStr = current.format('YYYY-MM-DD')
          aggregated.push({
            date: dateStr,
            count: dateMap.get(dateStr) || 0
          })
          current = current.add(1, 'day')
        }
        setChartData(aggregated)

        setRecordPagination({
          page: res.data?.pagination?.page || 1,
          pageSize: res.data?.pagination?.pageSize || 20,
          total: res.data?.pagination?.total || 0
        })
      }
    } finally {
      setRecordsLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [user])

  const onRangeChange = (value: any, dateStrings: [string, string]) => {
    if (value) {
      const [start, end] = value as [dayjs.Dayjs, dayjs.Dayjs]
      setRange([start, end])
      fetchRecords(1, recordPagination.pageSize)
    }
  }

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  const columns = [
    {
      title: '发送时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (v: string) => <Text ellipsis={{ tooltip: v }}>{v}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag>
      )
    }
  ]

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      <Space>
        <RangePicker
          value={range}
          onChange={onRangeChange}
          allowClear={false}
        />
        <span style={{ marginLeft: 16 }}>总计: <strong>{total}</strong> 封邮件</span>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : chartData.length === 0 && recordPagination.total === 0 ? (
        <Alert title="选定时间范围内无邮件发送记录" type="info" showIcon />
      ) : (
        <>
          {chartData.length > 0 && (
            <Card title="邮件消耗趋势">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="邮件数量"
                    stroke="#722ed1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="发送记录">
            <Table
              size="small"
              loading={recordsLoading}
              dataSource={records}
              rowKey={(record: MailRecord) => record.id || records.indexOf(record)}
              pagination={{
                current: recordPagination.page,
                pageSize: recordPagination.pageSize,
                total: recordPagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total: number) => `共 ${total} 条`
              }}
              onChange={(pag) => fetchRecords(pag.current, pag.pageSize)}
              columns={columns}
              onRow={(record) => ({
                onClick: () => setDetailModal({ open: true, record }),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </>
      )}

      <Modal
        title="邮件详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
      >
        {detailModal.record && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text style={{ color: 'rgba(0,0,0,0.45)' }}>发送时间</Text>
              <div>{dayjs(detailModal.record.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>接收邮箱</Text>
              <div>{detailModal.record.email}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>状态</Text>
              <div>
                <Tag color={detailModal.record.status === 'success' ? 'green' : 'red'}>
                  {detailModal.record.status === 'success' ? '成功' : '失败'}
                </Tag>
              </div>
            </div>
              <div>
                <Text style={{ color: 'rgba(0,0,0,0.45)' }}>设备ID</Text>
              <div>{detailModal.record.terminalId || '-'}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>节点ID</Text>
              <div>{detailModal.record.nodeId || '-'}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>邮件主题</Text>
              <div>{detailModal.record.subject}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>邮件内容</Text>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {detailModal.record.content}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  )
}