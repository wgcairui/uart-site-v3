'use client'
import React, { useState } from "react";
import { deleteUser, getUser, sendUserSocketInfo, users as getUsers, getUserStats } from "@/lib/api/fetchRoot"
import { Avatar, Button, Col, Divider, message, Modal, Row, Table, Tag, Descriptions, Space } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { MigrateUserResourcesModal } from "@/components/admin/MigrateUserResourcesModal";
import {
	generateTableKey,
	makeServerSearchProp,
	makeServerFilterProp,
	extractServerTableQuery,
} from '@/lib/utils/tableCommon'
import { ColumnsType } from "antd/lib/table";
import { prompt } from "@/lib/utils/prompt";
import { usePromise } from "@/lib/hooks/usePromise";
import { MyCopy } from "@/components/common/MyCopy";
import { UserStat } from "@/components/data/UserStat";
import { useNav } from "@/lib/hooks/useNav";
import { PaginationReq } from "@/types";

export const User: React.FC = () => {
    const nav = useNav()

    const [query, setQuery] = useState<PaginationReq>({
        page: 1,
        pageSize: 20,
        needTotal: true,
    });

    const [searchFields, setSearchFields] = useState<Record<string, string>>({});
    const [migrateOpen, setMigrateOpen] = useState(false);
    const [migrateFrom, setMigrateFrom] = useState<string | undefined>(undefined);

    // Merged query for API: page/sort params + search keywords
    const apiQuery: PaginationReq = { ...query, search: searchFields };

    const { data: userData, loading, fecth } = usePromise(async () => {
        const { data } = await getUsers(apiQuery)
        return data as any
    }, { items: [], pagination: {} }, [JSON.stringify(apiQuery)])

    const users = userData?.items ?? [];
    const pagination = userData?.pagination ?? {};

    const { data: userStats } = usePromise(async () => {
        const { data } = await getUserStats()
        return data || []
    }, [])

    /**
     * 更新单个用户信息
     */
    const updateUser = async (user: string) => {
        getUser(user).then(el => {
            fecth()
        })
    }

    /**
     * 给在线用户发送消息
     */
    const sendUserInfo = (user: string) => {
        prompt({
            title: `给[${user}]发送消息`,
            onOk(val) {
                if (val) {
                    sendUserSocketInfo(user, val)
                }
            }
        })
    }

    /**
     * 删除用户
     */
    const deletUser = async (user: Uart.UserInfo) => {
        const p = await prompt({ title: '删除用户' + user.name, placeholder: '输入独立校验密码' })
        if (p) {
            deleteUser(user.user, p).then((el) => {
                if (el.code) {
                    fecth()
                    message.success("删除成功");
                } else Modal.info({ content: "删除失败" });
            })
        } else {
            message.error('取消操作')
        }
    }

    const handleSearch = (field: string) => (kv: Record<string, string>) => {
        setSearchFields(prev => ({ ...prev, ...kv }));
        setQuery(prev => ({ ...prev, page: 1 }));
    }

    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <Divider plain>用户信息 / {pagination.total ?? users.length}</Divider>

            <Row gutter={36}>
                <Col span={12} key="types">
                    <Descriptions title="用户分类" bordered column={1} size="small">
                        {userStats.map((item: any) => (
                            <Descriptions.Item key={item.type} label={item.type}>
                                {item.value}
                            </Descriptions.Item>
                        ))}
                    </Descriptions>
                </Col>
            </Row>

            <Table className="v3-table"                 loading={loading}
                dataSource={generateTableKey(users, 'user')}
                scroll={{ x: 1000 }}
                pagination={{
                    current: query.page || 1,
                    pageSize: query.pageSize || 20,
                    total: pagination.total,
                    showTotal: (total) => `共 ${total} 条`,
                    showSizeChanger: true,
                }}
                onChange={(pag, filters, sorter) => {
                    const sq = extractServerTableQuery(pag, filters, sorter);
                    setQuery(prev => ({
                        ...prev,
                        page: sq.page || 1,
                        pageSize: sq.pageSize || 20,
                        sortBy: sq.sortBy || "",
                        sortOrder: sq.sortOrder || "desc",
                        filters: sq.filters || {},
                    }));
                }}
                columns={[
                    {
                        key: 'online',
                        title: '状态',
                        width: 40,
                        render: (_, re) => <UserStat user={re.user} />
                    },
                    {
                        dataIndex: 'avanter',
                        title: '头像',
                        width: 40,
                        render: (img?: string) => <Avatar src={img || undefined} alt="i"></Avatar>
                    },
                    {
                        dataIndex: 'user',
                        title: '用户',
                        width: 150,
                        ellipsis: true,
                        sorter: true,
                        ...makeServerSearchProp<Uart.UserInfo>('user', handleSearch('user')),
                        render: val => <MyCopy value={val} />
                    },
                    {
                        dataIndex: 'name',
                        title: '昵称',
                        width: 120,
                        ellipsis: true,
                        ...makeServerSearchProp<Uart.UserInfo>('name', handleSearch('name')),
                        render: val => <MyCopy value={val} />
                    },
                    {
                        dataIndex: 'tel',
                        title: '手机',
                        width: 120,
                        ellipsis: true,
                        ...makeServerSearchProp<Uart.UserInfo>('tel', handleSearch('tel')),
                        render: val => <MyCopy value={val} />
                    },
                    {
                        dataIndex: 'mail',
                        title: '邮箱',
                        width: 120,
                        ellipsis: true,
                        ...makeServerSearchProp<Uart.UserInfo>('mail', handleSearch('mail')),
                        render: val => <MyCopy value={val} />
                    },
                    {
                        dataIndex: 'rgtype',
                        title: '注册类型',
                        width: 70,
                        ...makeServerFilterProp<Uart.UserInfo>('rgtype', ['pesiv', 'wx', 'web']),
                        render: (val) => <Tag>{val}</Tag>
                    },
                    {
                        dataIndex: 'userGroup',
                        title: '用户组',
                        width: 50,
                        sorter: true,
                        ...makeServerFilterProp<Uart.UserInfo>('userGroup',
                            (userStats as any[]).map((s: any) => s.label || s.type).filter(Boolean)
                        ),
                        render: (val) => <Tag>{val}</Tag>
                    },
                    {
                        key: 'gz',
                        title: 'wx状态',
                        width: 60,
                        render: (_, user) => <>
                            {user.wxId && <Tag color="blue">公众号</Tag>}
                            {user.wpId && <Tag color="cyan">小程序</Tag>}
                        </>
                    },
                    {
                        title: '操作',
                        key: 'oprate',
                        width: 140,
                        render: (_, user) => <Space size={4} wrap>
                            <Button type="link" onClick={() => nav(`/admin/node/user/info/${encodeURIComponent(user.user)}`)}>查看</Button>
                            <Button type="link" onClick={() => updateUser(user.user)}>更新</Button>
                            {user.userGroup !== 'root' && <>
                                <Button type="link" icon={<SwapOutlined />} onClick={() => {
                                    setMigrateFrom(user.user)
                                    setMigrateOpen(true)
                                }}>迁移</Button>
                                <Button type="link" onClick={() => deletUser(user)}>删除</Button>
                            </>}
                            <Button type="link" onClick={() => sendUserInfo(user.user)}>发送实时消息</Button>
                        </Space>
                    }
                ] as ColumnsType<Uart.UserInfo>}
            />
            <MigrateUserResourcesModal
                visible={migrateOpen}
                {...(migrateFrom ? { fromUser: migrateFrom } : {})}
                onCancel={() => {
                    setMigrateOpen(false)
                    setMigrateFrom(undefined)
                }}
                onSuccess={() => {
                    fecth()
                }}
            />
        </div>
    )
}

export default User
