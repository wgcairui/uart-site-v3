'use client'
import { DeleteFilled, WarningFilled, PlusOutlined, AppstoreOutlined, FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Space, Spin, Table, Tooltip } from 'antd'
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDevType, deleteDevModel, DevTypes, getDevModelStats } from "@/lib/api/fetchRoot";
import {
    generateTableKey,
    makeServerSearchProp,
    makeServerFilterProp,
    extractServerTableQuery,
} from "@/lib/utils/tableCommon";
import { ProtocolsCascader } from "@/components/protocol/ProtocolsCascader";
import { usePromise } from "@/lib/hooks/usePromise";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSummary, type SummaryVariant } from "@/components/common/PageSummary";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationReq } from "@/types";

interface props {
    ok?: () => void;
    visible: boolean;
    onCancel: () => void;
    initialValue?: Uart.DevsType | null;
}

const AddDevModel: React.FC<props> = ({ ok, visible, onCancel, initialValue }) => {
    const types = {
        ups: "UPS",
        air: "空调",
        em: "电量仪",
        th: "温湿度",
        'io': "IO"
    } as any

    const [model, setModel] = useState('')
    const [protocol, setProtocol] = useState<[Uart.protocolType, string][]>([])

    useEffect(() => {
        if (visible) {
            if (initialValue) {
                setModel(initialValue.DevModel);
                const p = initialValue.Protocols?.map(el => [el.Type as unknown as Uart.protocolType, el.Protocol] as [Uart.protocolType, string]) || [];
                setProtocol(p);
            } else {
                setModel('');
                setProtocol([]);
            }
        }
    }, [visible, initialValue]);

    const addDevTypes = () => {
        if (!protocol.length) return message.warning("请至少选择一个协议");
        const Type = protocol[0]?.[0];
        if (!Type) return;
        const Protocols = protocol.map(el => el[1])
        addDevType(types[Type] || "UPS", model, Protocols.map(el => ({ ProtocolType: Type, Protocol: el })))
            .then(() => {
                message.success("保存成功");
                onCancel();
                ok && ok()
            });
    }

    return (
        <Modal
            title={initialValue ? "编辑设备配置" : "添加设备类型"}
            open={visible}
            onCancel={onCancel}
            onOk={addDevTypes}
            destroyOnHidden
        >
            <Form labelCol={{ span: 5 }}>
                <Form.Item label="设备型号">
                    <Input value={model} onChange={e => setModel(e.target.value)} disabled={!!initialValue} placeholder="输入设备型号" />
                </Form.Item>
                <Form.Item label="设备协议">
                    <ProtocolsCascader value={protocol} onChange={(val: any) => setProtocol(val)} multiple></ProtocolsCascader>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export const DevModel: React.FC = () => {

    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true });
    const [searchFields, setSearchFields] = useState<Record<string, string>>({});
    const [topSearch, setTopSearch] = useState('');
    /** 设备类型 stat 筛选：多选叠加 */
    const [statFilter, setStatFilter] = useState<string[]>([]);
    const [visible, setVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<Uart.DevsType | null>(null);
    const router = useRouter();
    const apiQuery: PaginationReq = {
        ...query,
        search: searchFields,
        filters: { ...(query.filters || {}), ...(statFilter.length ? { Type: statFilter } : {}) },
    };

    const { data: devModelData, loading, fecth } = usePromise<any>(async () => {
        const { data } = await DevTypes(apiQuery)
        return data
    }, { items: [], pagination: {} }, [JSON.stringify(apiQuery)])

    const data: any[] = devModelData?.items ?? [];
    const pagination = devModelData?.pagination ?? {};

    const { data: devModelStats } = usePromise(async () => {
        const { data } = await getDevModelStats()
        return Array.isArray(data) ? data : []
    }, [])

    const deleteDevModels = (DevModel: string) => {
        Modal.confirm({
            content: `确定删除型号"${DevModel}"？？？`,
            icon: <WarningFilled />,
            onOk() {
                deleteDevModel(DevModel)
                    .then((el) => {
                        if (el.code) {
                            message.success("删除成功")
                            fecth()
                        } else {
                            Modal.warn({ content: `${el.data} 等设备还在使用此类型` })
                        }
                    });
            }
        })
    }

    const handleSearch = (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }));
        setQuery(prev => ({ ...prev, page: 1 }));
    };

    const handleTopSearch = (val: string) => {
        // 同时清空列头 filter + 设 top search (搜索 "DevModel" 字段)
        if (val) {
            setSearchFields({ DevModel: val });
        } else {
            setSearchFields({});
        }
        setQuery(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title="设备类型"
                breadcrumb={[
                    { title: '首页', href: '/admin' },
                    { title: '设备类型' },
                ]}
                extra={
                    <Space>
                        <Input.Search
                            placeholder="搜索设备型号 (DevModel)"
                            value={topSearch}
                            onChange={e => setTopSearch(e.target.value)}
                            onSearch={handleTopSearch}
                            enterButton
                            style={{ width: 280 }}
                            allowClear
                        />
                        <Tooltip title="刷新">
                            <Button icon={<ReloadOutlined />} onClick={() => fecth()} shape="circle" />
                        </Tooltip>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setVisible(true); }} className="btn-brand">
                            添加设备
                        </Button>
                    </Space>
                }
            />
            <PageSummary
                column={4}
                items={[
                    {
                        label: '设备类型总数',
                        value: pagination.total ?? data.length,
                        variant: 'primary',
                        icon: <AppstoreOutlined />,
                        active: statFilter.length === 0 && !topSearch && Object.keys(searchFields).length === 0,
                        onClick: () => {
                            setStatFilter([])
                            setTopSearch('')
                            setSearchFields({})
                            setQuery(prev => ({ ...prev, page: 1 }))
                        },
                    },
                    ...(devModelStats || []).slice(0, 3).map((s: any): { label: string; value: any; variant: SummaryVariant; icon: React.ReactNode; active: boolean; onClick: () => void } => ({
                        label: s.type,
                        value: s.value,
                        variant: 'info',
                        icon: <FilterOutlined />,
                        active: statFilter.includes(s.type),
                        onClick: () => {
                            setStatFilter(prev =>
                                prev.includes(s.type)
                                    ? prev.filter(t => t !== s.type)
                                    : [...prev, s.type]
                            );
                            setQuery(prev => ({ ...prev, page: 1 }));
                        },
                    })),
                ]}
            />
            <AddDevModel visible={visible} onCancel={() => setVisible(false)} initialValue={editingItem} ok={fecth} />
            <div className="bento-card" style={{ padding: 20, marginBottom: 20 }}>
                {loading && data.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        description={
                            statFilter.length > 0
                                ? `当前过滤条件 (${statFilter.join(', ')}) 下无设备类型`
                                : topSearch
                                    ? `搜索 "${topSearch}" 无结果`
                                    : '暂无设备类型,试试添加第一个'
                        }
                        actionLabel={
                            statFilter.length > 0 || topSearch || Object.keys(searchFields).length > 0
                                ? '清除过滤'
                                : '添加设备'
                        }
                        onAction={
                            statFilter.length > 0 || topSearch || Object.keys(searchFields).length > 0
                                ? () => {
                                    setStatFilter([])
                                    setTopSearch('')
                                    setSearchFields({})
                                    setQuery(prev => ({ ...prev, page: 1 }))
                                }
                                : () => { setEditingItem(null); setVisible(true) }
                        }
                        secondaryLabel="刷新"
                        onSecondary={() => fecth()}
                    />
                ) : (
                    <Table className="v3-table"                 loading={loading}
                        dataSource={generateTableKey(data, "_id")}
                        pagination={{
                            current: query.page || 1,
                            pageSize: query.pageSize || 20,
                            total: pagination.total,
                            showTotal: (t) => `共 ${t} 条`,
                            showSizeChanger: true,
                        }}
                        onChange={(pag, filters, sorter) => {
                            const sq = extractServerTableQuery(pag, filters, sorter);
                            setQuery(prev => ({
                                ...prev,
                                page: sq.page,
                                pageSize: sq.pageSize,
                                sortBy: sq.sortBy,
                                sortOrder: sq.sortOrder,
                                filters: sq.filters,
                            } as any));
                        }}
                    >
                        <Table.Column
                            dataIndex="DevModel"
                            title="设备型号"
                            sorter={true}
                            {...makeServerSearchProp("DevModel", handleSearch) as any}
                        />
                        <Table.Column
                            dataIndex="Type"
                            title="设备类型"
                            {...makeServerFilterProp("Type",
                                devModelStats.map((s: any) => s.type).filter(Boolean)
                            ) as any}
                        />
                        <Table.Column
                            dataIndex="Protocols"
                            title="协议集"
                            render={(val: any[]) => val?.map(el => el.Protocol).join(",")}
                        />
                        <Table.Column
                            key="oprate"
                            title="操作"
                            render={(_, re: Uart.DevsType) => (
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button type="link" size="small" onClick={() => { setEditingItem(re); setVisible(true); }}>编辑</Button>
                                    <Button type="link" size="small" danger onClick={() => deleteDevModels(re.DevModel)} icon={<DeleteFilled />}></Button>
                                </div>
                            )}
                        />
                    </Table>
                )}
            </div>
        </div>
    )
}

export default DevModel
