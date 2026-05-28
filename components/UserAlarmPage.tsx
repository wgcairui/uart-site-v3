'use client'
import { SyncOutlined } from "@ant-design/icons";
import { Button, Collapse, Descriptions, Empty, message, Space, Spin, Tabs } from "antd";
import React from "react";
import { getUserAlarmSetup, initUserAlarmSetup } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { ProtocolAlarmStatUser } from "./ProtocolAlarmStatUser";
import { ProtocolShowTagUser } from "./ProtocolShowTagUser";
import { ProtocolThresholdUser } from "./ProtocolThresholdUser";
import { EditableContact } from "./UserDes";

/**
 * @returns
 */
export const UserAlarmPage: React.FC<{ user: string }> = ({ user }) => {

    const { data, loading, fecth } = usePromise(async () => {
        const { data } = await getUserAlarmSetup(user)
        return data
    }, undefined)

    /**
     * 初始化配置
     */
    const initSetup = async () => {
        const load = message.loading('loading')
        await initUserAlarmSetup(user)
        fecth()
        load()
    }

    return (
        loading ? <Spin />
            : (
                !data
                    ? (
                        <Empty description="该用户尚未初始化告警配置">
                            <Button type="primary" onClick={() => initSetup()} icon={<SyncOutlined />}>
                                初始化告警配置
                            </Button>
                        </Empty>
                    )
                    : (
                        <>
                            <Space style={{ marginBottom: 16 }}>
                                <Button type="primary" size="small" onClick={() => fecth()} icon={<SyncOutlined />}>更新信息</Button>
                                <Button danger size="small" onClick={() => initSetup()} icon={<SyncOutlined />}>重新初始化</Button>
                            </Space>
                            <Descriptions>
                                <Descriptions.Item label="手机号">
                                    {data.tels && <EditableContact user={user} type="tels" values={data.tels} onUpdate={fecth} />}
                                </Descriptions.Item>
                                <Descriptions.Item label="邮箱">
                                    {data.mails && <EditableContact user={user} type="mails" values={data.mails} onUpdate={fecth} />}
                                </Descriptions.Item>
                                <Descriptions.Item label="微信">
                                    {data.wxs && <EditableContact user={user} type="wxs" values={data.wxs} onUpdate={fecth} />}
                                </Descriptions.Item>
                            </Descriptions>

                            {
                                data.ProtocolSetup &&
                                <Collapse
                                    accordion
                                    ghost
                                    items={data.ProtocolSetup.map((el: any) => ({
                                        key: el.Protocol,
                                        label: el.Protocol,
                                        children: (
                                            <Tabs items={[
                                                {
                                                    key: 'show',
                                                    label: '显示参数',
                                                    children: <ProtocolShowTagUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                },
                                                {
                                                    key: 'Threld',
                                                    label: '阈值配置',
                                                    children: <ProtocolThresholdUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                },
                                                {
                                                    key: 'stat',
                                                    label: '状态配置',
                                                    children: <ProtocolAlarmStatUser protocolName={el.Protocol} user={user} isAdmin={true} />,
                                                },
                                            ]} />
                                        ),
                                    }))}
                                />
                            }
                        </>
                    )
            )

    )
}



/**
 * 展示用户日志信息
 * @param param0
 */
