'use client'
import { SearchOutlined, UploadOutlined } from '@ant-design/icons'
import { Badge, Button, Divider, Form, Input, message, Modal, Space, Table, Upload } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import { UploadChangeParam } from 'antd/lib/upload'
import { RcFile, UploadFile } from 'antd/lib/upload/interface'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { ossDelete, ossFilelist, ossfiles } from '@/lib/api/fetchRoot'
import { getToken } from '@/lib/api/fetch'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { CopyClipboard } from '@/lib/utils/util'
import { usePromise } from '@/lib/hooks/usePromise'
import { universalResult, PaginationReq, V2ListResponse } from '@/types'

export const OssUpload: React.FC = () => {
  const [prefix, setPrefix] = useState<string>()
  const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20 })
  const [searchInput, setSearchInput] = useState<string>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  /** 服务端搜索 = 把 prefix 触发 search + 翻第 1 页 */
  const apiQuery: PaginationReq = { ...query, search: { prefix: searchInput || '' } as any }

  const { data: listData, loading, fecth, setData } = usePromise<
    V2ListResponse<ossfiles & { label?: string }>
  >(async () => {
    const { data } = await ossFilelist(searchInput, apiQuery)
    return data as V2ListResponse<ossfiles & { label?: string }>
  }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [JSON.stringify(apiQuery)])

  const files = useMemo(() => listData?.items ?? [], [listData])
  const pagination = listData?.pagination ?? { total: 0 }

  /**
   * 删除 oss 文件
   */
  const deleteoss = (names: string[]) => {
    Modal.confirm({
      title: `确认删除 ${names.length} 个文件?`,
      content: (
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {names.map(n => (
            <div key={n} style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {n.split('/').reverse()[0]}
            </div>
          ))}
        </div>
      ),
      okText: '删除',
      okButtonProps: { danger: true },
      onOk() {
        ossDelete(names).then(() => {
          // 本地过滤已删除项
          setData({
            ...listData,
            items: (listData?.items ?? []).filter((e2: ossfiles) => !names.includes(e2.name)),
          })
          setSelectedRowKeys([])
          message.success(`已删除 ${names.length} 个文件`)
        })
      },
    })
  }

  const handleSearch = () => {
    setSearchInput(prefix)
    setQuery(q => ({ ...q, page: 1 }))
  }

  const s = ({ file }: UploadChangeParam<UploadFile<universalResult<any>>>) => {
    if (file.status === 'done') {
      const { name, response, size, lastModifiedDate } = file
      const data = response?.data!
      if (response?.code === 0) {
        message.error(response.message)
        return
      }
      message.success(`${name}上传已完成`)
      setData({
        ...listData,
        items: [
          {
            name: data.name,
            url: data.url,
            label: name,
            size: size!,
            lastModified: lastModifiedDate as any,
          },
          ...(listData?.items ?? []),
        ],
      })
      CopyClipboard(data.url)
    }
  }

  return (
    <>
      <Divider>上传文件到 ali-oss, 如果上传失败,请将文件压缩之后重试</Divider>
      <Upload
        onChange={s}
        multiple
        action="/api/v2/admin/system/oss/upload"
        headers={{ Authorization: `Bearer ${getToken()}` || '' }}
      >
        <Button icon={<UploadOutlined />}>Click to Upload</Button>
      </Upload>
      <Divider>oss 文件列表 / 共 {pagination.total} 个</Divider>
      <Form layout="inline" style={{ marginBottom: 22 }}>
        <Form.Item label="搜索">
          <Input
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            onPressEnter={handleSearch}
            placeholder="oss 文件前缀(空=全部)"
            style={{ width: 280 }}
            allowClear
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={handleSearch} icon={<SearchOutlined />} type="primary">
              搜索
            </Button>
            <Button
              danger
              onClick={() => deleteoss(selectedRowKeys as any)}
              disabled={selectedRowKeys.length === 0}
            >
              删除所选({selectedRowKeys.length})
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        loading={loading}
        dataSource={generateTableKey(files, 'name')}
        rowKey="name"
        scroll={{ x: 900 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          current: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: t => `共 ${t} 个`,
        }}
        onChange={pag => {
          setQuery(q => ({
            ...q,
            page: pag.current ?? q.page ?? 1,
            pageSize: pag.pageSize ?? q.pageSize ?? 20,
          }))
        }}
        columns={
          [
            {
              dataIndex: 'name',
              title: 'name',
              render: (val: string, re) => (
                <>
                  {re.label ? (
                    <Badge.Ribbon text="本次上传">{val.split('/').reverse()[0]}</Badge.Ribbon>
                  ) : (
                    val.split('/').reverse()[0]
                  )}
                </>
              ),
            },
            {
              dataIndex: 'label',
              title: '文件名',
              render: val => val || '',
            },
            {
              dataIndex: 'size',
              title: 'size',
              render: (val: string) => (Number(val) / 1024).toFixed(0) + 'KB',
            },
            {
              dataIndex: 'lastModified',
              title: '上传日期',
              render: val => dayjs(val).format('YY-MM-DD H:m:s'),
            },
            {
              key: 'oprate',
              title: '操作',
              render: (_, re) => (
                <>
                  <Button
                    onClick={() => CopyClipboard(re.url.replace('http:', 'https:'))}
                    type="link"
                  >
                    复制链接
                  </Button>
                  <Button href={re.url} target="_blank" type="link">
                    打开链接
                  </Button>
                  <Button onClick={() => deleteoss([re.name])} type="link" danger>
                    删除
                  </Button>
                </>
              ),
            },
          ] as ColumnsType<ossfiles & { label?: string }>
        }
      ></Table>
    </>
  )
}

export default OssUpload