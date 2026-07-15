'use client'
import React, { useState } from "react";
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
    placeholder?: string;
    disabled?: boolean;
    changeOnSelect?: boolean;
}

export const DevTypesCascader: React.FC<CascaderProps> = props => {

    const [cascader, setCascader] = useState<DataNode[]>([
        { value: 'UPS', label: "UPS", isLeaf: false, },
        { value: '空调', label: "空调", isLeaf: false, },
        { value: '电量仪', label: "电量仪", isLeaf: false, },
        { value: '温湿度', label: "温湿度", isLeaf: false, },
        { value: 'IO', label: "IO", isLeaf: false, },
    ])

    // 已加载过的 Type 集合, 避免重复 API call
    const [loaded, setLoaded] = useState<Set<string>>(new Set())

    const loadData = (selectedOptions: DataNode[]) => {
        // 只处理单层展开 (顶层 Type 才有 children)
        if (selectedOptions.length !== 1) return;
        const target = selectedOptions[0];
        if (!target) return;
        const targetValue = String(target.value);

        // 已有 children, 不重复加载
        if (target.children || loaded.has(targetValue)) return;

        // 显式设 loading 状态, antd v6 Cascader 用此字段显示 spinner
        setCascader(prev => prev.map(opt =>
            String(opt.value) === targetValue
                ? { ...opt, loading: true }
                : opt
        ));

        getDevTypes(targetValue).then(el => {
            // getDevTypes 实际返回: { code, data: DevsType[] } 数组直接
            // 类型声明写的是 V2ListResponse { items, pagination } 是错的
            // 这里兼容两种 shape
            const raw = el?.data;
            const items: any[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.items)
                    ? raw.items
                    : [];
            const children = items.map((type: any) => ({
                value: type.DevModel,
                label: type.DevModel,
                isLeaf: false,
                children: (type.Protocols || []).map((p: any) => ({
                    value: p.Protocol,
                    label: p.Protocol,
                    isLeaf: true,
                })),
            }));
            // 不可变更新, 不要直接 mutate target
            setCascader(prev => prev.map(opt =>
                String(opt.value) === targetValue
                    ? { ...opt, children, loading: false, isLeaf: false }
                    : opt
            ));
            setLoaded(prev => new Set(prev).add(targetValue));
        }).catch((err) => {
            // 加载失败回滚 loading 状态
            setCascader(prev => prev.map(opt =>
                String(opt.value) === targetValue
                    ? { ...opt, loading: false }
                    : opt
            ));
            console.error('[DevTypesCascader] loadData failed for', targetValue, err);
        });
    }

    return (
        <Cascader
            options={cascader}
            loadData={loadData as any}
            placeholder={props.placeholder ?? "选择 Type / 设备型号 / 协议"}
            changeOnSelect={props.changeOnSelect ?? true}
            displayRender={(labels: string[]) =>
                labels.length > 0 ? labels.join(' / ') : (props.placeholder ?? "选择 Type / 设备型号 / 协议")
            }
            {...(props.multiple !== undefined ? { multiple: props.multiple } : {})}
            {...(props.value !== undefined ? { value: props.value } : {})}
            {...(props.disabled !== undefined ? { disabled: props.disabled } : {})}
            onChange={props.onChange as any}
        />
    )
}


/**
 * 通用协议级联选择模板
 * @param props
 * @returns
 */
