'use client'
import { Button, Form, Input, message, Modal, Space, Table, Tag, Typography, Spin } from "antd"
import React, { useState } from "react";
import { redisflushdb, rediskeys, rediskeysdel, rediskeysdValue } from "@/lib/api/fetchRoot";
import { generateTableKey, getColumnSearchProp } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { PaginationReq } from "@/types";

const { Text } = Typography;

/** Redis 键列表数据类型 */
interface RedisKeyItem {
    key: string
    value: any
    loading: boolean
}

interface RedisListData {
    items: RedisKeyItem[]
    pagination: {
        page?: number
        pageSize?: number
        total?: number
    }
}

/**
 * 格式化 Redis value 展示
 */
const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') {
        // HASH/LIST/SET/ZSET 类型
        if (Array.isArray(value)) {
            return value.length > 10
                ? '[\n  ' + value.slice(0, 10).join(',\n  ') + `,\n  ... 共 ${value.length} 项\n]`
                : JSON.stringify(value, null, 2)
        }
        // HASH 对象
        const entries = Object.entries(value)
        if (entries.length > 5) {
            const preview = entries.slice(0, 5).map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`).join('\n')
            return `{\n${preview},\n  ... 共 ${entries.length} 项\n}`
        }
        return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try { return JSON.stringify(JSON.parse(value), null, 2) } catch { /* fall through */ }
    }
    return String(value)
}

/**
 * 获取 value 类型标签
 */
const getValueTypeTag = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return null
    if (Array.isArray(value)) {
        return <Tag color="purple" style={{ marginLeft: 8 }}>list [{value.length}]</Tag>
    }
    if (typeof value === 'object') {
        return <Tag color="green" style={{ marginLeft: 8 }}>hash {Object.keys(value).length} fields</Tag>
    }
    return <Tag color="default" style={{ marginLeft: 8 }}>string</Tag>
}

export const Redis: React.FC = () => {

    const [key, setKey] = useState("")
    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 50 })

    const list = usePromise<RedisListData>(async () => {
        const { data } = await rediskeys(key + "*", query)
        const items = (data.items || data as any) ?? []
        return {
            items: items.map((el: any) => ({ key: el, value: null, loading: false })),
            pagination: data.pagination ?? {}
        }
    }, { items: [], pagination: {} }, [key, JSON.stringify(query)])

    /**
     * 获取键值
     */
    const fetchValue = (targetKey: string) => {
        // 标记该行 loading
        const newItems = list.data.items.map((item) =>
            item.key === targetKey ? { ...item, loading: true } : item
        )
        list.setData({ ...list.data, items: newItems })

        return rediskeysdValue([targetKey]).then(el => {
            const updatedItems = list.data.items.map((item) =>
                item.key === targetKey ? { ...item, value: el.data?.[0] ?? '-', loading: false } : item
            )
            list.setData({ ...list.data, items: updatedItems })
        })
    }

    /**
     * 删除键值
     */
    const delValue = (targetKey: string) => {
        rediskeysdel([targetKey]).then(() => {
            const newItems = list.data.items.filter((item) => item.key !== targetKey)
            list.setData({ ...list.data, items: newItems })
            message.success(`已删除: ${targetKey}`)
        })
    }

    const redisflushdbs = () => {
        Modal.confirm({
            content: `此操作不可逆,只有在服务器缓存出错并且找不到出错的问题时执行,清理完将会重启服务程序,确定清除整个数据库??`,
            onOk() {
                redisflushdb().then(el => {
                    message.success("清除成功" + el.data)
                })
            }
        })
    }

    const handleSearch = () => {
        setQuery(q => ({ ...q, page: 1 }))
    }

    return (
        <>
            <Form layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item label="key">
                    <Input
                        value={key}
                        placeholder="输入键+*匹配"
                        onChange={e => setKey(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 320 }}
                    />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" onClick={handleSearch}>查找</Button>
                        <Button type="default" onClick={() => redisflushdbs()}>清空redis</Button>
                    </Space>
                </Form.Item>
            </Form>
            <Table
                size="small"
                loading={list.loading}
                dataSource={generateTableKey(list.data.items, 'key')}
                rowKey="key"
                pagination={list.data.pagination
                    ? {
                        current: list.data.pagination.page || 1,
                        pageSize: query.pageSize!,
                        total: list.data.pagination.total || 0,
                        showSizeChanger: true,
                        pageSizeOptions: ['20', '50', '100', '200'],
                        showTotal: (total: number) => `共 ${total} 条`,
                    }
                    : false
                }
                onChange={(pag) => {
                    if (pag.current) setQuery(q => ({ ...q, page: pag.current! }))
                    if (pag.pageSize) setQuery(q => ({ ...q, pageSize: pag.pageSize! }))
                }}
                columns={[
                    {
                        dataIndex: 'key',
                        title: 'key',
                        width: 300,
                        ellipsis: true,
                        ...getColumnSearchProp('key') as any,
                        render: (v: string) => <Tag color="blue">{v}</Tag>
                    },
                    {
                        dataIndex: 'value',
                        title: 'value',
                        ellipsis: { showTitle: false },
                        ...getColumnSearchProp('value') as any,
                        render: (v: any, record: RedisKeyItem) => (
                            record.loading
                                ? <Spin size="small" />
                                : v === null
                                    ? <Button size="small" type="link" onClick={() => fetchValue(record.key)}>点击加载</Button>
                                    : <span>
                                        <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>
                                            {formatValue(v)}
                                        </pre>
                                        {getValueTypeTag(v)}
                                      </span>
                        )
                    },
                    {
                        key: 'operation',
                        title: '操作',
                        width: 160,
                        render: (_, record) => (
                            <Space size="small">
                                <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => fetchValue(record.key)}
                                >
                                    刷新
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    onClick={() => {
                                        Modal.confirm({
                                            title: '确认删除',
                                            content: <Text code>{record.key}</Text>,
                                            onOk: () => delValue(record.key)
                                        })
                                    }}
                                >
                                    删除
                                </Button>
                            </Space>
                        )
                    }
                ]}
            />
        </>
    )
}

export default Redis
