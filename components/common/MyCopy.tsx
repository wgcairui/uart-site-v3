'use client'
import { CopyOutlined, IeOutlined } from "@ant-design/icons";
import { message, Modal, Tooltip } from "antd";
import React from "react";

interface copy {
    value: string
}

/**
 * 可拷贝片段
 *
 * 视觉规则：图标按钮用品牌色，hover 状态清晰
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
        <section style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title={props.value}>
                <span style={{ color: 'var(--ink-700)' }}>{props.value}</span>
            </Tooltip>
            {(props.value && props.value.length > 5) && (
                <CopyOutlined
                    onClick={copy}
                    style={{ color: '#6366f1', cursor: 'pointer' }}
                />
            )}
            {/(^http|^<.*>$)/.test(props.value) && (
                <IeOutlined
                    onClick={show}
                    style={{ color: '#6366f1', cursor: 'pointer' }}
                />
            )}
        </section>
    )
}