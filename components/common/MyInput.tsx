'use client'
import { EditFilled } from "@ant-design/icons";
import { Button, Input, Space } from "antd";
import React, { useEffect, useState } from "react";

interface myInput {
    textArea?: boolean
    onSave?: (val: string) => void
    value?: string
    okText?: string
}

/**
 * 自定义输入框（带 onSave 回调）
 *
 * 视觉风格：浅灰底 + focus 蓝环（继承 antd Input token + globals.css 覆盖）
 */
export const MyInput: React.FC<myInput> = props => {

    const [Edit, setEdit] = useState(false)
    const [val, setVal] = useState(props.value || '')

    useEffect(() => {
        setVal(props.value || '')
    }, [props.value])

    const save = () => {
        props.onSave && props.onSave(val)
        setEdit(false)
    }

    const blur = () => {
        setTimeout(() => setEdit(false), 1000)
    }

    const change = (e: any) => {
        setVal(e.target.value)
    }

    return (
        props.textArea ?
            <section style={{ display: 'block', width: "100%" }}>
                <Input.TextArea
                    autoSize
                    minLength={2}
                    allowClear
                    value={val}
                    onChange={change}
                    onFocus={() => setEdit(true)}
                    onBlur={blur}
                    size="middle"
                />
                {Edit && (
                    <Button
                        className="btn-brand"
                        style={{ marginTop: 8 }}
                        size="small"
                        type="primary"
                        onClick={() => save()}
                    >
                        {props.okText || '保存'}
                    </Button>
                )}
            </section>
            :
            <Space.Compact style={{ width: 'auto', display: 'flex', alignItems: 'center' }}>
                <Input
                    variant="borderless"
                    value={val}
                    onChange={change}
                    onFocus={() => setEdit(true)}
                    onPressEnter={save}
                    onBlur={blur}
                />
                {
                    Edit ?
                        <Button
                            size="small"
                            shape="round"
                            type="primary"
                            className="btn-brand"
                            onClick={() => save()}
                        >
                            {props.okText || '保存'}
                        </Button>
                        : <EditFilled style={{ color: '#8b5cf6' }} />
                }
            </Space.Compact>
    )
}