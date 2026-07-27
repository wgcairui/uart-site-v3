'use client'

import React, { Suspense, useMemo, useState } from "react";
import './user.css'
import { Col, Row, Tabs, Space, Tooltip, Popconfirm, message, Dropdown } from 'antd'
import { Button } from '@/components/common/Button'
import { useUserStore } from "@/lib/store/userStore";
import { devTypeIcon, IconFont } from "@/components/common/IconFont";
import { EyeFilled, EditFilled, DeleteFilled, DownOutlined } from "@ant-design/icons";
import { DevCard } from "@/components/data/devCard";
import { PageSummary } from "@/components/common/PageSummary";
import { PageHeader } from "@/components/common/PageHeader";
import { StaggerList } from "@/components/common/StaggerList";
import { StatusTag } from '@/components/common/StatusTag'
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { prompt } from "@/lib/utils/prompt";
import { delUserTerminal, modifyTerminal } from "@/lib/api/fetch";
import { useNav } from "@/lib/hooks/useNav";
import { devDTU, devType } from "@/lib/utils/devImgSource";

type key = "dev" | "module" | "agg"
const UserIndex: React.FC = (props) => {

    const router = useRouter()
    const seachParms = useSearchParams()

    const nav = useNav()

    const terminals = useUserStore(s => s.terminals)

    const [defalutKey, setDefalutKey] = useState<key>(() => seachParms.get('tab') as key || 'dev')

    const mountDevs = useMemo(() => {
        return terminals ? terminals.map(({ DevMac, name, online, mountDevs }) => mountDevs.map(el2 => ({ ...el2, mac: DevMac, macName: name, macOn: online }))).flat() : []
    }, [terminals])

    /**
     * 重命名设备
     * @param ter
     */
    const renameTerminal = (ter: Uart.Terminal) => {
        prompt({
            title: `修改设备${ter.DevMac}名称`,
            value: ter.name
        }).then(el => {
            const key = ter.DevMac
            message.loading({ content: "正在修改", key })
            modifyTerminal(ter.DevMac, el!).then(result => {
                if (result.code === 200) {
                    message.success({ content: '修改成功', key })
                } else {
                    message.warning({ content: "修改失败" + result.message, key })
                }
            })
        }).catch(() => {
            message.error("取消修改")
        })
    }

    /**
     * 删除设备
     * @param ter
     */
    const delTermianl = (ter: Uart.Terminal) => {
        const key = ter.DevMac
        message.loading({ content: "正在删除", key })
        delUserTerminal(ter.DevMac).then(result => {
            if (result.code === 200) {
                message.success({ content: '删除成功', key })
            } else {
                message.warning({ content: "删除失败:" + result.message, key })
            }
        })

    }

    /**
     * 切换tab
     * @param key
     */
    const switchTab = (key: key) => {
        setDefalutKey(key)
        router.push(`?tab=${key}`)
    }

    return (
        <div className="bg-cr-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader theme="control-room" title="我的设备" subtitle="查看所有绑定设备、网关、聚合设备" />
            <PageSummary
                theme="control-room"
                column={2}
                items={[
                    { label: '网关总数', value: terminals.length, variant: 'primary' },
                    {
                        label: '在线',
                        value: terminals.filter(t => t.online).length,
                        variant: 'success',
                    },
                    {
                        label: '离线',
                        value: terminals.filter(t => !t.online).length,
                        variant: 'warning',
                    },
                    { label: '挂载设备', value: mountDevs.length, variant: 'info' },
                ]}
            />
            <Tabs className="v3-tabs-cr" activeKey={defalutKey} onTabClick={(key: any) => switchTab(key)} items={[
                {
                    key: 'dev',
                    label: <span><IconFont type="icon-shebeizhuangtai" /> 我的设备</span>,
                    children: (
                        <Row>
                            <StaggerList>
                            {
                                mountDevs.map(el => {
                                    return (
                                        // 2026-07-25: user 端 mobile-first 锁 375, device 卡永远 1 列 (避免 lg/xl/xxl 触发 3-4 列在容器内挤)
                                        <Col span={24} key={el.mac + el.pid}>
                                            <DevCard
                                                theme="control-room"
                                                img={devType[el.Type]}
                                                title={<Space>
                                                    <StatusTag theme="control-room" variant={el.online ? 'online' : 'warning'} size="sm" />
                                                    {el.mountDev}
                                                </Space>}
                                                avatar={devTypeIcon[el.Type]}
                                                subtitle={el.macName + '-' + el.pid}
                                                onClick={() => nav("/main/dev/" + el.mac + el.pid)}
                                            ></DevCard>
                                        </Col>

                                    )
                                })
                            }
                            </StaggerList>
                            <Col span={24} key='addDev' className="center">
                                {/* <Button shape="round" variant="primary" onClick={() => setDefalutKey("module")}>添加设备</Button> */}
                                <Dropdown menu={{
                                    items: [
                                        { key: "1", label: <Link href="/main/addterminal">透传网关/百事服卡</Link> },
                                        { key: "2", label: <Link href="/main?tab=module" onClick={() => setDefalutKey("module")}>设备</Link> }
                                    ]
                                }}>
                                    <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
                                        添加设备<DownOutlined />
                                    </a>
                                </Dropdown>
                            </Col>
                        </Row>
                    ),
                },
                {
                    key: 'module',
                    label: <span><IconFont type="icon-jichuguanli" /> 我的网关</span>,
                    children: (
                        <Row>
                            {
                                terminals.map(el => {
                                    return (
                                        // 2026-07-25: user 端 mobile-first 锁 375, 网关卡永远 1 列
                                        <Col span={24} key={el.DevMac}>
                                            <DevCard
                                                theme="control-room"
                                                img={devDTU[el.PID || 'null']}
                                                title={<Space>
                                                    <StatusTag theme="control-room" variant={el.online ? 'online' : 'warning'} size="sm" />
                                                    {el.name}
                                                </Space>}
                                                subtitle={dayjs(el.uptime).format("YY/M/D H:m:s")}
                                                actions={[
                                                    <Tooltip key="eye" title="编辑查看">
                                                        {/* 2026-07-25: 改 --cr-status-online + 加 role/tabIndex/aria-label 满足 a11y */}
                                                        <EyeFilled
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-label={`查看 ${el.name}`}
                                                            style={{ color: 'var(--cr-status-online)', cursor: 'pointer' }}
                                                            onClick={() => nav("/main/terminal/" + el.DevMac)}
                                                        />
                                                    </Tooltip>,
                                                    <Tooltip key="edit" title="重命名">
                                                        <EditFilled
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-label={`重命名 ${el.name}`}
                                                            style={{ color: 'var(--cr-accent)', cursor: 'pointer' }}
                                                            onClick={() => renameTerminal(el)}
                                                        />
                                                    </Tooltip>,
                                                    <Tooltip key="delete" title="删除" >
                                                        <Popconfirm
                                                            title={`确认删除设备[${el.name}]?`}
                                                            onConfirm={() => delTermianl(el)}
                                                            onCancel={() => message.info('cancel')}
                                                        >
                                                            {/* 2026-07-25: 改 --cr-status-warning + a11y */}
                                                            <DeleteFilled
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-label={`删除 ${el.name}`}
                                                                style={{ color: 'var(--cr-status-warning)', cursor: 'pointer' }}
                                                            />
                                                        </Popconfirm>
                                                    </Tooltip>
                                                ]}
                                            ></DevCard>
                                        </Col>

                                    )
                                })
                            }
                            <Col span={24} key="addModule" className="center">
                                <Button theme="control-room" shape="round" variant="primary" size="large" href="/main/addterminal">添加网关</Button>
                            </Col>
                        </Row>
                    ),
                },
                {
                    key: 'agg',
                    label: <span><IconFont type="icon-changjingguanli" />聚合设备</span>,
                    children: <Row></Row>,
                },
            ]} />
        </div>
    )
}

export default function Page(props: any) {
    return (
        <Suspense>
            <UserIndex {...props} />
        </Suspense>
    )
}
