'use client'
import { CopyOutlined, IeOutlined } from "@ant-design/icons";
import { message, Modal, Tooltip } from "antd";
import React from "react";
import "./myCopy.css"
interface copy {
    value: string
}

/**
 * 可以拷贝片段
 * @param props
 * @returns
 */
export const MyCopy: React.FC<copy> = props => {

    const copy = () => {
        var aux = document.createElement("input");
        aux.setAttribute("value", props.value.toString());
        document.body.appendChild(aux);
        aux.select();
        document.execCommand("copy");
        document.body.removeChild(aux);
        message.success(`copy success`)
    }

    const show = () => {
        const content = props.value
        if (/^http/.test(content)) {
            window.open(content.split(' ')[0])
        } else {
            Modal.info({ content })
        }
    }

    return (
        <section className="f">
            <Tooltip title={props.value}>
                <p>{props.value}</p>
            </Tooltip>
            {
                (props.value && props.value.length > 5) && <CopyOutlined onClick={() => copy()} />
            }
            {
                /(^http|^<.*>$)/.test(props.value) &&
                <IeOutlined onClick={() => show()} />
            }
        </section>
    )
}
