'use client'
import React, { useState } from 'react'
import { Card, Table, DatePicker, Space, Tag, Typography, Modal } from 'antd'
import { loguserrequsts } from '@/lib/api/fetchRoot'
import { DesList } from '@/components/DesList'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface RequestLogTabProps {
  user: string
}

export const RequestLogTab: React.FC<RequestLogTabProps> = ({ user }) => {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(90, 'day'),
    dayjs(),
  ])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: any }>({ open: false, record: null })

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const res = await loguserrequsts(
        range[0].format('YYYY-MM-DD'),
        range[1].format('YYYY-MM-DD'),
        { page, pageSize }
      )
      if (res.code === 200) {
        // 过滤当前用户的数据
        const filtered = (res.data?.items || []).filter((item: any) => item.user === user)
        setData(filtered)
        setPagination({
          page: res.data?.pagination?.page || 1,
          pageSize: res.data?.pagination?.pageSize || 20,
          total: filtered.length
        })
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchData()
  }, [user])

  const onRangeChange = (value: any) => {
    if (value) {
      const [start, end] = value as [dayjs.Dayjs, dayjs.Dayjs]
      setRange([start, end])
      fetchData(1, pagination.pageSize)
    }
  }

  const columns = [
    {
      dataIndex: 'type',
      title: '请求类型',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>
    },
    {
      dataIndex: 'msg',
      title: '消息',
      ellipsis: true
    },
    {
      dataIndex: 'timeStamp',
      title: '时间',
      width: 180,
      render: (v: number) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    }
  ]

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
      <Space>
        <RangePicker
          value={range}
          onChange={onRangeChange}
          allowClear={false}
        />
      </Space>

      <Card size="small">
        <Table
          size="small"
          loading={loading}
          dataSource={data}
          rowKey={(record: any) => record._id || data.indexOf(record)}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total: number) => `共 ${total} 条`
          }}
          onChange={(pag) => fetchData(pag.current, pag.pageSize)}
          columns={columns as any}
          onRow={(record) => ({
            onClick: () => setDetailModal({ open: true, record }),
            style: { cursor: 'pointer' }
          })}
          expandable={{
            expandedRowRender: (li: any) => <DesList title="argument" data={li.argument} />
          }}
        />
      </Card>

      <Modal
        title="请求详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
      >
        {detailModal.record && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>用户</Text>
              <div>{detailModal.record.user}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>请求类型</Text>
              <div>{detailModal.record.type}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>消息</Text>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{detailModal.record.msg}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>时间</Text>
              <div>{dayjs(detailModal.record.timeStamp).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>参数</Text>
              <div><DesList title="" data={detailModal.record.argument} /></div>
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  )
}