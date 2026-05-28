'use client'
import React, { useState, useEffect } from 'react'
import { Card, DatePicker, Space, Spin, Alert, Table, Modal, Tag, Typography } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getUserSmsStats, getUserAlarmSetup, getUserSmsRecords } from '@/lib/api/fetchRoot'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface SmsStatsChartProps {
  user: string
}

interface SmsDayItem {
  date: string
  count: number
  details: { tel: string; count: number }[]
}

interface SmsRecord {
  id: number
  tel: string
  content: string
  status: string
  createdAt: string
  terminalId?: string
  nodeId?: string
}

export const SmsStatsChart: React.FC<SmsStatsChartProps> = ({ user }) => {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(90, 'day'),
    dayjs(),
  ])
  const [data, setData] = useState<SmsDayItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasTels, setHasTels] = useState<boolean | null>(null)

  // 列表相关状态
  const [records, setRecords] = useState<SmsRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordPagination, setRecordPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: SmsRecord | null }>({
    open: false,
    record: null
  })

  const fetchData = async (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
    setLoading(true)
    try {
      const [alarmRes, days] = await Promise.all([
        getUserAlarmSetup(user),
        Promise.resolve(end.diff(start, 'day') + 1)
      ])
      const tels = alarmRes?.data?.tels || []
      setHasTels(tels.length > 0)

      if (tels.length === 0) {
        setData([])
        return
      }

      const res = await getUserSmsStats(user, days)
      if (res.code === 200) {
        const filtered = (res.data || []).filter((item: SmsDayItem) => {
          const d = dayjs(item.date)
          return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'))
        })
        setData(filtered)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRecords = async (page = 1, pageSize = 20) => {
    setRecordsLoading(true)
    try {
      const res = await getUserSmsRecords(user, {
        page,
        pageSize,
        start: range[0].format('YYYY-MM-DD'),
        end: range[1].format('YYYY-MM-DD')
      })
      if (res.code === 200) {
        setRecords(res.data?.items || [])
        setRecordPagination({
          page: res.data?.pagination?.page || 1,
          pageSize: res.data?.pagination?.pageSize || 20,
          total: res.data?.pagination?.total || 0
        })
      }
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(range[0], range[1])
  }, [user])

  useEffect(() => {
    if (hasTels === true) {
      fetchRecords()
    }
  }, [hasTels, user])

  const onRangeChange = (value: any, dateStrings: [string, string]) => {
    if (value) {
      const [start, end] = value as [dayjs.Dayjs, dayjs.Dayjs]
      setRange([start, end])
      fetchData(start, end)
      fetchRecords(1, recordPagination.pageSize)
    }
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)

  const columns = [
    {
      title: '发送时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '手机号',
      dataIndex: 'tel',
      key: 'tel',
      width: 130
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag>
      )
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (v: string) => <Text ellipsis={{ tooltip: v }}>{v}</Text>
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
        <span style={{ marginLeft: 16 }}>总计: <strong>{total}</strong> 条短信</span>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : hasTels === false ? (
        <Alert title="该用户未配置告警手机号，无法查看短信消耗" type="warning" showIcon />
      ) : data.length === 0 ? (
        <Alert title="选定时间范围内无短信发送记录" type="info" showIcon />
      ) : (
        <>
          <Card title="短信消耗趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="短信数量"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="发送记录">
            <Table
              size="small"
              loading={recordsLoading}
              dataSource={records}
              rowKey={(record: SmsRecord) => record.id || records.indexOf(record)}
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
        title="短信详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
      >
        {detailModal.record && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">发送时间</Text>
              <div>{dayjs(detailModal.record.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
            <div>
              <Text type="secondary">接收手机号</Text>
              <div>{detailModal.record.tel}</div>
            </div>
            <div>
              <Text type="secondary">状态</Text>
              <div>
                <Tag color={detailModal.record.status === 'success' ? 'green' : 'red'}>
                  {detailModal.record.status === 'success' ? '成功' : '失败'}
                </Tag>
              </div>
            </div>
            <div>
              <Text type="secondary">设备ID</Text>
              <div>{detailModal.record.terminalId || '-'}</div>
            </div>
            <div>
              <Text type="secondary">节点ID</Text>
              <div>{detailModal.record.nodeId || '-'}</div>
            </div>
            <div>
              <Text type="secondary">短信内容</Text>
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