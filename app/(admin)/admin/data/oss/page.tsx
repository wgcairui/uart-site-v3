'use client'
import { SearchOutlined, UploadOutlined } from "@ant-design/icons"
import { Badge, Button, Divider, Form, Input, message, Modal, Table, Upload } from "antd"
import { ColumnsType } from "antd/lib/table"
import { UploadChangeParam } from "antd/lib/upload"
import { RcFile, UploadFile } from "antd/lib/upload/interface"
import dayjs from "dayjs"
import React, { useState } from "react"
import { ossDelete, ossFilelist, ossfiles } from "@/lib/api/fetchRoot"
import { getToken } from "@/lib/api/fetch"
import { generateTableKey } from "@/lib/utils/tableCommon"
import { CopyClipboard } from "@/lib/utils/util"
import { universalResult } from "@/types"

export const OssUpload: React.FC = () => {

    const [prefix, setPrefix] = useState<string>()

    const [files, setFiles] = useState<(ossfiles & { label?: string })[]>([])

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

    /**
     * 列出oss文件
     */
    const search = () => {
        ossFilelist(prefix).then(el => {
            setFiles(el.data as any)
        })
    }

    /**
     * 删除oss文件
     * @param names
     */
    const deleteoss = (names: string[]) => {
        Modal.confirm({
            content: ``,
            onOk() {
                ossDelete(names).then(el => {
                    const nameSet = new Set(names)
                    setFiles(files => {
                        files = files.filter(e2 => !nameSet.has(e2.name))
                        return files
                    })
                    setSelectedRowKeys([])
                })
            }
        })
    }

    const s = ({ file }: UploadChangeParam<UploadFile<universalResult<any>>>) => {
        if (file.status === 'done') {
            console.log({ file });
            const { name, response, size, lastModifiedDate } = file
            const data = response?.data!
            if (response?.code === 0) {
                message.error(response.message)
                return;
            }
            message.success(`${name}上传已完成`)
            setFiles([{ name: data.name, url: data.url, label: name, size: size!, lastModified: lastModifiedDate as any }, ...files])
            CopyClipboard(data.url)
        }
    }

    return (

        <>
            <Divider>上传文件到ali-oss, 如果上传失败,请将文件压缩之后重试</Divider>
            <Upload
                onChange={s}
                multiple
                action="/api/v2/admin/system/oss/upload"
                headers={{ Authorization: `Bearer ${getToken()}` || '' }}
            >
                <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
            <Divider>oss文件列表</Divider>
            <Form layout="inline" style={{ marginBottom: 22 }}>
                <Form.Item initialValue={prefix} label="搜索">
                    <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="oss文件类型"></Input>
                </Form.Item>
                <Form.Item >
                    <Button onClick={() => search()} icon={<SearchOutlined />} type="primary">搜索</Button>
                </Form.Item>
                <Form.Item>
                    <Button danger onClick={() => deleteoss(selectedRowKeys as any)} disabled={selectedRowKeys.length === 0}>删除所选({selectedRowKeys.length})</Button>
                </Form.Item>
            </Form>

            <Table
                dataSource={generateTableKey(files, "url")}
                rowKey="name"
                rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys
                }}
                columns={[
                    {
                        dataIndex: 'name',
                        title: 'name',
                        render: (val: string, re) => <>
                            {
                                re.label ? <Badge.Ribbon text="本次上传">
                                    {val.split("/").reverse()[0]}
                                </Badge.Ribbon>
                                    :
                                    val.split("/").reverse()[0]
                            }
                        </>
                    },
                    {
                        dataIndex: 'label',
                        title: '文件名',
                        render: (val, re) => val || ''
                    },
                    {
                        dataIndex: 'size',
                        title: 'size',
                        render: (val: string) => (Number(val) / 1024).toFixed(0) + 'KB'
                    },
                    {
                        dataIndex: 'lastModified',
                        title: '上传日期',
                        render: val => dayjs(val).format('YY-MM-DD H:m:s')
                    },
                    {
                        key: "oprate",
                        title: '操作',
                        render: (_, re) => <>
                            <Button onClick={() => CopyClipboard(re.url.replace("http:", 'https:'))} type="link">复制链接</Button>
                            <Button href={re.url} target="_blank" type="link">打开链接</Button>
                            <Button onClick={() => deleteoss([re.name])} type="link">删除</Button>
                        </>
                    }
                ] as ColumnsType<ossfiles & { label?: string }>}
            ></Table>
        </>
    )
}


export default OssUpload
