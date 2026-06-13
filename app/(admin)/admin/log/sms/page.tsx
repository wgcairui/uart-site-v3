'use client'
import { Card, Divider, Input, Table, Tabs, Space, Button } from "antd"
import { useState } from "react"
import { getUserAlarmSetups, logsmssends, logsmssendsCountInfo } from "@/lib/api/fetchRoot"
import { extractServerTableQuery, generateTableKey, getColumnSearchProp, makeServerSearchProp } from "@/lib/utils/tableCommon"
import { UserDes } from "@/components/data/UserDes"
import { usePromise } from "@/lib/hooks/usePromise"
import { Log } from "@/components/log/log";
import { DesList } from "@/components/data/DesList";
import { PageSummary } from "@/components/common/PageSummary";
import { PaginationReq, V2ListResponse } from "@/types";

/**
 * smslog
 * @returns
 */
export const LogSms: React.FC = () => {
    const [phone, setPhone] = useState("")
    const [refreshKey, setRefreshKey] = useState(0)
    const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20, needTotal: true });
    const [searchFields, setSearchFields] = useState<Record<string, string>>({});

    const parse = (str: string, keys: string[]) => {
        try {
            const j = JSON.parse(str)
            for (let index = 0; index < keys.length; index++) {
                const key = keys[index];
                if (!key) continue;
                if (key in j) return key + ':' + j[key]
            }
        } catch (error) {
            return str
        }
    }

    // 全网短信消费统计（一次性拉，用于"全网总消费"汇总和每用户消费数）
    const { data: smsMap } = usePromise<Map<string, number>>(async () => {
        const smsRes = await logsmssendsCountInfo()
        return new Map((smsRes.data as any[] || []).map((el: any) => [el._id, el.sum]))
    }, new Map())

    // 用户分页 + 每页用户的消费数（client-side 计算）
    const apiQuery: PaginationReq = { ...query, search: searchFields };
    const { data: userData, loading, fecth: refetchUsers } = usePromise<V2ListResponse<Uart.userSetup>>(async () => {
        const { data } = await getUserAlarmSetups(apiQuery);
        return data as V2ListResponse<Uart.userSetup>;
    }, { items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } }, [JSON.stringify(apiQuery)]);

    const users = userData?.items ?? [];
    const userPagination = userData?.pagination ?? { total: 0 };
    const enriched = users.map((el: any) => {
        const map = (el.tels as string[] || []).map((tel: string) => ({ tel, count: smsMap?.get(tel) || 0 }))
        const count = map.reduce((p: number, c: any) => p + c.count, 0)
        return { user: el.user, map, count }
    });
    const totalCount = enriched.reduce((p, c) => p + c.count, 0);
    const handleSearch = (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }));
        setQuery(prev => ({ ...prev, page: 1 }));
    };

    return (
        <Tabs items={[
            {
                key: 'log',
                label: '日志',
                children: (
                    <>
                        <Space style={{ marginBottom: 12 }}>
                            <Input
                                placeholder="输入手机号搜索"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                onPressEnter={() => setRefreshKey(k => k + 1)}
                                style={{ width: 180 }}
                                allowClear
                            />
                            <Button type="primary" onClick={() => setRefreshKey(k => k + 1)}>搜索</Button>
                        </Space>
                        <Log
                            key={refreshKey}
                            lastDay={15}
                            dataFun={logsmssends}
                            filterPhone={phone}
                            cPie={["tels"]}
                            columns={[
                            {
                                dataIndex: 'tels',
                                title: 'tels',
                                ...getColumnSearchProp('tels')
                            },
                            {
                                dataIndex: 'sendParams',
                                title: 'sendParams',
                                render: val => parse(val.TemplateParam, ['remind', 'code'])
                            },
                            {
                                key: 'result',
                                title: 'result',
                                render: (_, sms: Uart.logSmsSend) => sms?.Success?.Message || sms?.Error?.message || 'null'
                            }
                        ]}
                        expandable={{
                            expandedRowRender: (li: Uart.logSmsSend) =>
                                <Card>
                                    <DesList title="sendParams" data={li.sendParams} />
                                    <DesList title="Success" data={li.Success} />
                                    <DesList title="Error" data={li.Error} />
                                </Card>
                        }}
                    />
                    </>
                ),
            },
            {
                key: 'count',
                label: '短信消耗排布',
                children: (
                    <>
                        {/* 顶部 Stat 汇总 */}
                        <PageSummary
                            items={[
                                { label: '用户总数', value: userPagination.total, color: '#1890ff' },
                                { label: '当前页合计', value: totalCount, color: '#fa8c16' },
                                {
                                    label: '提示',
                                    value: '—',
                                    color: '#faad14',
                                    extra: '每用户合计基于当前页用户计算。如需全网精确统计，请走日志页筛选。',
                                },
                            ]}
                        />
                        <Table
                            dataSource={generateTableKey(enriched, "user")}
                            loading={loading}
                            pagination={{
                                current: query.page ?? 1,
                                pageSize: query.pageSize ?? 20,
                                total: userPagination.total,
                                showTotal: t => `共 ${t} 个用户`,
                                showSizeChanger: true,
                            }}
                            onChange={(pag) => {
                                setQuery(prev => ({
                                    ...prev,
                                    page: pag.current ?? prev.page ?? 1,
                                    pageSize: pag.pageSize ?? prev.pageSize ?? 20,
                                }));
                            }}
                            columns={[
                                {
                                    dataIndex: 'user',
                                    title: '用户',
                                    ...makeServerSearchProp('user', handleSearch) as any
                                },
                                {
                                    dataIndex: "count",
                                    title: '合计',
                                    defaultSortOrder: 'descend',
                                    sorter: (a: any, b: any) => a.count - b.count
                                }
                            ]}

                            expandable={{
                                expandedRowRender: (re: any) => {
                                    return <Card>
                                        <Divider plain>用户信息</Divider>
                                        <UserDes user={re.user}></UserDes>
                                        <Divider plain>使用情况</Divider>
                                        <Table dataSource={generateTableKey(re.map, "tel")}
                                            columns={[
                                                {
                                                    dataIndex: 'tel',
                                                    title: '告警手机'
                                                },
                                                {
                                                    dataIndex: 'count',
                                                    title: "count",
                                                    defaultSortOrder: 'descend',
                                                    sorter: (a: any, b: any) => a.count - b.count
                                                }
                                            ]}
                                        ></Table>
                                    </Card>
                                }
                            }}
                        ></Table>
                    </>
                ),
            },
        ]} />
    )
}

export default LogSms
