'use client'
import {
    ApiOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DatabaseOutlined,
    DesktopOutlined,
    TeamOutlined,
    UserOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { Badge, Button, Card, Col, Descriptions, Divider, Row, Space, Spin, Statistic, Table, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
    getAlarmStats,
    getDataStats,
    getProtocolDetailedStats,
    getTerminalDetailedStats,
    getUserDetailedStats,
    NodeInfo,
    runInfo as runInfoType,
    runingState,
} from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";

const ob: Record<string, string> = {
    'all': '全部',
    'online': '在线'
};

const StatCard: React.FC<{
    title: string;
    value: string | number;
    suffix?: string;
    icon?: React.ReactNode;
    color?: string;
    extra?: React.ReactNode;
    onClick?: () => void;
}> = ({ title, value, suffix, icon, color = "#1890ff", extra, onClick }) => (
    <Card
        size="small"
        style={{ borderTop: `3px solid ${color}`, height: "100%", cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
        hoverable={!!onClick}
    >
        <Statistic
            title={
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {icon && <span style={{ color }}>{icon}</span>}
                    {title}
                </span>
            }
            value={value}
            suffix={suffix}
            styles={{ content: { color, fontWeight: 600 } }}
        />
        {extra}
    </Card>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <Divider titlePlacement="left" style={{ fontSize: 15, fontWeight: 600 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {icon}
            {title}
        </span>
    </Divider>
);

const RootIndex: React.FC = () => {
    const router = useRouter();
    const [nodeInfo, setNodeInfo] = useState<Uart.nodeInfo[]>([]);
    const [runInfo, setRunInfo] = useState<runInfoType>();

    const getRunInfo = async () => {
        runingState().then((el) => setRunInfo(el?.data));
        NodeInfo().then((el) => setNodeInfo((el?.data as any)?.items || el?.data || []));
    };

    useEffect(() => {
        getRunInfo();
        const i = setInterval(() => {
            getRunInfo();
        }, 30000);
        return () => clearInterval(i!);
    }, []);

    const parseRunInfo = useMemo(() => {
        if (runInfo) {
            const data = runInfo as any;
            return {
                user: Object.entries(data.User || {}).map(([type, value]) => ({ type: ob[type] + '用户', value: Number(value) || 0 })),
                node: Object.entries(data.Node || {}).map(([type, value]) => ({ type: ob[type] + '节点', value: Number(value) || 0 })),
                ter: Object.entries(data.Terminal || {}).map(([type, value]) => ({ type: ob[type] + '终端', value: Number(value) || 0 })),
                sys: data.SysInfo || {},
                protocol: data.Protocol || 0,
                events: data.events || 0,
                timeOut: data.TimeOutMountDev || data.TimeOutMonutDev || 0,
                nodes: data.Node?.all || 0,
                terminals: data.Terminal?.all || 0,
                users: data.User?.all || 0
            };
        }
    }, [runInfo]);

    // Dashboard Hooks
    const { data: userStats, loading: userLoading } = usePromise(async () => {
        const { data } = await getUserDetailedStats();
        return data;
    }, null);

    const { data: terminalStats, loading: termLoading } = usePromise(async () => {
        const { data } = await getTerminalDetailedStats();
        return data;
    }, null);

    const { data: alarmStats, loading: alarmLoading } = usePromise(async () => {
        const { data } = await getAlarmStats();
        return data;
    }, null);

    const { data: protocolStats, loading: protLoading } = usePromise(async () => {
        const { data } = await getProtocolDetailedStats();
        return data;
    }, null);

    const { data: dataStats, loading: dataLoading } = usePromise(async () => {
        const { data } = await getDataStats();
        return data;
    }, null);


    const renderSystemStats = () => {
        if (!parseRunInfo) return <Spin />;

        return (
            <section style={{ marginBottom: 24 }}>
                <SectionTitle icon={<DesktopOutlined />} title="Server / 主服务运行状态" />
                <Descriptions column={6} size="small" bordered style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="节点数">{parseRunInfo.nodes}</Descriptions.Item>
                    <Descriptions.Item label="系统版本">{parseRunInfo.sys?.version || '-'}</Descriptions.Item>
                    <Descriptions.Item label="总内存">{parseRunInfo.sys?.totalmem || '-'}</Descriptions.Item>
                    <Descriptions.Item label="使用内存">{Number(parseRunInfo.sys?.usemen || 0).toFixed(2)}%</Descriptions.Item>
                    <Descriptions.Item label="使用cpu">{Number(parseRunInfo.sys?.usecpu || 0).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="loadavg">{parseRunInfo.sys?.loadavg?.join(" | ") || '-'}</Descriptions.Item>
                </Descriptions>
                <Row gutter={24}>
                    <Col span={24}>
                        <Table size="small" dataSource={nodeInfo.map(el => ({ ...el, key: (el as any)._id }))} pagination={false}>
                            <Table.Column dataIndex="NodeName" title="节点名称"></Table.Column>
                            <Table.Column dataIndex="totalmem" title="总内存"></Table.Column>
                            <Table.Column dataIndex="freemem" title="空闲内存"></Table.Column>
                            <Table.Column dataIndex="loadavg" title="loadavg" render={(val: number[]) => val?.join(' | ')}></Table.Column>
                            <Table.Column dataIndex="uptime" title="运行时间"></Table.Column>
                            <Table.Column dataIndex="Connections" title="连接数"></Table.Column>
                            <Table.Column dataIndex="updateTime" title="更新时间" render={val => dayjs(val).format("YY-M-D H:m:s")}></Table.Column>
                            <Table.Column title="操作" key="oprate" render={() =>
                                <Button type="primary" size="small" onClick={() => { }}>修改</Button>
                            }></Table.Column>
                        </Table>
                    </Col>
                </Row>
            </section>
        );
    };

    const renderDashboard = () => (
        <div style={{ padding: "0 8px" }}>
            {renderSystemStats()}

            {/* ─── 用户指标 ─── */}
            <SectionTitle icon={<UserOutlined />} title="用户概览" />
            {userLoading ? (
                <Spin />
            ) : userStats ? (
                <>
                    <Row gutter={[16, 16]}>
                        <Col span={12} md={6}>
                            <StatCard
                                title="总用户数"
                                value={userStats.total}
                                icon={<TeamOutlined />}
                                color="#1890ff"
                                onClick={() => router.push("/admin/node/user")}
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="7天活跃用户"
                                value={userStats.activeUsers?.last7Days ?? "-"}
                                icon={<UserOutlined />}
                                color="#52c41a"
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="30天活跃用户"
                                value={userStats.activeUsers?.last30Days ?? "-"}
                                icon={<UserOutlined />}
                                color="#13c2c2"
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="用户组数量"
                                value={userStats.userGroup?.length ?? 0}
                                icon={<AppstoreOutlined />}
                                color="#722ed1"
                            />
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={24} md={12}>
                            <Card size="small" title="注册方式分布">
                                <Descriptions column={2} size="small" bordered>
                                    {(userStats.rgType || []).map((item: any) => (
                                        <Descriptions.Item label={item.label} key={item.label}>
                                            <span style={{ fontWeight: 600 }}>{item.value}</span>
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </Card>
                        </Col>
                        <Col span={24} md={12}>
                            <Card size="small" title="用户组分布">
                                <Descriptions column={2} size="small" bordered>
                                    {(userStats.userGroup || []).map((item: any) => (
                                        <Descriptions.Item label={item.label || "默认"} key={item.label}>
                                            <span style={{ fontWeight: 600 }}>{item.value}</span>
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}

            {/* ─── 终端指标 ─── */}
            <SectionTitle icon={<DesktopOutlined />} title="终端概览" />
            {termLoading ? (
                <Spin />
            ) : terminalStats ? (
                <>
                    <Row gutter={[16, 16]}>
                        <Col span={12} md={4}>
                            <StatCard
                                title="总终端数"
                                value={terminalStats.total}
                                icon={<DesktopOutlined />}
                                color="#1890ff"
                                onClick={() => router.push("/admin/node/terminal")}
                            />
                        </Col>
                        <Col span={12} md={4}>
                            <StatCard
                                title="在线终端"
                                value={terminalStats.online}
                                icon={<CheckCircleOutlined />}
                                color="#52c41a"
                            />
                        </Col>
                        <Col span={12} md={4}>
                            <StatCard
                                title="离线终端"
                                value={terminalStats.offline}
                                icon={<ClockCircleOutlined />}
                                color="#ff4d4f"
                            />
                        </Col>
                        <Col span={12} md={4}>
                            <StatCard
                                title="在线率"
                                value={terminalStats.onlineRate}
                                suffix="%"
                                color={terminalStats.onlineRate >= 80 ? "#52c41a" : "#fa8c16"}
                            />
                        </Col>
                        <Col span={12} md={4}>
                            <StatCard
                                title="超时设备数"
                                value={terminalStats.timeoutMountDev}
                                icon={<WarningOutlined />}
                                color="#ff4d4f"
                            />
                        </Col>
                        <Col span={12} md={4}>
                            <StatCard
                                title="共享终端"
                                value={terminalStats.shared}
                                icon={<ApiOutlined />}
                                color="#722ed1"
                            />
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={24} md={12}>
                            <Card size="small" title="设备挂载情况">
                                <Descriptions column={2} size="small" bordered>
                                    <Descriptions.Item label="总挂载设备数">
                                        {terminalStats.totalMountDevs}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="平均挂载设备/终端">
                                        {terminalStats.avgMountDevs}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </Col>
                        <Col span={24} md={12}>
                            <Card size="small" title="PID 型号分布 Top10">
                                <Descriptions column={2} size="small" bordered>
                                    {(terminalStats.pidDistribution || []).map((item: any) => (
                                        <Descriptions.Item label={item.label} key={item.label}>
                                            {item.value}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}

            {/* ─── 告警指标 ─── */}
            <SectionTitle icon={<WarningOutlined />} title="告警概览" />
            {alarmLoading ? (
                <Spin />
            ) : alarmStats ? (
                <>
                    <Row gutter={[16, 16]}>
                        <Col span={12} md={6}>
                            <StatCard 
                                title="历史告警总数" 
                                value={alarmStats.total} 
                                color="#fa8c16" 
                                onClick={() => router.push("/admin/log/alarm")}
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="未处理告警"
                                value={alarmStats.unconfirmed}
                                icon={<WarningOutlined />}
                                color="#ff4d4f"
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="已确认告警"
                                value={alarmStats.confirmed}
                                icon={<CheckCircleOutlined />}
                                color="#52c41a"
                            />
                        </Col>
                        <Col span={12} md={6}>
                            <StatCard
                                title="处理率"
                                value={
                                    alarmStats.total
                                        ? Math.round((alarmStats.confirmed / alarmStats.total) * 1000) / 10
                                        : 0
                                }
                                suffix="%"
                                color="#13c2c2"
                            />
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={24} md={12}>
                            <Card size="small" title="告警最多的设备 Top10">
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={(alarmStats.topMacs || []).map((item: any, i: number) => ({ ...item, key: i }))}
                                    columns={[
                                        { title: "排名", render: (_: any, __: any, idx: number) => idx + 1, width: 60 },
                                        { title: "设备 MAC", dataIndex: "mac" },
                                        {
                                            title: "告警次数", dataIndex: "count",
                                            render: (v: number) => <Tag color="red">{v}</Tag>
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                        <Col span={24} md={12}>
                            <Card size="small" title="最近30天每日告警趋势">
                                <Table
                                    size="small"
                                    scroll={{ y: 220 }}
                                    pagination={false}
                                    dataSource={(alarmStats.dailyLast30Days || []).map((item: any, i: number) => ({ ...item, key: i }))}
                                    columns={[
                                        { title: "日期", dataIndex: "date" },
                                        {
                                            title: "告警数", dataIndex: "count",
                                            render: (v: number) => (
                                                <Badge
                                                    count={v}
                                                    style={{ backgroundColor: v > 10 ? "#ff4d4f" : "#52c41a" }}
                                                    overflowCount={9999}
                                                />
                                            )
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}

            {/* ─── 协议指标 ─── */}
            <SectionTitle icon={<ApiOutlined />} title="协议概览" />
            {protLoading ? (
                <Spin />
            ) : protocolStats ? (
                <>
                    <Row gutter={[16, 16]}>
                        <Col span={12} md={8}>
                            <StatCard 
                                title="协议总数" 
                                value={protocolStats.total} 
                                icon={<ApiOutlined />} 
                                color="#1890ff" 
                                onClick={() => router.push("/admin/node/protocols")}
                            />
                        </Col>
                        <Col span={24} md={16}>
                            <Card size="small" title="通信类型分布">
                                <Descriptions column={4} size="small" bordered>
                                    {(protocolStats.commType || []).map((item: any) => (
                                        <Descriptions.Item label={`${item.label} 型`} key={item.label}>
                                            {item.value}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </Card>
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={24} md={12}>
                            <Card size="small" title="设备类型分布">
                                <Descriptions column={2} size="small" bordered>
                                    {(protocolStats.typeDistribution || []).map((item: any) => (
                                        <Descriptions.Item label={item.label} key={item.label}>
                                            {item.value}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </Card>
                        </Col>
                        <Col span={24} md={12}>
                            <Card size="small" title="指令最多的协议 Top10">
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={(protocolStats.top10ByInstructCount || []).map((item: any, i: number) => ({ ...item, key: i }))}
                                    columns={[
                                        { title: "协议名", dataIndex: "protocol" },
                                        { title: "指令数", dataIndex: "instructCount", render: (v: number) => <Tag color="blue">{v}</Tag> },
                                    ]}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}

            {/* ─── 数据指标 ─── */}
            <SectionTitle icon={<DatabaseOutlined />} title="数据概览" />
            {dataLoading ? (
                <Spin />
            ) : dataStats ? (
                <Row gutter={[16, 16]}>
                    <Col span={12} md={6}>
                        <StatCard
                            title="单例数据记录数"
                            value={dataStats.singleDataCount}
                            icon={<DatabaseOutlined />}
                            color="#1890ff"
                            
                        />
                    </Col>
                    <Col span={12} md={6}>
                        <StatCard
                            title="有数据的设备覆盖率"
                            value={dataStats.coverageRate}
                            suffix="%"
                            color={dataStats.coverageRate >= 70 ? "#52c41a" : "#fa8c16"}
                        />
                    </Col>
                    <Col span={24} md={12}>
                        <Card size="small" title="数据量最多的协议 Top10">
                            <Descriptions column={2} size="small" bordered>
                                {(dataStats.topProtocolsByData || []).map((item: any) => (
                                    <Descriptions.Item label={item.protocol} key={item.protocol}>
                                        {item.count}
                                    </Descriptions.Item>
                                ))}
                            </Descriptions>
                        </Card>
                    </Col>
                </Row>
            ) : null}
        </div>
    );

    return (
        <Tabs items={[
            { key: 'main', label: '系统仪表盘', children: renderDashboard() },
        ]} />
    );
};

export default RootIndex;
