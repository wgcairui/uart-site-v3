'use client'
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePromise } from "@/lib/hooks/usePromise";
import { BindDev, getUser, simulateLogin } from "@/lib/api/fetchRoot"
import { Spin, Tabs, Button, message } from "antd";
import { LoginOutlined, PlusOutlined } from "@ant-design/icons";
import { UserAlarmPage } from "@/components/UserAlarmPage";
import { UserDes } from "@/components/UserDes";
import { UserLog } from "@/components/UserLog";
import { TerminalsTable } from "@/components/TerminalsTable";
import { TerminalInfo } from "@/components/TerminalInfo";
import { TerminalMountDevs } from "@/components/TerminalMountDevs";
import { AddUserTerminalModal } from "@/components/AddUserTerminalModal";
import { getTerminal } from "@/lib/api/fetch";
import { TerminalAT } from "@/components/TerminalAT";
import { TerminalOprate } from "@/components/TerminalOprate";
import { TerminalRunLog } from "@/components/TerminalRunLog";
import { TerminalDevPage } from "@/components/TerminalDevPage";
import { useTerminalUpdate } from "@/lib/hooks/useTerminalData";
import { DevRealTimeLog } from "@/components/devRealTimeLog";
import { SmsStatsChart } from "@/components/SmsStatsChart";
import { MailStatsChart } from "@/components/MailStatsChart";
import { LoginLogTab } from "@/components/LoginLogTab";
import { RequestLogTab } from "@/components/RequestLogTab";

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
    const user = params.user as string;

    const [activeKey, setActiveKey] = useState<string>('info');
    const [addModalOpen, setAddModalOpen] = useState(false);

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
            : !data ? <div style={{ textAlign: 'center', padding: 50 }}>找不到该用户的数据</div>
            :
            <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>{data.user}/{data.name}</h2>
                    <Button
                        type="primary"
                        icon={<LoginOutlined />}
                        onClick={async () => {
                            const { code, data: tokenData, message: msg } = await simulateLogin(user)
                            if (code === 200) {
                                // 跳转到中间页面，由中间页面设置 token 后再跳转
                                window.open(`/simulate-login?token=${encodeURIComponent(tokenData.token)}`, '_blank')
                            } else {
                                message.error(msg || '模拟登录失败')
                            }
                        }}
                    >
                        模拟登录
                    </Button>
                </div>
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
                    { key: 'log', label: '日志', children: <UserLog user={data.user} /> },
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
            </>
    )
}

export default UserInfo
