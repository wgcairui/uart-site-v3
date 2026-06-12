'use client'
import React from "react";
import { Select, SelectProps } from "antd";
import { Nodes } from "@/lib/api/fetchRoot";
import { usePromise } from "@/lib/hooks/usePromise";

interface SelectItemProps {
    value?: string;
    width?: number | string;
}

export const NodesSelects: React.FC<SelectProps<SelectItemProps>> = (props) => {

    const { data } = usePromise(async () => {
        const { data } = await Nodes()
        return (data as any).items || data
    }, [])

    return (
        <Select {...props}>
            {
                data.map((node: any) => <Select.Option value={node.Name} key={node.IP}>{node.Name}</Select.Option>)
            }
        </Select>
    )
}


interface ProtocolInstructSelectProps {
    defaultValue?: string | string[]
    /**
     * 协议名称
     */
    protocolName: string
    onChange?: (data: string | string[]) => void

    multiple?: boolean
    /**
     * 刷选选项
     */
    filterOptions?: string[]
}
/**
 * 协议参数select
 * @param param0
 * @returns
 */
