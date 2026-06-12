'use client'
import { Card, Divider, Input, Table, Tabs, Space, Button } from "antd"
import { useState } from "react"
import { getUserAlarmSetups, logsmssends, logsmssendsCountInfo } from "@/lib/api/fetchRoot"
import { generateTableKey, getColumnSearchProp } from "@/lib/utils/tableCommon"
import { UserDes } from "@/components/data/UserDes"
import { usePromise } from "@/lib/hooks/usePromise"
import { Log } from "@/components/log/log";
import { DesList } from "@/components/data/DesList";

/**
 * smslog
 * @returns
 */
export const LogSms: React.FC = () => {
    const [phone, setPhone] = useState("")
    const [refreshKey, setRefreshKey] = useState(0)

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

    const { data, loading, err } = usePromise<any[]>(async () => {
        const smsRes = await logsmssendsCountInfo()
        const smsMap = new Map((smsRes.data as any[] || []).map((el: any) => [el._id, el.sum]))

        // 分页拉取所有用户（690条，pageSize=100需循环7次）
        const allItems: any[] = []
        let page = 1
        while (true) {
            const usersRes = await getUserAlarmSetups({ page, pageSize: 100 })
            const items = (usersRes.data as any)?.items || []
            allItems.push(...items)
            if (!usersRes.data?.pagination?.hasNext) break
            page++
        }

        const count = allItems.map((el: any) => {
            const map = (el.tels as string[] || []).map(tel => ({ tel, count: smsMap.get(tel) || 0 }))
            return { user: el.user, map, count: map.reduce((p: number, c: any) => p + c.count, 0) }
        })
        return count
    }, [])

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
                    <Table dataSource={generateTableKey(data, "user")} loading={loading} columns={[
                        {
                            dataIndex: 'user',
                            title: '用户',
                            ...getColumnSearchProp('user') as any
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
                ),
            },
        ]} />
    )
}

export default LogSms
