'use client'
import React, { useMemo, useState } from "react";
import { Select } from "antd";
import { getProtocol } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";

interface ProtocolInstructSelectProps {
    defaultValue?: string[];
    protocolName: string;
    onChange?: (value: string | string[]) => void;
    filterOptions?: (options: { label: string; value: string }[]) => { label: string; value: string }[];
    multiple?: boolean;
}

export const ProtocolInstructSelect: React.FC<ProtocolInstructSelectProps> = ({ defaultValue, protocolName, onChange, filterOptions, multiple }) => {

    const { data, loading } = usePromise(async () => {
        const { data } = await getProtocol(protocolName)
        return data.instruct || []
    }, [])

    const options = useMemo(() => {
        const args = data.map((el: any) => el.formResize.map((e2: any) => e2.name)).flat()
        return filterOptions && typeof filterOptions === 'function' ? args.filter((el: string) => !(filterOptions as Function)(data).map((o: any) => o.value).includes(el)) : args
    }, [filterOptions, data])

    return (
        <Select {...(defaultValue !== undefined ? { defaultValue } : {})} {...(onChange !== undefined ? { onChange } : {})} {...(multiple ? { mode: "multiple" } : {})} loading={loading} style={{ minWidth: 150 }}>
            {
                options.map((el: string, i: number) => <Select.Option value={el} key={el + i} >{el}</Select.Option>)
            }
        </Select>
    )
}
