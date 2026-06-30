'use client'
import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import React from "react";
import { getTerminalPidProtocol, getProtocolSetup } from "@/lib/api/fetch";
import { usePromise } from "@/lib/hooks/usePromise";
import { useScheduleOpModal } from "./useScheduleOpModal";
import { ScheduleOpModal } from "@/components/scheduled-op/ScheduleOpModal";
import { DevDataProps } from "./TerminalRunData";

interface ResultProps extends DevDataProps {
    result?: Uart.queryResultArgument[]
}

export const TerminalDevOprate: React.FC<ResultProps> = ({ mac, pid }) => {

    const { openScheduleOp, isOpen, currentItem, currentMac, currentPid, currentMountDev, currentProtocol, closeModal, handleSuccess } = useScheduleOpModal()

    const { data } = usePromise(async () => {
        const { data: mountDev } = await getTerminalPidProtocol(mac, pid)
        const { data: { sys } } = await getProtocolSetup<Uart.OprateInstruct>(mountDev.protocol, "OprateInstruct")
        return sys
    }, [])

    return (
        <>
        {!data?.length ? <></>
            :
            <Dropdown
                menu={{
                    items: data.map((el: any) => ({
                        key: el.name,
                        onClick: () => openScheduleOp({ mac, pid, tag: el.tag }),
                        label: el.name
                    }))
                }}>
                <a className="ant-dropdown-link">
                    操作指令<DownOutlined />
                </a>
            </Dropdown>
        }
        {currentItem && (
            <ScheduleOpModal
                open={isOpen}
                mac={currentMac}
                pid={currentPid}
                item={currentItem}
                protocolName={currentProtocol}
                mountDev={currentMountDev}
                api="user"
                onCancel={closeModal}
                onSuccess={handleSuccess}
            />
        )}
        </>
    )
}


/**
 * 设备状态-温湿度
 * @returns
 */
