'use client'
import React, { useState } from "react";
import {
    Modal,
    Input,
    Button,
    Form,
    Space,
    Spin,
    Descriptions,
    Tag,
    message,
    Alert,
} from "antd";
import { SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { adminGetTerminal, bindUserDevice } from "@/lib/api/fetchRoot";

interface AddUserTerminalModalProps {
    /** 是否显示 */
    visible: boolean;
    /** 目标用户 */
    user: string;
    /** 关闭 */
    onCancel?: () => void;
    /** 绑定成功 */
    onSuccess?: () => void;
}

/**
 * Admin: 为指定用户绑定一台现有终端
 *
 * 流程：
 * 1. 输入 MAC 查找设备
 * 2. 展示设备信息
 * 3. 若设备已被其他用户绑定（!share && ownerId && ownerId !== user）：
 *    - 弹"强行绑定"确认 Modal
 *    - 用户确认后调用 bindUserDevice(user, mac, force=true)
 *    - 后端会先解绑原用户，再把设备转给当前用户
 * 4. 成功后回调刷新
 */
export const AddUserTerminalModal: React.FC<AddUserTerminalModalProps> = ({
    visible,
    user,
    onCancel,
    onSuccess,
}) => {
    const [mac, setMac] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmForce, setConfirmForce] = useState(false);
    const [ter, setTer] = useState<(Uart.Terminal & { ownerId?: string }) | null>(null);

    /** 是否需要强行绑定 */
    const needForce = !!(
        ter &&
        ter.ownerId &&
        ter.ownerId !== user &&
        !ter.share
    );

    const reset = () => {
        setMac("");
        setTer(null);
        setLoading(false);
        setSubmitting(false);
        setConfirmForce(false);
    };

    const handleCancel = () => {
        reset();
        onCancel?.();
    };

    const handleSearch = async () => {
        const trimmed = mac.trim();
        if (!trimmed) {
            message.warning("请输入设备 MAC");
            return;
        }
        setLoading(true);
        setTer(null);
        const key = `search-${trimmed}`;
        message.loading({ content: "查找中…", key });
        try {
            const res = await adminGetTerminal(trimmed);
            if (res.code === 200 && res.data) {
                setTer(res.data as Uart.Terminal & { ownerId?: string });
                message.success({ content: "已找到设备", key });
            } else {
                message.warning({ content: res.message || "设备不存在", key });
            }
        } catch (e: any) {
            message.error({ content: e?.message || "查找失败", key });
        } finally {
            setLoading(false);
        }
    };

    const doBind = async (force: boolean) => {
        if (!ter) return;
        setSubmitting(true);
        const key = `bind-${ter.DevMac}`;
        message.loading({ content: force ? "强行绑定中…" : "绑定中…", key });
        try {
            const res = await bindUserDevice(user, ter.DevMac, force);
            if (res.code === 200) {
                message.success({
                    content: force ? "强行绑定成功，原用户已解绑" : "绑定成功",
                    key,
                });
                onSuccess?.();
                handleCancel();
            } else {
                message.warning({ content: `绑定失败: ${res.message}`, key });
            }
        } catch (e: any) {
            message.error({ content: e?.message || "绑定失败", key });
        } finally {
            setSubmitting(false);
        }
    };

    const handleBind = async () => {
        if (!ter) return;
        if (needForce) {
            // 弹二次确认
            setConfirmForce(true);
            return;
        }
        await doBind(false);
    };

    const handleConfirmForce = async () => {
        setConfirmForce(false);
        await doBind(true);
    };

    return (
        <>
            <Modal
                title={`为用户 [${user}] 绑定设备`}
                open={visible}
                onCancel={handleCancel}
                onOk={handleBind}
                okText={needForce ? "强行绑定" : "绑定"}
                cancelText="取消"
                confirmLoading={submitting}
                okButtonProps={{
                    disabled: !ter,
                    danger: needForce,
                }}
                destroyOnClose
            >
                <Form layout="vertical">
                    <Form.Item label="设备 MAC">
                        <Space.Compact style={{ width: "100%" }}>
                            <Input
                                placeholder="输入设备 MAC"
                                value={mac}
                                onChange={(e) =>
                                    setMac(
                                        e.target.value.replace(
                                            /(\s|\.|\?)/g,
                                            ""
                                        )
                                    )
                                }
                                onPressEnter={handleSearch}
                                allowClear
                            />
                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                loading={loading}
                                onClick={handleSearch}
                            >
                                查找
                            </Button>
                        </Space.Compact>
                    </Form.Item>
                </Form>

                {loading ? (
                    <div style={{ textAlign: "center", padding: 30 }}>
                        <Spin />
                    </div>
                ) : ter ? (
                    <>
                        {needForce && (
                            <Alert
                                type="warning"
                                showIcon
                                icon={<WarningOutlined />}
                                style={{ marginBottom: 12 }}
                                title="该设备已被其他用户绑定"
                                description={
                                    <>
                                        当前设备 owner 为{" "}
                                        <b>{ter.ownerId}</b>。强行绑定将
                                        <b>保留原用户访问</b>，并把设备
                                        <b>转为共享</b>，使当前用户
                                        <b> [{user}]</b> 也能查看。
                                    </>
                                }
                            />
                        )}
                        <Descriptions
                            title={ter.DevMac}
                            size="small"
                            column={1}
                            bordered
                        >
                            <Descriptions.Item label="名称">
                                {ter.name || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="IP">
                                {ter.ip || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="接入节点">
                                {ter.mountNode || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="型号">
                                {ter.PID || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="共享">
                                {ter.share ? (
                                    <Tag color="blue">共享</Tag>
                                ) : (
                                    <Tag color="default">独占</Tag>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Owner">
                                {ter.ownerId || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                {ter.online ? (
                                    <Tag color="green">在线</Tag>
                                ) : (
                                    <Tag color="default">离线</Tag>
                                )}
                                {ter.disable ? (
                                    <Tag color="yellow">禁用</Tag>
                                ) : null}
                            </Descriptions.Item>
                        </Descriptions>
                    </>
                ) : null}
            </Modal>

            <Modal
                title="确认强行绑定"
                open={confirmForce}
                onOk={handleConfirmForce}
                onCancel={() => setConfirmForce(false)}
                okText="确认强行绑定"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: submitting }}
                destroyOnClose
            >
                <p>
                    设备 <b>{ter?.DevMac}</b> 当前 owner 为{" "}
                    <b>{ter?.ownerId}</b>。
                </p>
                <p>
                    强行绑定后，原用户 <b>{ter?.ownerId}</b> 仍保留访问权，
                    设备将转为共享，当前用户 <b>{user}</b> 也可查看。
                </p>
            </Modal>
        </>
    );
};
