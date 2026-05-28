'use client'
import React from "react";
import { Card, Divider, Table, Tag } from "antd";
import { ResultDataOriginal } from "@/components/ResultDataOriginal";
import { generateTableKey } from "@/lib/utils/tableCommon";

/**
 * 展示展开设备解析数据和原始数据
 */
export const clientResultExpandableExpandedRowRender = (li: any) =>
    <Card>
        <Divider plain>运行数据</Divider>
        <Table dataSource={generateTableKey(li.result, 'name')} pagination={{ hideOnSinglePage: true }}
            columns={[
                { dataIndex: 'name', title: '参数' },
                { dataIndex: 'value', title: '值' },
                { dataIndex: 'parseValue', title: '解析值' },
                {
                    dataIndex: 'alarm', title: '告警',
                    render: val => <Tag color={val ? 'red' : 'success'}>{val ? '是' : '否'}</Tag>
                }
            ]}
        />
        <Divider plain>原始数据</Divider>
        <ResultDataOriginal id={li.parentId} />
    </Card>