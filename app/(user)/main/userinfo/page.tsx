'use client'

import { PlusSquareFilled } from "@ant-design/icons";
import { Avatar, Col, Descriptions, Divider, Modal, Row, Tag, Image, Tooltip, message, Space, Form } from "antd"
import { confirm, success, info, error, warning } from '@/lib/utils/modal';
import { Button } from '@/components/common/Button'
import { StatusTag } from '@/components/common/StatusTag'
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { prompt } from "@/lib/utils/prompt";
import { RegexMail, RegexTel } from "@/lib/utils/util";
import { getUserAlarmSetup, modifyUserAlarmSetupTel, mpTicket, wpTicket } from "@/lib/api/fetch";
import { PageHeader } from "@/components/common/PageHeader";

/**
 * 显示用户信息
 * @param props
 * @returns
 */
const UserInfo: React.FC = props => {

    const user = useUserStore(s => s.user)

    const [tels, setTels] = useState<string[]>([])
    const [mails, setMails] = useState<string[]>([])

    useEffect(() => {
        getUserAlarmSetup().then(el => {
            // 防御：试用模式或鉴权失败时 data 可能 undefined
            setTels(el.data?.tels || [])
            setMails(el.data?.mails || [])
        })
    }, [])

    // 移动端 detection: < 768px Descriptions 改单列 + Form 表单 wrap
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 768px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    const showQR = async (type: 'wx' | 'wp') => {
        const loading = message.loading({ content: 'loading' })
        const { data } = type === 'wp' ? await wpTicket() : await mpTicket()
        loading()
        info({
            title: type === 'wp' ? '小程序二维码' : '公众号二维码',
            content: (
                <Image src={data || ''}></Image>
            )
        })
    }

    const delTel = (key: number) => {
        tels.splice(key, 1)
        setTels(tels)
    }

    const addTel = async () => {
        const data = await prompt({ title: '添加新的告警号码' })
        if (data && RegexTel(data)) {
            setTels([...new Set([...tels, data])])
        } else {
            message.error("号码格式错误")
        }
    }

    const delMail = (key: number) => {
        mails.splice(key, 1)
        setMails(mails)
    }

    const addMail = async () => {
        const data = await prompt({ title: '添加新的告警邮箱' })
        if (data && RegexMail(data)) {
            setMails([...new Set([...mails, data])])
        } else {
            message.error("邮箱格式错误")
        }
    }

    /**
     * 保存告警配置
     */
    const saveAlarm = () => {
        const key = 'sadsxdssaa'
        message.loading({ content: '保存配置', key })
        modifyUserAlarmSetupTel(tels, mails).then(el => {
            el.code ? message.success({ content: '保存成功', key }) : message.warning({ content: '保存失败' + el.message, key })
        })
    }


    return (
        <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
            <PageHeader
                title={user.name || user.user}
                breadcrumb={[{ title: '首页', href: '/main' }]}
            />
            <Row justify="center" align="middle">
                <Col xs={24} md={14} lg={12} style={{ padding: isMobile ? 4 : 12 }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Divider plain>用户信息</Divider>
                        <p>修改用户信息请使用小程序操作</p>
                        <Descriptions
                            title={user.user}
                            column={isMobile ? 1 : 2}
                            size={isMobile ? 'small' : 'default'}
                            {...(isMobile ? { labelStyle: { width: 90 } } : {})}
                        >
                            <Descriptions.Item label="账号" span={2}>
                                <Tooltip title="点击复制">
                                    <code
                                        className="userinfo-account-code"
                                        onClick={() => {
                                            navigator.clipboard?.writeText(user.user || '')
                                            message.success('账号已复制')
                                        }}
                                    >
                                        {user.user}
                                    </code>
                                </Tooltip>
                            </Descriptions.Item>
                            <Descriptions.Item label="avanter" >
                                <Avatar src={user.avanter} />
                            </Descriptions.Item>
                            <Descriptions.Item label="昵称">{user.name}</Descriptions.Item>
                            <Descriptions.Item label="创建时间">{dayjs(user.creatTime).format("YYYY/MM/D")}</Descriptions.Item>

                            <Descriptions.Item label="电话">{user.tel}</Descriptions.Item>
                            <Descriptions.Item label="邮箱">{user.mail}</Descriptions.Item>
                            <Descriptions.Item label="组织">{user.company}</Descriptions.Item>
                            <Descriptions.Item label="小程序">{
                                user.wpId ?
                                    <StatusTag variant="online" text="已绑定" showDot={false} />
                                    : <Button variant="primary" shape="round" onClick={() => showQR("wp")}>点击绑定小程序</Button>
                            }</Descriptions.Item>
                            <Descriptions.Item label="公众号">{
                                user.wxId ?
                                    <StatusTag variant="online" text="已绑定" showDot={false} />
                                    : <Button variant="primary" shape="round" onClick={() => showQR("wx")}>点击绑定公众号</Button>
                            }</Descriptions.Item>
                        </Descriptions>

                        <Divider plain>告警联系方式</Divider>
                        <Form layout="vertical">
                            <Form.Item label="告警通知电话">
                                {
                                    tels.map((el, key) => <Tag closable color="green" onClose={() => delTel(key)} key={key}>{el}</Tag>)
                                }
                                <PlusSquareFilled style={{ color: "green" }} onClick={addTel} />
                            </Form.Item>
                            <Form.Item label="告警通知邮箱">
                                {
                                    mails.map((el, key) => <Tag closable color="green" onClose={() => delMail(key)} key={key}>{el}</Tag>)
                                }
                                <PlusSquareFilled style={{ color: "green" }} onClick={addMail} />
                            </Form.Item>
                            <Form.Item >
                                <Button variant="primary" onClick={saveAlarm} block={isMobile}>保存配置</Button>
                            </Form.Item>
                        </Form>
                    </Space>
                </Col>
            </Row>
        </div>
    )
}

export default UserInfo
