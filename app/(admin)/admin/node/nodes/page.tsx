'use client'
import { Button, Divider, Form, Input, message, Modal, Table, Card } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { deleteNode, nodeRestart, Nodes as getNodes, setNode } from "@/lib/api/fetchRoot"
import { generateTableKey, tableConfig } from "@/lib/utils/tableCommon";
import { usePromise } from "@/lib/hooks/usePromise";
import { DeleteFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";



interface AddNodeProps {
    ok?: () => void;
    visible: boolean;
    onCancel: () => void;
    initialValue?: Uart.NodeClient | null;
}

const AddNode: React.FC<AddNodeProps> = ({ ok, visible, onCancel, initialValue }) => {

    const [name, setName] = useState("")
    const [ip, setIp] = useState("")
    const [port, setPort] = useState(9000)
    const [count, setCount] = useState(20000)

    useEffect(() => {
        if (visible) {
            if (initialValue) {
                setName(initialValue.Name);
                setIp(initialValue.IP);
                setPort(initialValue.Port);
                setCount(initialValue.MaxConnections || 20000);
            } else {
                setName("");
                setIp("");
                setPort(9000);
                setCount(20000);
            }
        }
    }, [visible, initialValue]);

    const submit = () => {

        setNode(name, ip, port, count)
            .then(el => {
                if (el.code) {
                    message.success("保存节点成功")
                    onCancel();
                    ok && ok()
                }
            });
    }

    return (
        <Modal
            title={initialValue ? "编辑节点" : "添加节点"}
            open={visible}
            onCancel={onCancel}
            onOk={submit}
            destroyOnHidden
        >
            <Form labelCol={{ span: 5 }}>
                <Form.Item label="节点名称" required>
                    <Input value={name} onChange={e => setName(e.target.value)} disabled={!!initialValue}></Input>
                </Form.Item>
                <Form.Item label="节点IP" required>
                    <Input value={ip} onChange={e => setIp(e.target.value)}></Input>
                </Form.Item>
                <Form.Item label="节点Port">
                    <Input value={port} type="number" onChange={e => setPort(Number(e.target.value))}></Input>
                </Form.Item>
                <Form.Item label="最大连接数">
                    <Input value={count} type="number" onChange={e => setCount(Number(e.target.value))}></Input>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export const Nodes: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<Uart.NodeClient | null>(null);
    const router = useRouter()

    const { data: nodes, fecth } = usePromise<any[]>(async () => {
        const el = await getNodes();
        return el.data.items || el.data as any;
    }, [])

    const status = useMemo(() => {
        return nodes.map(el => ({ type: el.Name, value: el.count || 0 }))
    }, [nodes])

    const deleteNodes = (node: string) => {
        Modal.confirm({
            content: `确定删除节点 "${node}" 吗？`,
            onOk() {
                deleteNode(node)
                    .then(el => {
                        if (el.code) {
                            message.success("删除成功")
                            fecth()
                        } else {
                            Modal.warn({
                                content: `${el.data} 等设备挂载在节点上，无法直接删除`
                            })
                        }
                    });
            }
        });
    }


    const restart = (node: string) => {
        Modal.confirm({
            content: `确定重启节点:${node}??`,
            onOk() {
                nodeRestart(node).then(el => {
                    console.log(el);

                })
            }
        })
    }
    return (
        <>
            <Divider plain>节点信息</Divider>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '16px 0' }}>
                {status.map(item => (
                    <Card size="small" key={item.type}>
                        <div>{item.type}: {item.value}</div>
                    </Card>
                ))}
            </div>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" onClick={() => { setEditingItem(null); setVisible(true); }}>添加节点</Button>
            </div>
            <AddNode visible={visible} onCancel={() => setVisible(false)} initialValue={editingItem} ok={fecth} />
            <Table dataSource={generateTableKey(nodes, "_id")} {...tableConfig}>
                <Table.Column dataIndex="Name" title="节点名称"></Table.Column>
                <Table.Column dataIndex="IP" title="节点IP"></Table.Column>
                <Table.Column dataIndex="Port" title="节点端口"></Table.Column>
                <Table.Column dataIndex="MaxConnections" title="最大连接数"></Table.Column>
                <Table.Column dataIndex="count" title="注册设备"></Table.Column>
                <Table.Column dataIndex="online" title="在线设备"></Table.Column>
                <Table.Column key="oprate" title="操作" render={(_, re: Uart.NodeClient) => <div style={{ display: "flex", gap: 8 }}>
                    <Button type="link" size="small" onClick={() => { setEditingItem(re); setVisible(true); }}>编辑</Button>
                    <Button type="link" size="small" onClick={() => router.push(`/admin/node/nodes/info/${encodeURIComponent(re.Name)}`)}>查看日志</Button>
                    <Button type="link" size="small" onClick={() => restart(re.Name)}>重启</Button>
                    <Button type="link" size="small" danger icon={<DeleteFilled></DeleteFilled>} onClick={() => deleteNodes(re.Name)}></Button>
                </div>}></Table.Column>
            </Table>
        </>
    )
}

export default Nodes
