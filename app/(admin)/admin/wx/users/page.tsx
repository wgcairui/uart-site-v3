'use client'
import { DownOutlined } from '@ant-design/icons'
import { Avatar, Button, Divider, Dropdown, message, Modal, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { update_wx_users_all, wx_send_info, wx_users } from '@/lib/api/fetchRoot'
import { extractServerTableQuery, generateTableKey, makeServerSearchProp } from '@/lib/utils/tableCommon'
import { MyCopy } from '@/components/common/MyCopy'
import { usePromise } from '@/lib/hooks/usePromise'
import { PaginationReq, V2ListResponse } from '@/types'

export const WxUser: React.FC = () => {
  const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true })
  const [searchFields, setSearchFields] = useState<Record<string, string>>({})
  const apiQuery: PaginationReq = { ...query, search: searchFields }

  const { data: userData, loading, fecth } = usePromise<V2ListResponse<Uart.WX.userInfoPublic>>(async () => {
    const { data } = await wx_users(apiQuery)
    return data as V2ListResponse<Uart.WX.userInfoPublic>
  }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [JSON.stringify(apiQuery)])

  const data = useMemo(() => userData?.items ?? [], [userData])
  const pagination = userData?.pagination ?? { total: 0 }

  /**
   * 更新所有用户
   */
  const updateUsers = () => {
    Modal.confirm({
      content: '确定更新微信用户库?更新将耗时3~10分钟',
      onOk() {
        const now = Date.now()
        message.loading({ key: 'update_wx_users_all', content: 'loading...' })
        update_wx_users_all().then(() => {
          message.success({
            content: 'update success,耗时:' + ((Date.now() - now) / 1000).toFixed(0) + '秒',
            key: 'update_wx_users_all',
          })
          fecth()
        })
      },
    })
  }

  /**
   * 发送测试信息
   */
  const alarmTest = (openid: string) => {
    Modal.confirm({
      content: '确定发送测试信息?',
      onOk() {
        wx_send_info(0, openid).then(() => {
          message.success('send success,请注意查收')
        })
      },
    })
  }

  const handleSearch = (kv: Record<string, string>) => {
    setSearchFields(prev => ({ ...prev, ...kv }))
    setQuery(prev => ({ ...prev, page: 1 }))
  }

  return (
    <>
      <Divider plain>
        所有微信关注用户 / {pagination.total}
        <Button
          shape="round"
          type="primary"
          size="small"
          onClick={updateUsers}
          style={{ marginLeft: 8 }}
        >
          更新用户库
        </Button>
      </Divider>
      <Table
        loading={loading}
        dataSource={generateTableKey(data, 'openid')}
        rowKey="openid"
        scroll={{ x: 1100 }}
        pagination={{
          current: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          total: pagination.total,
          showTotal: t => `共 ${t} 条`,
          showSizeChanger: true,
        }}
        onChange={(pag, filters, sorter) => {
          const sq = extractServerTableQuery(pag, filters, sorter)
          setQuery(prev => ({
            ...prev,
            page: sq.page,
            pageSize: sq.pageSize,
            sortBy: sq.sortBy,
            sortOrder: sq.sortOrder,
            filters: sq.filters,
          } as any))
        }}
        columns={
          [
            {
              title: 'avater',
              dataIndex: 'headimgurl',
              width: 60,
              render: val => <Avatar src={val || null} size={38} />,
            },
            {
              dataIndex: 'nickname',
              title: 'nickname',
              ...makeServerSearchProp('nickname', handleSearch),
              render: val => <MyCopy value={val}></MyCopy>,
            },
            {
              dataIndex: 'openid',
              title: 'openid',
              ...makeServerSearchProp('openid', handleSearch),
              render: val => <MyCopy value={val}></MyCopy>,
            },
            {
              dataIndex: 'unionid',
              title: 'unionid',
              ...makeServerSearchProp('unionid', handleSearch),
              render: val => <MyCopy value={val}></MyCopy>,
            },
            {
              dataIndex: 'sex',
              title: '性别',
              render: val => (val ? '男' : '女'),
            },
            {
              title: 'city',
              key: 'city',
              render: (_, user) => `${user.country}-${user.province}-${user.city || user.province}`,
            },
            {
              dataIndex: 'subscribe_time',
              title: '关注时间',
              render: val => dayjs(val * 1000).format('YYYY-MM-DD'),
            },
            {
              key: 'test',
              title: '测试',
              render: (_, user) => (
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'test',
                        label: <Button onClick={() => alarmTest(user.openid)}>告警推送测试</Button>,
                      },
                    ],
                  }}
                >
                  <a>
                    测试
                    <DownOutlined />
                  </a>
                </Dropdown>
              ),
            },
          ] as ColumnsType<Uart.WX.userInfoPublic>
        }
      ></Table>
    </>
  )
}

export default WxUser