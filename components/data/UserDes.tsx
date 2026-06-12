'use client'
import { Descriptions, Tag, Modal, Button, Space, Empty, message, Select, Input } from "antd";
import dayjs from "dayjs";
import React from "react";
import { toggleUserGroup, modifyUserRemark, getUser, resetUserPassword, modifyAdminUserAlarmSetupContacts } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";
import { MyInput } from "@/components/common/MyInput";

interface Props<T extends string | Uart.UserInfo = string> {
    user: T
    updateUser?: (user: string) => void
}

/**
 * @returns
 */
export const UserDes: React.FC<Props<Uart.UserInfo | string>> = ({ user: u, updateUser }) => {

    const { data: user } = usePromise(async () => {
        const { data } = typeof u === 'string' ? await getUser(u) : { data: u }
        return data
    }, undefined)

    /**
     * 切换用户组
     */
    const swicthGroup = () => {
        Modal.confirm({
            content: `是否变更用户${user.name} 为 [${user.userGroup === "admin" ? "user" : "admin"
                }]`,
            onOk() {
                toggleUserGroup(user.user).then((el) => {
                    if (el.code) {
                        message.success(el.data)
                        updateUser && updateUser(user.user)
                    }
                })
            }
        })
    }

    /**
     * 修改用户密码
     */
    const changePassword = () => {
        let newPwd = ''
        Modal.confirm({
            title: `修改 [${user.user}] 的密码`,
            content: (
                <Input.Password
                    placeholder="请输入新密码"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { newPwd = e.target.value }}
                />
            ),
            onOk() {
                if (!newPwd || newPwd.length < 6) {
                    message.error('密码不能少于6位')
                    return Promise.reject()
                }
                return resetUserPassword(user.user, newPwd).then(el => {
                    if (el.code) {
                        message.success('密码修改成功')
                    } else {
                        message.error(el.message || '修改失败')
                    }
                })
            }
        })
    }

    const remark = (val: string) => {
        modifyUserRemark(user.user, val).then(() => {
            message.success('success')
            updateUser && updateUser(user.user)
        })
    }

    return (
        user ?
            <>
                <Space style={{ marginBottom: 16 }}>
                    <Button size="small" type="primary" onClick={() => swicthGroup()}>
                        切换为{user.userGroup === 'user' ? 'admin' : 'user'}
                    </Button>
                    <Button size="small" danger onClick={() => changePassword()}>
                        修改密码
                    </Button>
                </Space>
                <Descriptions>
                    <Descriptions.Item label="注册类型">{user.rgtype
                    }</Descriptions.Item>
                    <Descriptions.Item label="账号">{user.user
                    }</Descriptions.Item>
                    <Descriptions.Item label="昵称">{user.name
                    }</Descriptions.Item>
                    <Descriptions.Item label="用户组">
                        <Space>
                            <Tag>{user.userGroup}</Tag>

                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="邮箱">{user.mail
                    }</Descriptions.Item>
                    <Descriptions.Item label="电话">{user.tel
                    }</Descriptions.Item>
                    <Descriptions.Item label="组织">{user.company
                    }</Descriptions.Item>
                    <Descriptions.Item label="开放Id">{user.userId
                    }</Descriptions.Item>
                    <Descriptions.Item label="公众号Id">{user.wxId
                    }</Descriptions.Item>
                    <Descriptions.Item label="小程序Id">{user.wpId
                    }</Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                        {dayjs(user.creatTime).format("YYYY-MM-DD H:m:s")}
                    </Descriptions.Item>
                    <Descriptions.Item label="修改时间">
                        {dayjs(user.modifyTime).format("YYYY-MM-DD H:m:s")}
                    </Descriptions.Item>
                    <Descriptions.Item label="登陆IP">{user.address
                    }</Descriptions.Item>
                    <Descriptions.Item label="转发配置">{user?.proxy
                    }</Descriptions.Item>
                    <Descriptions.Item label="备注">
                        <MyInput {...(user.remark !== undefined ? { value: user.remark } : {})} onSave={remark}></MyInput>
                    </Descriptions.Item>
                </Descriptions>
            </>
            : <Empty />
    )
}

export const EditableContact: React.FC<{ user: string, type: 'tels' | 'mails' | 'wxs', values: string[], onUpdate: () => void }> = ({ user, type, values, onUpdate }) => {
    return <Select 
        mode="tags" 
        style={{ width: '100%', minWidth: 200 }} 
        defaultValue={values}
        onChange={async (newVals) => {
            await modifyAdminUserAlarmSetupContacts(user, { [type]: newVals });
            onUpdate();
        }}
    />;
};

/**
 * 显示用户告警信息
 * @param param0
 */
