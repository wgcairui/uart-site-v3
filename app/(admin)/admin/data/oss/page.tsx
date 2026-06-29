'use client'
/**
 * OSS 文件管理 — /admin/data/oss
 *
 * 2026-06-28 全面重构（vs 旧 oss/page.tsx 233 行 hack 版本）：
 * - 三段式布局（PageHeader + PageSummary + Form + Table），跟全站一致
 * - usePromise<V2ListResponse<ossfiles>> 替换 fallback `data?.items ?? []`
 * - 修旧版 L77 bug：上传响应 `code === 0` 是 success 不是失败（跟 fetch-impl.ts 一致）
 * - 上传成功后 fecth() 重新拉列表（替换手动 setData hack）
 * - URL 复制修复：直接复制原 URL（OSS 返回 https，不用 http→https 手工改）
 * - size 自适应 B/KB/MB/GB（旧版永远 KB，小文件显示不对、大文件 >1024KB 也不换 MB）
 * - PageSummary 按 mime 分桶（image/document/other），弥补 server list 无 total
 * - 排序：size / lastModified（server 端 marker 翻页 + Redis cache，见 admin-system.controller.ts）
 * - 删 "本次上传未保存" Badge（hack 残留）
 *
 * 接口契约：lib/api/endpoints/admin/system.ts ossFilelist
 *   GET /api/v2/admin/system/oss/files?prefix=&page=&pageSize=&sortBy=&sortOrder=
 *   返回 V2ListResponse<ossfiles>（pagination 无 total，server needTotal=false）
 */
import { CopyOutlined, DeleteOutlined, LinkOutlined, SearchOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Form, Input, message, Modal, Space, Table, Tooltip, Upload } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/lib/table'
import type { UploadChangeParam } from 'antd/lib/upload'
import type { UploadFile } from 'antd/lib/upload/interface'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { ossDelete, ossFilelist, ossfiles } from '@/lib/api/fetchRoot'
import { getToken } from '@/lib/api/fetch'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { CopyClipboard } from '@/lib/utils/util'
import { usePromise } from '@/lib/hooks/usePromise'
import { PageHeader } from '@/components/common/PageHeader'
import { PageSummary } from '@/components/common/PageSummary'
import { PaginationReq, V2ListResponse } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * 自适应 size 格式化 (B/KB/MB/GB)。
 * 旧版只显示 KB，小文件 0KB、大文件 >1024 也不换 MB，体验差。
 */
function formatSize(bytes: number | string | undefined): string {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 按 mime 推断文件类型桶（用于 PageSummary 卡片）。
 * OSS name 也带 mime (e.g. "image/png/foo.png")，优先用 server 返回的 type 字段。
 */
function bucketType(meta: ossfiles): 'image' | 'document' | 'other' {
  const mime = (meta.type || meta.name.split('/')[0] || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('word')
  ) {
    return 'document'
  }
  return 'other'
}

/**
 * 从 OSS name 路径取 basename (e.g. "image/png/foo.png" → "foo.png")。
 * OSS name 是按 mimeType/filename 拼的 (admin-system.controller.ts L138-141)，
 * 用 basename 显示更直观。
 */
function basename(name: string): string {
  return name.split('/').pop() || name
}

const DEFAULT_PAGINATION: V2ListResponse<ossfiles>['pagination'] = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

// ─── component ──────────────────────────────────────────────────────────────

export const OssUpload: React.FC = () => {
  const [prefix, setPrefix] = useState<string>('')
  const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  /** 搜索 button / Enter 触发：把 prefix 提交给 apiQuery，重置回 page 1 */
  const triggerSearch = () => {
    setQuery(q => ({ ...q, page: 1 }))
  }

  /** 把 query 的 page/pageSize/sortBy/sortOrder 跟 prefix 合并给后端。
   * PaginationReq 类型不含 prefix（prefix 是 ossFilelist 单独的 query param），
   * 用 intersection 扩展，TS 编译期对齐 ossFilelist 实际接的参数形状。
   */
  const apiQuery: PaginationReq & { prefix: string } = { ...query, prefix }

  const {
    data: listData,
    loading,
    fecth,
  } = usePromise<V2ListResponse<ossfiles>>(
    async () => {
      const { data } = await ossFilelist(prefix, apiQuery)
      return data
    },
    { items: [], pagination: DEFAULT_PAGINATION },
    [JSON.stringify(apiQuery)],
  )

  const files = useMemo(() => listData?.items ?? [], [listData])
  const pagination = listData?.pagination ?? DEFAULT_PAGINATION

  // PageSummary: 按 mime 分桶（弥补 server list 无 total 字段）
  const buckets = useMemo(() => {
    const counts = { image: 0, document: 0, other: 0 }
    for (const f of files) counts[bucketType(f)]++
    return counts
  }, [files])

  /**
   * 删除 OSS 文件（支持单删 + 批量）
   * - onOk 返回 Promise 让 Modal.confirm 自带 loading
   * - 成功后清空选择 + 重新拉列表（替换旧版手动 setData hack）
   */
  const deleteFiles = (names: string[]) => {
    Modal.confirm({
      title: `确认删除 ${names.length} 个文件?`,
      content: (
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {names.map(n => (
            <div key={n} style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 }}>
              {basename(n)}
            </div>
          ))}
        </div>
      ),
      okText: '删除',
      okButtonProps: { danger: true },
      onOk() {
        return ossDelete(names).then(() => {
          setSelectedRowKeys([])
          message.success(`已删除 ${names.length} 个文件`)
          return fecth()
        })
      },
    })
  }

  /**
   * 上传响应处理 — 修旧版 L77 bug。
   *
   * 旧版（错）：
   *   if (response?.code === 0) {
   *     message.error(response.message)
   *     return
   *   }
   *   message.success(`${name}上传已完成`)
   *
   * 错点：
   *   1) `code === 0` 是 success 状态（fetch-impl.ts 无内容兜底 code=0；
   *      server 业务返回 code=200/0 都视为 success，见 protocols/page.tsx:52 / 132）
   *   2) `message.error` 后 `return` 阻断后续 success 分支
   *   3) 没真正调用 fecth() 刷新，本地 setData 容易和服务端不一致
   *
   * 修后：code === 0 或 200 → success；其他 → error。成功后再 fecth() 一次。
   */
  const handleUploadChange = ({ file }: UploadChangeParam<UploadFile<any>>) => {
    if (file.status !== 'done') return
    const { name, response } = file
    const code = response?.code
    if (code === 0 || code === 200) {
      message.success(`${name} 上传成功`)
      fecth()
    } else {
      message.error(response?.message || `${name} 上传失败`)
    }
  }

  const columns: ColumnsType<ossfiles> = [
    {
      dataIndex: 'name',
      title: '文件名',
      ellipsis: true,
      render: (val: string) => (
        <code style={{ fontSize: 12, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
          {basename(val)}
        </code>
      ),
    },
    {
      dataIndex: 'size',
      title: 'size',
      width: 110,
      sorter: true,
      render: (val: number | string) => formatSize(val),
    },
    {
      dataIndex: 'lastModified',
      title: '修改时间',
      width: 170,
      sorter: true,
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      key: 'oprate',
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, re) => (
        <Space size={0} wrap>
          <Tooltip title="复制 URL（OSS 返回 https，不用 http→https 手工改）">
            <Button onClick={() => CopyClipboard(re.url)} type="link" icon={<CopyOutlined />}>
              复制
            </Button>
          </Tooltip>
          <Tooltip title="新窗口打开">
            <Button href={re.url} target="_blank" type="link" icon={<LinkOutlined />}>
              打开
            </Button>
          </Tooltip>
          <Tooltip title="删除文件">
            <Button onClick={() => deleteFiles([re.name])} type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, any[] | null>,
    sorter: any,
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter
    const nextSortBy = s?.field as PaginationReq['sortBy']
    const nextSortOrder: PaginationReq['sortOrder'] =
      s?.order === 'ascend' ? 'asc' : s?.order === 'descend' ? 'desc' : undefined
    // 直接构造新对象（oss 页面 query 不带 search/filters，分页+排序是唯一维度）
    // exactOptionalPropertyTypes 不接受显式 undefined，用条件展开避免
    const next: PaginationReq = {
      page: pag.current ?? query.page ?? 1,
      pageSize: pag.pageSize ?? query.pageSize ?? 20,
      ...(nextSortBy ? { sortBy: nextSortBy } : {}),
      ...(nextSortOrder ? { sortOrder: nextSortOrder } : {}),
    }
    setQuery(next)
  }

  return (
    <>
      <PageHeader
        title="OSS 文件管理"
        breadcrumb={[{ title: '首页', href: '/admin' }, { title: '设备数据' }]}
        extra={
          <Space>
            <Button icon={<SyncOutlined />} onClick={() => fecth()}>
              刷新
            </Button>
            <Upload
              onChange={handleUploadChange}
              multiple
              action="/api/v2/admin/system/oss/upload"
              headers={{ Authorization: `Bearer ${getToken()}` }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} type="primary">
                上传文件
              </Button>
            </Upload>
          </Space>
        }
      />
      <PageSummary
        items={[
          { label: '本页文件', value: files.length, variant: 'primary' },
          { label: '图片', value: buckets.image, variant: 'info' },
          { label: '文档', value: buckets.document, variant: 'success' },
          { label: '其他', value: buckets.other, variant: 'warning' },
        ]}
      />
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="前缀">
          <Input
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            onPressEnter={triggerSearch}
            placeholder="按文件名前缀过滤 (空 = 全部)"
            style={{ width: 320 }}
            allowClear
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={triggerSearch} icon={<SearchOutlined />} type="primary">
              查找
            </Button>
            <Button
              danger
              disabled={selectedRowKeys.length === 0}
              onClick={() => deleteFiles(selectedRowKeys as string[])}
            >
              删除所选 ({selectedRowKeys.length})
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        loading={loading}
        dataSource={generateTableKey(files, 'name')}
        rowKey="name"
        scroll={{ x: 800 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
          columnWidth: 48,
        }}
        pagination={{
          current: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          total: pagination.total ?? 0,
          showTotal: t =>
            pagination.hasNext
              ? `本页 ${files.length} 个 · 还有更多（点右下角切换 pageSize 看更多）`
              : t > 0
                ? `共 ${t} 个`
                : '本页空',
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
        }}
        onChange={handleTableChange}
        columns={columns}
      />
    </>
  )
}

export default OssUpload
