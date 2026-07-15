'use client'
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePromise } from "@/lib/hooks/usePromise";
import { BindDev, getUser, simulateLogin } from "@/lib/api/fetchRoot"
import { Spin, Tabs, Button, message, Space } from "antd";
import { LoginOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { UserAlarmPage } from "@/components/data/UserAlarmPage";
import { UserDes } from "@/components/data/UserDes";
import { UserLog } from "@/components/log/UserLog";
import { TerminalsTable } from "@/components/terminal/TerminalsTable";
import { TerminalInfo } from "@/components/terminal/TerminalInfo";
import { TerminalMountDevs } from "@/components/terminal/TerminalMountDevs";
import { AddUserTerminalModal } from "@/components/common/AddUserTerminalModal";
import { MigrateUserResourcesModal } from "@/components/admin/MigrateUserResourcesModal";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalAT } from "@/components/terminal/TerminalAT";
import { TerminalOprate } from "@/components/terminal/TerminalOprate";
import { AdminScheduledOpTab } from "@/components/terminal/AdminScheduledOpTab";
import { TerminalRunLog } from "@/components/terminal/TerminalRunLog";
import { TerminalDevPage } from "@/components/terminal/TerminalDevPage";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/data/devRealTimeLog";
import { SmsStatsChart } from "@/components/chart/SmsStatsChart";
import { MailStatsChart } from "@/components/chart/MailStatsChart";
import { LoginLogTab } from "@/components/log/LoginLogTab";
import { RequestLogTab } from "@/components/log/RequestLogTab";
import { PageHeader } from "@/components/common/PageHeader";

interface TerminalInfosProps {
    mac: string;
}

const TerminalInfos: React.FC<TerminalInfosProps> = ({ mac }) => {
    const { data, loading, setData, fecth } = usePromise(async () => {
        const { data } = await getTerminal(mac);
        return data;
    });

    const ter = useTerminalUpdate([mac]);

    useEffect(() => {
        if (ter.data) {
            setData(ter.data);
        }
    }, [ter.data]);

    return loading ? (
        <Spin />
    ) : !data ? (
        <div style={{ textAlign: "center", padding: 50 }}>找不到该终端的数据</div>
    ) : (
        <>
            <h2>
                {data.DevMac}/{data.name}
            </h2>
            <Tabs items={[
                { key: 'info', label: '详细信息', children: <TerminalInfo terminal={data} ex={true} showTitle={false}></TerminalInfo> },
                { key: 'mountDevs', label: '挂载设备', children: <TerminalMountDevs terminal={data} ex={true} showTitle={false} InterValShow onChange={fecth}></TerminalMountDevs> },
                                                                { key: 'at', label: 'AT调试', children: <TerminalAT mac={data.DevMac} /> },
                { key: 'query', label: '指令调试', children: <TerminalOprate mac={data.DevMac} /> },
                { key: 'scheduled-op', label: '定时操作', children: <AdminScheduledOpTab mac={data.DevMac} /> },
                { key: 'listenMacLog', label: 'console', children: <DevRealTimeLog terminal={data} /> },
                { key: 'log', label: '日志', children: <TerminalRunLog mac={data.DevMac}></TerminalRunLog> },
                ...(data.mountDevs
                    ? data.mountDevs.map((dev) => ({
                        key: dev.mountDev + dev.pid,
                        label: dev.mountDev + dev.pid,
                        children: <TerminalDevPage mac={data.DevMac} pid={dev.pid}></TerminalDevPage>,
                    }))
                    : []),
            ]} />
        </>
    );
};

export const UserInfo: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const user = params.user as string;

    const [activeKey, setActiveKey] = useState<string>('info');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [migrateOpen, setMigrateOpen] = useState(false);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                setActiveKey(hash);
            }
        };
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const onTabChange = (key: string) => {
        setActiveKey(key);
        window.history.replaceState(null, '', `#${key}`);
    };

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getUser(user)
        return data
    }, undefined, [user])

    const bindUts = usePromise(async () => {
        const { data } = await BindDev(user)
        return (data?.UTs || []) as any as Uart.Terminal[]
    }, [], [user])

    /**
     * 成功绑定设备后刷新已绑定设备列表
     */
    const refreshBoundTerminals = () => {
        bindUts.fecth && bindUts.fecth();
        fecth();
    };

    return (
        loading ? <Spin />
            : !data ? <div className="bg-bento-canvas" style={{ padding: 80, textAlign: 'center', color: '#999' }}>找不到该用户的数据</div>
            :
            <>
                <PageHeader
                    title={`${data.user} (${data.name})`}
                    subtitle="查看用户详细信息、告警设置、挂载设备、操作日志等"
                    breadcrumb={[
                        { title: '首页', href: '/admin' },
                        { title: '用户', href: '/admin/node/user' },
                        { title: data.user },
                    ]}
                    back
                    onBack={() => router.push('/admin/node/user')}
                    extra={
                        <Space>
                            {data.userGroup !== 'root' && (
                                <Button icon={<SwapOutlined />} onClick={() => setMigrateOpen(true)}>
                                    资源迁移
                                </Button>
                            )}
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                onClick={async () => {
                                    const { code, data: tokenData, message: msg } = await simulateLogin(user)
                                    if (code === 200) {
                                        window.open(`/simulate-login?token=${encodeURIComponent(tokenData.token)}`, '_blank')
                                    } else {
                                        message.error(msg || '模拟登录失败')
                                    }
                                }}
                            >
                                模拟登录
                            </Button>
                        </Space>
                    }
                />
                <Tabs activeKey={activeKey} onChange={onTabChange} items={[
                    { key: 'info', label: '详细信息', children: <UserDes user={data}></UserDes> },
                    { key: 'alarm', label: '告警设置', children: <UserAlarmPage user={data.user}></UserAlarmPage> },
                    {
                        key: 'mountDev', label: '挂载设备', children: (
                            <>
                                <TerminalsTable
                                    user={data.user}
                                    extraActions={
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => setAddModalOpen(true)}
                                        >
                                            添加设备
                                        </Button>
                                    }
                                />
                                <AddUserTerminalModal
                                    visible={addModalOpen}
                                    user={data.user}
                                    onCancel={() => setAddModalOpen(false)}
                                    onSuccess={refreshBoundTerminals}
                                />
                            </>
                        )
                    },
                    { key: 'log', label: '操作日志', children: <UserLog user={data.user} /> },
                    { key: 'sms-stats', label: '短信消耗', children: <SmsStatsChart user={data.user} /> },
                    { key: 'mail-stats', label: '邮件消耗', children: <MailStatsChart user={data.user} /> },
                    { key: 'login-log', label: '登录日志', children: <LoginLogTab user={data.user} /> },
                    { key: 'request-log', label: '请求日志', children: <RequestLogTab user={data.user} /> },
                    ...bindUts.data.map(ter => ({
                        key: ter.DevMac,
                        label: ter.name,
                        children: <TerminalInfos mac={ter.DevMac} />,
                    })),
                ]} />
                <MigrateUserResourcesModal
                    visible={migrateOpen}
                    fromUser={data.user}
                    onCancel={() => setMigrateOpen(false)}
                    onSuccess={() => {
                        // 迁移成功后刷新详情 (因为 toUser 也可能改了)
                        fecth()
                    }}
                />
            </>
    )
}

export default UserInfo
