'use client'
import { SearchOutlined } from "@ant-design/icons";
import { Input, Space, Button, TableProps } from "antd";
import { ColumnFilterItem, ColumnType, FilterDropdownProps } from "antd/lib/table/interface";
import { SorterResult, TableCurrentDataSource } from "antd/lib/table/interface";
import { BRAND } from '@/lib/utils/designTokens'


type index = keyof Uart.uartAlarmObject

// ─── Client-side (legacy) helpers ────────────────────────────────────────────

/**
 * 用于table表格刷选数据（客户端过滤，仅用于小数据集）
 * @deprecated 优先使用 makeServerSearchProp 进行服务端搜索
 */
export function getColumnSearchProp<T,>(dataIndex: keyof T, val: string = ''): Partial<ColumnType<T>> {
    return {
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={`Search ${dataIndex as any}`}
                    value={selectedKeys[0] as string}
                    onChange={e => {
                        setSelectedKeys(e.target.value ? [e.target.value] : [])
                        val = e.target.value || ''
                    }}
                    onPressEnter={() => confirm({ closeDropdown: false })}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm({ closeDropdown: true })}
                        size="small"
                        style={{ width: 90 }}
                    >
                        查找
                    </Button>
                    <Button onClick={() => {
                        clearFilters!()
                        confirm({ closeDropdown: true })
                        val = ''
                    }} size="small" style={{ width: 90 }}>
                        重置
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? BRAND.start : undefined }} />,
        onFilter: (value: any, record: any) =>
            record[dataIndex]
                ? record[dataIndex]!.toString().toLowerCase().includes((value as string).toLowerCase())
                : false,
        render: text =>
            val ? (
                <span style={{ backgroundColor: '#ffc069' }}>{text}</span>
            ) : (
                text
            )
    }
}


/**
 * table默认配置
 */
export const tableConfig: Partial<TableProps<any>> = {

    /**
     * 分页器配置
     * @see https://ant-design.gitee.io/components/pagination-cn/#API
     */
    pagination: {
        defaultPageSize: 10,
        hideOnSinglePage: true
    },
    sticky: true
}


/**
 * table表格刷选（客户端过滤，仅用于小数据集）
 * @deprecated 优先使用 makeServerFilterProp 进行服务端过滤
 */
export const tableColumnsFilter = <T extends Record<string, any>>(data: T[], key: keyof T) => {
    const vals = data.map(el => typeof el[key] === 'string' ? el[key] : false).filter(el => el)
    const set = new Set<string>(vals as any)
    return {
        filters: [...set].map((el) => ({ text: el, value: el })) as ColumnFilterItem[],
        onFilter: (value: any, record: T) => record[key] === value
    }
}


type tableData<T> = T extends Array<infer P> ? (P & { key: string })[] : T

/**
 * antd table生成key键
 */
export const generateTableKey = <T extends Array<any>>(tableData: T, key: T extends Array<infer P> ? keyof P : string): tableData<T> => {
    try {
        return tableData.map((el, i) => ({ ...el, key: el[key] + i })) as any
    } catch (error) {
        console.error('[]', tableData);
        return [] as any
    }
}


// ─── Server-side helpers ──────────────────────────────────────────────────────

export interface ServerTableQuery {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: Record<string, string>;
    filters?: Record<string, string[]>;
}

/**
 * 从 antd Table onChange 事件中提取服务端查询参数
 */
export function extractServerTableQuery(
    pagination: any,
    filters: Record<string, any[] | null>,
    sorter: SorterResult<any> | SorterResult<any>[],
    _extra?: TableCurrentDataSource<any>
): ServerTableQuery {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const enumFilters: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(filters)) {
        if (val && val.length > 0) {
            enumFilters[key] = val.map(String);
        }
    }

    const query: ServerTableQuery = {
        page: pagination?.current ?? 1,
        pageSize: pagination?.pageSize ?? 20,
    };
    if (s?.field) query.sortBy = s.field as string;
    if (s?.order === 'ascend') query.sortOrder = 'asc';
    else if (s?.order === 'descend') query.sortOrder = 'desc';
    if (Object.keys(enumFilters).length > 0) query.filters = enumFilters;

    return query;
}

/**
 * 生成支持服务端关键词搜索的列配置
 */
export function makeServerSearchProp<T>(
    field: keyof T & string,
    onSearch: (search: Record<string, string>) => void
): Partial<ColumnType<T>> {
    return {
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={`搜索 ${field}`}
                    value={selectedKeys[0] as string}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => {
                        confirm({ closeDropdown: true });
                        onSearch({ [field]: selectedKeys[0] as string || '' });
                    }}
                    style={{ marginBottom: 8, display: 'block' }}
                    autoFocus
                />
                <Space>
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                        onClick={() => {
                            confirm({ closeDropdown: true });
                            onSearch({ [field]: selectedKeys[0] as string || '' });
                        }}
                    >
                        搜索
                    </Button>
                    <Button
                        size="small"
                        style={{ width: 90 }}
                        onClick={() => {
                            clearFilters?.();
                            confirm({ closeDropdown: true });
                            onSearch({ [field]: '' });
                        }}
                    >
                        重置
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => (
            <SearchOutlined style={{ color: filtered ? BRAND.start : undefined }} />
        ),
    };
}

/**
 * 生成支持服务端枚举过滤的列配置
 */
export function makeServerFilterProp<T>(
    field: keyof T & string,
    enumValues: string[]
): Partial<ColumnType<T>> {
    return {
        filters: enumValues.map(v => ({ text: v, value: v })) as ColumnFilterItem[],
    };
}
