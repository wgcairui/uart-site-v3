'use client'

/**
 * ProtocolDesLocal — 协议只读展示 (来自本地 JSON 文件)
 *
 * 来自原 page.tsx 内的 `ProtocolDesLocal` 组件 (line 222-279)。
 * 提取为单独 helper 组件供 UploadProtocolModal 复用。
 *
 * 视觉规范 (v2):
 * - `<KVList>` 替代 antd `<Descriptions>` (style-guide §0.2 反模式)
 * - `<Table>` 沿用 Bento 表样式 (globals.css 已注入)
 * - 状态字段用 `<StatusTag variant>` 替代 `<Tag color>` (待 PR-07 处理, 此处先保留)
 *
 * 决策:
 * - 是 read-only, 不挂任何 modal — 跟可编辑 ProtocolDes (采集指令 tab 内) 区分
 * - formResize 的 UnitStatePreview 逻辑保留原样
 */

import { Table } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import { KVList } from '@/components/common/KVList'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { UnitStatePreviewFromUnit } from '@/components/protocol/UnitStatePreview'
import { AiSourceInfoCard } from '@/components/ai/AiSourceInfoCard'

export function ProtocolDesLocal({ Protocol }: { Protocol: Uart.protocol }) {
  return (
    <>
      <KVList
        items={[
          { label: '名称', value: Protocol.Protocol },
          { label: '类型', value: Protocol.Type },
          { label: '设备类型', value: Protocol.ProtocolType },
          {
            label: '备注',
            value: (
              <>
                <AiSourceInfoCard remark={Protocol.remark} />
                {Protocol.remark ?? <span style={{ color: 'var(--ink-300)' }}>—</span>}
              </>
            ),
            span: 2,
          },
        ]}
      />
      {Protocol.instruct && (
        <Table
          dataSource={generateTableKey(Protocol.instruct, 'name')}
          pagination={false}
          size="small"
          style={{ marginTop: 16 }}
          columns={
            [
              { dataIndex: 'name', title: '名称' },
              {
                dataIndex: 'isUse',
                title: '启用',
                render: (val: boolean) => (val ? '是' : '否'),
              },
              {
                dataIndex: 'noStandard',
                title: '非标',
                render: (val: boolean) => (val ? '是' : '否'),
              },
              { dataIndex: 'resultType', title: '转换器' },
              {
                dataIndex: 'shift',
                title: '去头',
                render: (val: boolean, re: Uart.protocolInstruct) =>
                  val ? `是/${re.shiftNum}` : '否',
              },
              {
                dataIndex: 'pop',
                title: '去尾',
                render: (val: boolean, re: Uart.protocolInstruct) =>
                  val ? `是/${re.popNum}` : '否',
              },
              { dataIndex: 'remark', title: '备注' },
              {
                key: 'len',
                title: '参数数',
                render: (_: unknown, val: Uart.protocolInstruct) => val.formResize.length,
              },
            ] as ColumnsType<Uart.protocolInstruct>
          }
          expandable={{
            expandedRowRender: (re) =>
              re.formResize && (
                <Table
                  dataSource={generateTableKey(re.formResize, 'name')}
                  columns={
                    [
                      { key: 'id', title: 'ID', render: (_: unknown, __: unknown, i: number) => ++i },
                      { dataIndex: 'name', title: 'name' },
                      { dataIndex: 'regx', title: 'regx' },
                      { dataIndex: 'bl', title: '系数' },
                      { dataIndex: 'unit', title: '单位' },
                      {
                        key: 'state',
                        title: '状态值映射',
                        render: (_: unknown, fr: Uart.protocolInstructFormrize) =>
                          fr?.isState ? (
                            <UnitStatePreviewFromUnit unit={fr.unit || ''} />
                          ) : (
                            <span style={{ color: 'var(--ink-300)' }}>—</span>
                          ),
                      },
                    ] as ColumnsType<Uart.protocolInstructFormrize>
                  }
                />
              ),
          }}
        />
      )}
    </>
  )
}

export default ProtocolDesLocal
