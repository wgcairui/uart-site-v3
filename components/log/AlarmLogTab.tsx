'use client'
import React, { useState } from 'react'
import { Tag, Card, Table, DatePicker, Space, Modal, Typography } from 'antd'
import { loguartterminaldatatransfinites } from '@/lib/api/fetchRoot'
import { getColumnSearchProp } from '@/lib/utils/tableCommon'

import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface AlarmLogTabProps {
  mac: string
}

export const AlarmLogTab: React.FC<AlarmLogTabProps> = ({ mac }) => {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(10, 'day'),
    dayjs(),
  ])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: any }>({ open: false, record: null })

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const res = await loguartterminaldatatransfinites(
        range[0].format('YYYY-MM-DD'),
        range[1].format('YYYY-MM-DD'),
        { page, pageSize }
      )
      if (res.code === 200) {
        setData(res.data?.items || [])
        setPagination({
          page: res.data?.pagination?.page || 1,
          pageSize: res.data?.pagination?.pageSize || 20,
          total: res.data?.pagination?.total || 0
        })
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchData()
  }, [mac])

  const onRangeChange = (value: any) => {
    if (value) {
      const [start, end] = value as [dayjs.Dayjs, dayjs.Dayjs]
      setRange([start, end])
      fetchData(1, pagination.pageSize)
    }
  }

  const columns = [
    {
      dataIndex: 'isOk',
      title: '状态',
      width: 80,
      render: (val: boolean) => val ? <Tag color='green'>已确认</Tag> : <Tag>未确认</Tag>
    },
    {
      dataIndex: 'pid',
      title: 'pid',
      width: 60
    },
    {
      dataIndex: 'tag',
      title: '标签',
      width: 120
    },
    {
      dataIndex: 'msg',
      title: '消息',
      ...getColumnSearchProp('msg'),
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
          rowKey="_id"
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
        />
      </Card>

      <Modal
        title="告警详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
      >
        {detailModal.record && (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>MAC</Text>
              <div>{detailModal.record.mac}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>pid</Text>
              <div>{detailModal.record.pid}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>状态</Text>
              <div>{detailModal.record.isOk ? <Tag color='green'>已确认</Tag> : <Tag>未确认</Tag>}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>标签</Text>
              <div>{detailModal.record.tag}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>消息</Text>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{detailModal.record.msg}</div>
            </div>
            <div>
              <Text style={{ color: 'rgba(0,0,0,0.45)' }}>时间</Text>
              <div>{dayjs(detailModal.record.timeStamp).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  )
}