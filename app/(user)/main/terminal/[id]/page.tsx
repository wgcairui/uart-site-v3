'use client'

import { ApartmentOutlined, HomeOutlined } from "@ant-design/icons";
import { Breadcrumb, Card, Col, Descriptions, Divider, Row, Tag, Empty } from "antd";
import dayjs from "dayjs";
import React from "react";
import { useParams } from "next/navigation";
import { getTerminal } from "@/lib/api/fetch";

import { TerminalMountDevs } from "@/components/terminal/TerminalMountDevs";
import { usePromise } from "@/lib/hooks/usePromise";

/**
 * 透传网关设备详情页
 * @returns
 */
export default function Terminal() {
    const params = useParams()
    const id = params.id as string

    /**
     * 透传网关
     */
    const { data: terminal, fecth } = usePromise(async () => {
        const { data } = await getTerminal(id || '')
        return data
    }, undefined, [id])

    return (
        !terminal ? <Empty />
            :
            <>
                <Breadcrumb
                    items={[
                        { title: <HomeOutlined /> },
                        { title: <><ApartmentOutlined /><span>{terminal?.name}</span></> },
                    ]}
                />
                <Divider />
                <Card style={{ overflow: "auto", height: "100%",marginBottom:36 }}>
                    <Row>
                        <Col span={24} md={12}>
                            <Descriptions title={terminal?.name || id}>
                                <Descriptions.Item label="设备ID">{terminal?.DevMac}</Descriptions.Item>
                                <Descriptions.Item label="别名">{terminal?.name}</Descriptions.Item>
                                <Descriptions.Item label="状态">
                                    <Tag color="cyan">{terminal?.online ? '在线' : '离线'}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="上线时间">{dayjs(terminal?.uptime).format("YY-M-D H:m:s")}</Descriptions.Item>
                            </Descriptions>
                            <section style={{ padding: 12 }}>
                                <Divider plain>设备信息</Divider>
                                <TerminalMountDevs terminal={terminal} ex={true} showTitle={false} col={{ md: 12 }} onChange={fecth}></TerminalMountDevs>
                            </section>
                        </Col>

                    </Row>
                </Card>
            </>
    )
}
