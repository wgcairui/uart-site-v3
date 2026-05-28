'use client'
import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import React from "react";
import { getTerminalPidProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { sendOprateInstruct } from "@/lib/utils/util";
import { DevDataProps } from "./TerminalRunData";

interface ResultProps extends DevDataProps {
    result?: Uart.queryResultArgument[]
}

export const TerminalDevOprate: React.FC<ResultProps> = ({ mac, pid }) => {

    const { data } = usePromise(async () => {
        const { data: mountDev } = await getTerminalPidProtocol(mac, pid)
        const { data: { sys } } = await getProtocolSetup<Uart.OprateInstruct>(mountDev.protocol, "OprateInstruct")
        return sys
    }, [])

    return (
        !data?.length ? <></>
            :
            <Dropdown
                menu={{
                    items: data.map((el: any) => ({
                        key: el.name,
                        onClick: () => sendOprateInstruct(mac, pid, el.tag),
                        label: el.name
                    }))
                }}>
                <a className="ant-dropdown-link">
                    操作指令<DownOutlined />
                </a>
            </Dropdown>
    )
}


/**
 * 设备状态-温湿度
 * @returns
 */
