'use client'

import { Form, Input, InputNumber, Select, Tabs } from 'antd'
import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/common/GlassCard'
import { Button } from '@/components/common/Button'
import { crc } from '@/lib/api/fetch'
import './tool.css'

/* ────────────────────────────── Prifx / SUB tab ────────────────────────────── */

const Prifx: React.FC = () => {
  const [prifx, setPrifx] = useState('')
  const [split, setSplit] = useState('\n')
  const [content, setContent] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    const datas = (content ?? '').split(split)
    const data = datas.map(el => prifx + el).join(split)
    setResult(data)
  }, [prifx, split, content])

  return (
    <Form labelCol={{ span: 3 }} className="page-tool-form" layout="horizontal">
      <Form.Item label="前戳" name="prifx">
        <Input
          value={prifx}
          onChange={e => setPrifx(e.target.value)}
          placeholder="每行前缀 (如 $ 或 device-)"
        />
      </Form.Item>
      <Form.Item label="分隔符" name="split">
        <Input
          value={split}
          onChange={e => setSplit(e.target.value)}
          placeholder="默认 \\n 换行"
        />
      </Form.Item>
      <Form.Item label="内容" name="content">
        <Input.TextArea
          minLength={2}
          autoSize={{ minRows: 6 }}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="多行内容,每行自动加前戳"
        />
      </Form.Item>
      <Form.Item label="序列化" className="ant-form-item-output">
        <Input.TextArea
          minLength={2}
          autoSize={{ minRows: 6 }}
          value={result}
          readOnly
        />
      </Form.Item>
    </Form>
  )
}

/* ────────────────────────────── CRC16 tab ────────────────────────────── */

interface CrcOption {
  protocolType: number
  pid: number
  instructN: string
  address: number
  value: number
}

const INSTRUCT_OPTIONS = ['01', '02', '03', '04', '05', '06']

const Crc: React.FC = () => {
  const [form] = Form.useForm<CrcOption>()
  const [result, setResult] = useState('')

  const onFinish = (value: CrcOption) => {
    crc({ ...value, protocolType: 1 })
      .then(el => setResult(String(el ?? '')))
      .catch(() => setResult(''))
  }

  return (
    <Form
      form={form}
      labelCol={{ span: 3 }}
      className="page-tool-form"
      layout="horizontal"
      initialValues={{ protocolType: 1, pid: 1, instructN: '03', address: 0, value: 0 }}
      onFinish={onFinish}
    >
      <Form.Item label="PID" name="pid">
        <InputNumber min={0} placeholder="协议 PID (1 / 2 / 3 ...)" />
      </Form.Item>
      <Form.Item label="指令类型" name="instructN">
        <Select
          options={INSTRUCT_OPTIONS.map(el => ({ value: el, label: el }))}
          placeholder="Modbus 功能码"
        />
      </Form.Item>
      <Form.Item label="起始地址" name="address">
        <InputNumber min={0} placeholder="寄存器起始地址" />
      </Form.Item>
      <Form.Item label="长度/值" name="value">
        <InputNumber min={0} placeholder="读长度 或 写值" />
      </Form.Item>
      <Form.Item label="CRC" className="ant-form-item-output">
        <Input
          value={result}
          readOnly
          placeholder="提交后生成 Modbus CRC16 指令"
        />
      </Form.Item>
      <Form.Item className="page-tool-form-actions">
        <Button variant="primary" htmlType="submit">
          获取指令
        </Button>
      </Form.Item>
    </Form>
  )
}

/* ────────────────────────────── Page root ────────────────────────────── */

const Tool: React.FC = () => {
  return (
    <div className="page-tool bg-glass-mesh">
      <main className="page-tool-content">
        <GlassCard variant="dark" padding="xl" className="page-tool-card">
          <header className="page-tool-card-header">
            <div className="page-tool-card-mark">T</div>
            <div className="page-tool-card-title">
              <span className="page-tool-card-title-main">串口 / 协议工具</span>
              <span className="page-tool-card-title-sub">CRC16 + SUB · INTERNAL</span>
            </div>
            <div className="page-tool-card-meta">
              百事服内部
            </div>
          </header>

          <Tabs
            defaultActiveKey="crc"
            className="page-tool-tabs"
            items={[
              {
                key: 'crc',
                label: 'CRC16',
                children: <Crc />,
              },
              {
                key: 'sub',
                label: 'SUB',
                children: <Prifx />,
              },
            ]}
          />

          <footer className="page-tool-card-footer">
            <span>CRC16 走 server /api/v2/open/utils/crc</span>
            <span>SUB 纯前端 · 实时拼接</span>
          </footer>
        </GlassCard>
      </main>
    </div>
  )
}

export default Tool
