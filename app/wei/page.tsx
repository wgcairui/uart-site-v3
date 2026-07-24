'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Form, Input } from 'antd'
import { GlassCard } from '@/components/common/GlassCard'
import { Button } from '@/components/common/Button'
import './wei.css'

// 5 类关键词的提取顺序: 身份证 → 电话 → 车牌 → 挂车 → 姓名
const idCardRegex = /\b\d{17}[\dXx]\b/
const phoneRegex = /1[3-9]\d{9}/
const licensePlateRegex = /[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{5}/
const gLicensePlateRegex = /[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{4}[\u4e00-\u9fa5]/
const nameRegex = /[\u4e00-\u9fa5]{2,4}/

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractFirst(text: string, regex: RegExp): { match: string; rest: string } {
  const m = text.match(regex)
  if (!m) return { match: '', rest: text }
  // 全局清除第一个匹配项 (避免多结果)
  return { match: m[0], rest: text.replace(m[0], '') }
}

const SAMPLE_TEXT = `车号鲁GAX827，
挂车，鲁GG5M1超
李振超，
电话15621627002，
身份证号370784198507167615
吨位33.5吨以内
奎屯2库到滨州纺织厂470元/吨`

const FILTER_STORAGE_KEY = 'filterText'
const DEFAULT_FILTER = '车号|挂车|电话|身份证'

function loadFilter(): string {
  if (typeof window === 'undefined') return DEFAULT_FILTER
  return localStorage.getItem(FILTER_STORAGE_KEY) ?? DEFAULT_FILTER
}

const Wei: React.FC = () => {
  const [origData, setOrigData] = useState<string>(SAMPLE_TEXT)
  const [filterText, setFilterText] = useState<string>(loadFilter)
  const [formatAddress, setFormatAddress] = useState<string>('')

  // localStorage 持久化 (filterText 变化即写)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (filterText) {
      localStorage.setItem(FILTER_STORAGE_KEY, filterText)
    }
  }, [filterText])

  // 提取结果: 任何 origData / filterText 变化都重算
  const output = useMemo(() => {
    if (!origData) {
      return ''
    }
    // 1) 应用用户自定义过滤词 (| 分隔)
    const exclude = (filterText ?? '')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
    let text = origData
    if (exclude.length > 0) {
      const excludeReg = new RegExp(`(${exclude.map(escapeRegExp).join('|')})`, 'g')
      text = text.replace(excludeReg, '')
    }
    // 2) 标准化分隔符 (中文逗号 + 换行 → 空格, 方便正则匹配)
    text = text.replace(/[，,]/g, ' ').replace(/\n/g, ' ')

    // 3) 顺序提取 (移除匹配后剩余文本)
    const idCard = extractFirst(text, idCardRegex)
    text = idCard.rest
    const phone = extractFirst(text, phoneRegex)
    text = phone.rest
    const license = extractFirst(text, licensePlateRegex)
    text = license.rest
    const gLicense = extractFirst(text, gLicensePlateRegex)
    text = gLicense.rest
    const name = extractFirst(text, nameRegex)
    text = name.rest

    let str = ''
    if (license.match) str += `车号:${license.match}\n`
    if (gLicense.match) str += `挂车号:${gLicense.match}\n`
    if (name.match) str += `司机姓名:${name.match}\n`
    if (idCard.match) str += `身份证号码:${idCard.match}\n`
    if (phone.match) str += `电话:${phone.match}\n`
    return str || '未匹配到信息'
  }, [origData, filterText])

  // 同步到 state (仅用于 copy 按钮等外部可读)
  useEffect(() => {
    setFormatAddress(output)
  }, [output])

  const onCopy = async () => {
    if (!formatAddress || formatAddress === '未匹配到信息') return
    try {
      await navigator.clipboard.writeText(formatAddress)
    } catch {
      // 浏览器禁用 clipboard API 时静默失败
    }
  }

  const onReset = () => {
    setOrigData(SAMPLE_TEXT)
    setFilterText(DEFAULT_FILTER)
  }

  const onClear = () => {
    setOrigData('')
  }

  return (
    <div className="page-wei bg-glass-mesh">
      <main className="page-wei-content">
        <GlassCard variant="dark" padding="xl" className="page-wei-card">
          <header className="page-wei-card-header">
            <div className="page-wei-card-mark">W</div>
            <div className="page-wei-card-title">
              <span className="page-wei-card-title-main">格式化地址工具</span>
              <span className="page-wei-card-title-sub">FORMAT ADDRESS · INTERNAL</span>
            </div>
            <div className="page-wei-card-meta">
              百事服内部 · CRC 辅助
            </div>
          </header>

          <Form
            layout="vertical"
            className="page-wei-form"
            initialValues={{ origData: SAMPLE_TEXT, filterText: loadFilter() }}
          >
            <Form.Item
              label="需要格式化的文档"
              name="origData"
              valuePropName="value"
              getValueFromEvent={(e: any) => e?.target?.value}
            >
              <Input.TextArea
                autoSize={{ minRows: 10 }}
                placeholder="粘贴需要提取的文本 (车号 / 挂车 / 司机 / 身份证 / 电话)"
                value={origData}
                onChange={(e) => setOrigData(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="需要过滤的文字"
              name="filterText"
              extra="过滤文档中匹配的文字,以 | 分隔 (存 localStorage 自动记忆)"
            >
              <Input.TextArea
                autoSize={{ minRows: 3 }}
                placeholder="例如: 车号|挂车|电话|身份证"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </Form.Item>

            <Form.Item label="已格式化的文档">
              <Input.TextArea
                className="page-wei-form-output"
                value={formatAddress}
                readOnly
                autoSize={{ minRows: 10 }}
              />
            </Form.Item>

            <div className="page-wei-form-actions">
              <Button variant="primary" onClick={onCopy}>
                复制结果
              </Button>
              <Button variant="default" onClick={onReset}>
                重置示例
              </Button>
              <Button variant="ghost" onClick={onClear}>
                清空输入
              </Button>
            </div>
          </Form>

          <footer className="page-wei-card-footer">
            <span>提取顺序: 车号 → 挂车 → 姓名 → 身份证 → 电话</span>
            <span>filterText 自动保存到 localStorage</span>
          </footer>
        </GlassCard>
      </main>
    </div>
  )
}

export default Wei
