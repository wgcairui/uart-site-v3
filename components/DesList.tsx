'use client'
import { Divider, Descriptions, Empty } from "antd";
import React from "react";
import { MyCopy } from "@/components/myCopy";

/**
 * 展示数据
 */
export const DesList: React.FC<{ title: string, data: Record<string, any> | undefined }> = ({ title, data }) => {
    return (
        <>
            <Divider plain>{title}</Divider>
            {
                data ?
                    <Descriptions column={1}>
                        {
                            Object.entries(data).map(([key, val]) =>
                                <Descriptions.Item label={key} key={key}>
                                    <MyCopy value={typeof val === 'string' ? val : JSON.stringify(val)} />
                                </Descriptions.Item>
                            )
                        }
                    </Descriptions>
                    : <Empty />
            }
        </>
    )
}
