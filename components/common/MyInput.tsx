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
 *
 * @param props
 * @returns
 */
export const MyInput: React.FC<myInput> = props => {

    const [Edit, setEdit] = useState(false)

    const [val, setVal] = useState(props.value || '')

    useEffect(() => {
        setVal(props.value || '')
    }, [props.value])

    /**
     * 保存内容
     */
    const save = () => {
        console.log('ssss',val);

        props.onSave && props.onSave(val)
        setEdit(false)
    }

    /**
     * 失去焦点
     */
    const blur = () => {
        setTimeout(() => setEdit(false), 1000)
    }

    /**
     * 内容改变
     * @param e
     */
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
                    size="small"
                >
                </Input.TextArea>

                <Button style={{ visibility: Edit ? 'visible' : "hidden", marginTop: 3 }} disabled={!Edit} size="small" type="primary" onClick={() => save()}>{props.okText || '保存'}</Button>

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
                >
                </Input>
                {
                    Edit ?
                        <Button size="small" shape="round" type="primary" onClick={() => save()}>{props.okText || '保存'}</Button>
                        : <EditFilled />
                }
            </Space.Compact>

    )
}
