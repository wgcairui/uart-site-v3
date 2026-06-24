'use client'
import React, { useMemo, useState } from "react";
import { Cascader } from "antd";
import { getDevTypes } from "@/lib/api/fetch";


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

export const DevTypesCascader: React.FC<CascaderProps> = props => {

    const [cascader, setCascader] = useState<DataNode[]>([
        { value: 'UPS', label: "UPS", isLeaf: false, },
        { value: '空调', label: "空调", isLeaf: false, },
        { value: '电量仪', label: "电量仪", isLeaf: false, },
        { value: '温湿度', label: "温湿度", isLeaf: false, },
        { value: 'IO', label: "IO", isLeaf: false, },
    ])

    const loadData = (opts: DataNode[]) => {
        if (opts.length === 1) {
            const target = opts[0];
            if (!target) return;
            (target as any).loading = true
            getDevTypes(target.value as string).then(el => {
                (target as any).loading = false
                target.children = el.data.items.map((type: any) => ({
                    value: type.DevModel,
                    label: type.DevModel,
                    children: type.Protocols.map((p: any) => ({
                        value: p.Protocol,
                        label: p.Protocol,
                    }))
                }))
                setCascader([...cascader])
            })
        }
    }

    return (
        <Cascader options={cascader} loadData={loadData as any} {...(props.multiple !== undefined ? { multiple: props.multiple } : {})} {...(props.value !== undefined ? { value: props.value } : {})} onChange={props.onChange as any} />
    )
}


/**
 * 通用协议级联选择模板
 * @param props
 * @returns
 */
