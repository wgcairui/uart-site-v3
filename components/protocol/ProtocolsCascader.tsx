'use client'
import React, { useState } from "react";
import { Cascader } from "antd";
import { getProtocols } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";

interface DataNode {
    label: React.ReactNode;
    title?: string;
    value: string | number;
    disabled?: boolean;
    children?: DataNode[];
    isLeaf?: boolean;
}

interface CascaderProps {
    onChange?: (value: any, selectOptions: any[]) => void;
    multiple?: boolean;
    value?: any;
}

export const ProtocolsCascader: React.FC<CascaderProps> = props => {

    const [cascader, setCascader] = useState<DataNode[]>([
        { value: 'ups', label: "UPS", isLeaf: false, },
        { value: 'air', label: "空调", isLeaf: false, },
        { value: 'em', label: "电量仪", isLeaf: false, },
        { value: 'th', label: "温湿度", isLeaf: false, },
        { value: 'io', label: "IO", isLeaf: false, },
    ])

    const loadData = (opts: DataNode[]) => {
        if (opts.length === 1) {
            const target = opts[0];
            if (!target) return;
            (target as any).loading = true
            getProtocols().then(el => {
                (target as any).loading = false
                target.children = el.data.items.filter((el: any) => el.ProtocolType === target.value).map((type: any) => ({
                    value: type.Protocol,
                    label: type.Protocol,
                }))
                setCascader([...cascader])
            })
        }
    }

    return (
        <Cascader options={cascader} loadData={loadData as any} {...(props.multiple !== undefined ? { multiple: props.multiple } : {})} {...(props.value !== undefined ? { value: props.value } : {})} onChange={props.onChange as any} />
    )
}


interface selectProps {
    label: string
    value: string | number
}
/**
 * 节点选择器
 * @returns
 */
