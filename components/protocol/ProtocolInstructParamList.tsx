'use client'
import { Button, Card, Space } from 'antd'
import { useEffect, useState } from 'react'
// `Uart` 是 global namespace (types/uart.d.ts)，无需 import
import { ProtocolInstructParamInput } from '@/components/protocol/ProtocolInstructParamInput'

interface Props {
  protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined
  meta: Uart.protocolInstruct
  /** 协议指令参数集合 */
  formResize: Uart.protocolInstructFormrize[]
  /** 参数发生改变 */
  onChange: (items: Uart.protocolInstructFormrize[]) => void
}

/**
 * 协议指令参数列表
 * 增/删/改参数，每个参数用 ProtocolInstructParamInput
 */
export function ProtocolInstructParamList({ meta, formResize, onChange, protocolItemFun }: Props) {
  const [data, setData] = useState(formResize)

  useEffect(() => {
    setData([...formResize])
  }, [formResize])

  /** 修改某项参数（item = undefined 表示删除） */
  const modify = (index: number, item?: Uart.protocolInstructFormrize) => {
    if (item) data.splice(index, 1, item)
    else data.splice(index, 1)
    setData([...data])
    onChange(data)
    if (typeof window !== 'undefined') window.scrollBy(0, 1000)
  }

  /** 追加新参数（按上一条 regx 自动续编号） */
  const add = () => {
    const last = data[data.length - 1] || { regx: '0-1', unit: 'V', bl: '0.1' }
    const [start, len] = (last.regx || '0-0').split('-').map(Number)
    data.push({
      name: '未命名' + ((start || 0) + (len || 0)),
      regx: ((start || 0) + (len || 0)) + '-' + (len || 0),
      bl: last.bl,
      unit: last.unit,
      isState: false,
    })
    setData([...data])
    onChange(data)
  }

  return (
    <Card>
      <Space orientation="vertical">
        {data.map((el, i) => (
          <ProtocolInstructParamInput
            key={el.name + i}
            protocolItemFun={protocolItemFun}
            re={el}
            onChange={(item) => modify(i, item)}
          />
        ))}
        <Button type="primary" onClick={add}>
          添加参数
        </Button>
      </Space>
    </Card>
  )
}