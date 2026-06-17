'use client'
import {
  Checkbox,
  Form,
  Input,
  InputNumber,
  message,
  Select,
} from 'antd'
import { useState } from 'react'
// `Uart` 是 global namespace (types/uart.d.ts)，无需 import
import { ProtocolInstructParamList } from '@/components/protocol/ProtocolInstructParamList'

interface Props {
  item: Uart.protocolInstruct
  onChange: (item: Uart.protocolInstruct) => void
  protocolItemFun: (name: string) => Uart.protocolInstructFormrize | undefined
}

/**
 * 协议指令修改表单
 * - 备注/结果集/启用/非标协议
 * - 前处理脚本/后校验脚本
 * - 去头/去尾/分隔符
 * - 解析（参数列表用 ProtocolInstructParamList 渲染）
 *
 * 改动监听通过 onValuesChange + onChange 回调向上抛
 */
export function ProtocolInstructForm({ item, onChange, protocolItemFun }: Props) {
  const [form] = Form.useForm<Uart.protocolInstruct>()
  const [formResize, setFormResize] = useState(item.formResize)

  const scriptStartBat = `const content = ('AA' + pid.toString(16).padStart(2, '0') + instruct).replace(/\s*/g, '');
    const num = 255 - (Buffer.from(content, 'hex').toJSON().data.reduce((pre, cur) => pre + cur))
    const crc = Buffer.allocUnsafe(2)
    crc.writeInt16BE(num, 0)
    return content + crc.slice(1, 2).toString('hex').padStart(2, '0')`

  /** form 字段变化：合并 formResize 并回调 */
  const handleChange = (value: Partial<Uart.protocolInstruct>, current: Uart.protocolInstruct) => {
    if (Object.prototype.hasOwnProperty.call(value, 'resize') && value.resize) {
      const split = value.resize.replace(/(\n)/g, '').split('&').filter((el) => el !== '')
      const resize1 = split.map((el) => el.split('+'))
      const formResizes = resize1.map(
        (el) =>
          ({
            name: el[0]?.replace(/(\n)/g, '') || '',
            regx: el[1],
            bl: el[2] || '1',
            unit: el[3] || '',
            isState: /(^{.*}$)/.test(el[3] || ''),
          } as Uart.protocolInstructFormrize),
      )
      setFormResize([...formResizes])
    }
    finish({ ...current, formResize })
  }

  /** 参数列表改动：同步回 form.resize 字符串 + finish */
  const handleParamListChange = (items: Uart.protocolInstructFormrize[]) => {
    const str = items.map((el) => [el.name, el.regx, el.bl, el.unit].join('+')).join('&\n')
    form.setFieldsValue({ resize: str, formResize: items })
    finish(form.getFieldsValue())
  }

  /** 提交（实际是 onChange 抛上去，由父组件决定是否 setProtocol） */
  const finish = (value: Uart.protocolInstruct) => {
    value.formResize = value.formResize.map((el) => {
      el.isState = /^{.*}$/.test(el.unit || '')
      return el
    })
    value.remark = value.remark || ''
    onChange(value)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
    message.success({ content: '保存指令更改', key: 'saveInstruct' })
  }

  return (
    <Form
      initialValues={item}
      labelCol={{ span: 3 }}
      size="small"
      onValuesChange={handleChange}
      form={form}
      onFinish={finish}
    >
      <Form.Item name="name" label="name" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input />
      </Form.Item>
      <Form.Item name="resultType" label="结果集" extra="hex:数据解析为Uint,utf8:数据解析为字符,bit:数据解析为2进制,">
        <Select>
          {['utf8', 'hex', 'float', 'short', 'bit2'].map((el) => (
            <Select.Option value={el} key={el}>
              {el}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="isUse" label="启用" valuePropName="checked">
        <Checkbox />
      </Form.Item>
      <Form.Item name="noStandard" label="非标协议" valuePropName="checked" extra="非标准modbus协议">
        <Checkbox />
      </Form.Item>
      <Form.Item
        name="scriptStart"
        label="前处理脚本"
        extra="默认参数有两个,为设备pid as string和指令名称instruct as string,格式为:function(pid,instruct){},不编写默认以标准modbus处理"
      >
        <Input.TextArea autoSize placeholder={scriptStartBat} />
      </Form.Item>
      <Form.Item
        name="scriptStart"
        label="后校验脚本"
        extra="默认参数有两个,为content as string指令和arr as Array<number>结果,使用Buffer.from()转换为buffer,编写脚本校验buffer，返回Boolen，格式:function(content,arr){}"
      >
        <Input.TextArea autoSize placeholder="" />
      </Form.Item>
      <Form.Item name="shift" label="去头" valuePropName="checked" extra="处理结果buffer,删除buffer前n个字符,根据协议而定,标准modbus一般删除前置3个字节">
        <Checkbox />
      </Form.Item>
      <Form.Item name="shiftNum" label="去头数">
        <InputNumber />
      </Form.Item>
      <Form.Item name="pop" label="去尾" valuePropName="checked" extra="处理结果buffer,删除buffer后n个字符,根据协议而定,标准modbus一般删除后置2个字节">
        <Checkbox />
      </Form.Item>
      <Form.Item name="popNum" label="去尾数">
        <InputNumber />
      </Form.Item>
      <Form.Item name="isSplit" label="有分隔符" valuePropName="checked" extra="针对232协议,232有时会把状态读取为连接的二进制字符串,选择无分隔符可以解析,一般以空格符为分隔符">
        <Checkbox />
      </Form.Item>
      <Form.Item name="splitStr" label="分隔符" extra="针对232协议,232有时会把状态读取为连接的二进制字符串,选择无分隔符可以解析,一般以空格符/逗号为分隔符">
        <Select
          options={[
            { label: '空格', value: ' ' },
            { label: '逗号', value: ',' },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="resize"
        label="解析"
        extra="格式為:工作电压+1-2+1+(V|{A:离线,B:在线}),加&分隔符,第一位为参数名称,第二位1-2为从地址第一位开始读取两位长度数据,第三位为系数,获取的值乘系数为实际值,如果结果不是十进制,输入函数:(a,a/2-20)第四位为单位或者解析对象"
        rules={[
          {
            validator: (_, val: string) => {
              const err: string[] = []
              const res = val.split('&')
              res.forEach((el) => {
                const resize1 = el.split('+')
                if (resize1.length > 0 && resize1.length !== 4) {
                  err.push(el + '(参数不全)')
                  return
                }
                const { regx, bl, unit } = {
                  name: resize1[0]?.replace(/(\n)/g, '') || '',
                  regx: resize1[1],
                  bl: resize1[2] || '1',
                  unit: resize1[3] || '',
                  isState: /(^{.*}$)/.test(resize1[3] || ''),
                } as Uart.protocolInstructFormrize
                if (!resize1[1] || !/^[0-9]+\-[0-9]+$/.test(resize1[1])) {
                  err.push(el + '(分隔符错误)')
                }
                if (!resize1[2] || (!/^\(.*\)$/.test(resize1[2]) && Number.isNaN(Number(resize1[2])))) {
                  err.push(el + '(系数错误)')
                }
                if (!resize1[3] || (/^{/.test(resize1[3]) && !/}$/.test(resize1[3]))) {
                  err.push(el + '(单位括号错误)')
                }
              })
              return err.length === 0 ? Promise.resolve() : Promise.reject(new Error(err.join(';')))
            },
          },
        ]}
      >
        <Input.TextArea autoSize />
      </Form.Item>
      <Form.Item name="formResize" hidden>
        <Input />
      </Form.Item>
      <Form.Item wrapperCol={{ offset: 3, span: 16 }}>
        <button type="submit" style={{ display: 'none' }} />
      </Form.Item>
      <ProtocolInstructParamList
        protocolItemFun={protocolItemFun}
        meta={item}
        formResize={formResize}
        onChange={handleParamListChange}
      />
    </Form>
  )
}