'use client'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'antd'
import { ColumnsType } from 'antd/lib/table'
import { RcFile } from 'antd/lib/upload'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { CopyFilled, DeleteFilled, UploadOutlined } from '@ant-design/icons'
import {
  getProtocols,
  modifyProtocolRemark,
  setProtocol,
  updateProtocol,
} from '@/lib/api/fetchRoot'
import { getProtocol, getProtocolSetup } from '@/lib/api/fetch'
import { prompt } from '@/lib/utils/prompt'
import { generateTableKey } from '@/lib/utils/tableCommon'
import { MyInput } from '@/components/common/MyInput'
import { PageHeader } from '@/components/common/PageHeader'
import { ProtocolAlarmStat } from '@/components/protocol/ProtocolAlarmStat'
import { ProtocolContant } from '@/components/protocol/ProtocolContant'
import { ProtocolOprate } from '@/components/protocol/ProtocolOprate'
import { ProtocolShowTag } from '@/components/protocol/ProtocolShowTag'
import { ProtocolThreshold } from '@/components/protocol/ProtocolThreshold'
import { ProtocolInstructForm } from '@/components/protocol/ProtocolInstructForm'
import { UnitStatePreviewFromUnit } from '@/components/protocol/UnitStatePreview'
import { usePromise } from '@/lib/hooks/usePromise'
import { AiSourceInfoCard } from '@/components/ai/AiSourceInfoCard'
import { ProtocolSourceTag } from '@/components/protocol/ProtocolSourceTag'
import { ProtocolAiInferred } from '@/components/protocol/ProtocolAiInferred'

interface props {
  Protocol: string
}

/**
 * 协议详情
 */
const ProtocolDes: React.FC<props> = ({ Protocol }) => {
  const [instructs, setInstruct] = useState<Uart.protocolInstruct[]>([])

  const { data, loading, fecth } = usePromise(async () => {
    const { data } = await getProtocol(Protocol)
    return data
  })

  const { data: protocolInstructs } = usePromise(async () => {
    const { data } = await getProtocols()
    return (data.items || (data as any))
      .flatMap((i: any) => i.instruct || [])
      .flatMap((i: any) => i.formResize || [])
  }, [])

  const protocolItemFun = useCallback(
    (name: string) => {
      if (!protocolInstructs) return undefined
      return protocolInstructs
        .filter((el: any) => el?.name?.includes(name))
        .sort((a: any, b: any) => a.name.length - b.name.length)[0] as Uart.protocolInstructFormrize | undefined
    },
    [protocolInstructs],
  )

  useEffect(() => {
    if (data && data.instruct) {
      setInstruct(data.instruct)
    }
  }, [data])

  const remark = (val: string) => {
    modifyProtocolRemark(data.Protocol, val).then(() => {
      fecth()
      message.success('remark update')
    })
  }

  const addInstruct = () => {
    prompt({
      title: '输入指令字符',
      onOk(value) {
        if (value) {
          if (instructs.some((el) => el.name === value)) {
            Modal.info({ content: '指令字符重复' })
          } else {
            modifyInstruct({
              name: value,
              resultType: 'hex',
              shift: false,
              shiftNum: 0,
              pop: false,
              popNum: 0,
              isSplit: false,
              resize: '',
              formResize: [],
              isUse: true,
              noStandard: false,
              scriptStart: '',
              scriptEnd: '',
            })
          }
        }
      },
    })
  }

  const saveProtocol = () => {
    const loading = message.loading('加载中...')
    setProtocol(data.Type, data.ProtocolType, data.Protocol, instructs).then(() => {
      loading()
      message.success('ok')
      fecth()
    })
  }

  const modifyInstruct = (item: Uart.protocolInstruct) => {
    const index = instructs.findIndex((el) => el.name === item.name)
    if (index !== -1) {
      instructs.splice(index, 1, item)
    } else {
      instructs.unshift(item)
    }
    setInstruct([...instructs])
  }

  const deleteInstruct = (name: string) => {
    Modal.confirm({
      content: `确认删除指令:${name}?`,
      onOk() {
        const index = instructs.findIndex((el) => el.name === name)
        if (index !== -1) {
          instructs.splice(index, 1)
          setInstruct([...instructs])
        }
      },
    })
  }

  const copyInstruct = (re: Uart.protocolInstruct) => {
    prompt({
      title: '新的指令名称',
      onOk(val) {
        if (val) {
          setInstruct([{ ...re, name: val }, ...instructs])
        }
      },
    })
  }

  return loading ? (
    <Spin />
  ) : !data ? (
    <Empty description="未能加载协议详情" />
  ) : (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button size="small" type="primary" onClick={addInstruct}>
          添加指令
        </Button>
        <Button size="small" type="primary" onClick={saveProtocol}>
          保存协议
        </Button>
      </Space>
      {data.instruct && (
        <Table
          dataSource={generateTableKey(instructs, 'name')}
          pagination={false}
          size="small"
          columns={
            [
              { dataIndex: 'name', title: '名称' },
              { dataIndex: 'isUse', title: '启用', render: (val) => <Tag color={val ? 'blue' : 'red'}>{val ? '是' : '否'}</Tag> },
              { dataIndex: 'noStandard', title: '非标', render: (val) => <Tag color={val ? 'red' : 'blue'}>{val ? '是' : '否'}</Tag> },
              { dataIndex: 'resultType', title: '转换器' },
              { dataIndex: 'shift', title: '去头', render: (val, re) => (val ? '是/' + re.shiftNum : '否') },
              { dataIndex: 'pop', title: '去尾', render: (val, re) => (val ? '是/' + re.popNum : '否') },
              { dataIndex: 'remark', title: '备注' },
              { key: 'len', title: '参数数', render: (_, val) => val.formResize.length },
              {
                key: 'oprate',
                title: '操作',
                render: (_, re) => (
                  <Space>
                    <CopyFilled onClick={() => copyInstruct(re)} />
                    <DeleteFilled onClick={() => deleteInstruct(re.name)} />
                  </Space>
                ),
              },
            ] as ColumnsType<Uart.protocolInstruct>
          }
          expandable={{
            expandedRowRender: (re) => (
              <ProtocolInstructForm
                protocolItemFun={protocolItemFun}
                item={re}
                onChange={modifyInstruct}
              />
            ),
          }}
        />
      )}
    </>
  )
}

/**
 * 协议详情（只读，来自本地协议文件）
 */
const ProtocolDesLocal: React.FC<{ Protocol: Uart.protocol }> = ({ Protocol }) => {
  const data = Protocol
  return (
    <>
      <Descriptions>
        <Descriptions.Item label="名称">{data.Protocol}</Descriptions.Item>
        <Descriptions.Item label="类型">{data.Type}</Descriptions.Item>
        <Descriptions.Item label="设备类型">{data.ProtocolType}</Descriptions.Item>
        <Descriptions.Item label="备注" span={3}>
          <AiSourceInfoCard remark={data.remark} />
          {data.remark}
        </Descriptions.Item>
      </Descriptions>
      {data.instruct && (
        <Table
          dataSource={generateTableKey(data.instruct, 'name')}
          pagination={false}
          size="small"
          columns={
            [
              { dataIndex: 'name', title: '名称' },
              { dataIndex: 'isUse', title: '启用', render: (val) => <Tag color={val ? 'blue' : 'red'}>{val ? '是' : '否'}</Tag> },
              { dataIndex: 'noStandard', title: '非标', render: (val) => <Tag color={val ? 'red' : 'blue'}>{val ? '是' : '否'}</Tag> },
              { dataIndex: 'resultType', title: '转换器' },
              { dataIndex: 'shift', title: '去头', render: (val, re) => (val ? '是/' + re.shiftNum : '否') },
              { dataIndex: 'pop', title: '去尾', render: (val, re) => (val ? '是/' + re.popNum : '否') },
              { dataIndex: 'remark', title: '备注' },
              { key: 'len', title: '参数数', render: (_, val) => val.formResize.length },
            ] as ColumnsType<Uart.protocolInstruct>
          }
          expandable={{
            expandedRowRender: (re) =>
              re.formResize && (
                <Table
                  dataSource={generateTableKey(re.formResize, 'name')}
                  columns={
                    [
                      { key: 'id', title: 'ID', render: (_, __, i) => ++i },
                      { dataIndex: 'name', title: 'name' },
                      { dataIndex: 'regx', title: 'regx' },
                      { dataIndex: 'bl', title: '系数' },
                      { dataIndex: 'unit', title: '单位' },
                      {
                        key: 'state',
                        title: '状态值映射',
                        render: (_, fr: Uart.protocolInstructFormrize) =>
                          fr?.isState ? <UnitStatePreviewFromUnit unit={fr.unit || ''} /> : <span style={{ color: '#ccc' }}>—</span>,
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

/**
 * 从本地 JSON 文件更新协议 (Modal 触发版, T2 改造)
 *
 * 之前: 作为 tab 渲染 (跟协议本身无关, 占用 tab 槽位)
 * 现在: 作为 Modal, 由 PageHeader extra 「上传本地 JSON」按钮唤出
 */
const ProtocolUploadModal: React.FC<props & { open: boolean; onClose: () => void }> = ({
  Protocol: protocolName,
  open,
  onClose,
}) => {
  const [protocol, setProtocol] = useState<Uart.protocol>()

  const upfile = (file: RcFile) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = (event) => {
      const [result] = JSON.parse(event.target?.result as string) as Uart.protocol[]
      if (typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'Protocol')) {
        if (result.Protocol === protocolName) {
          setProtocol(result)
        } else {
          message.warning('协议名称不一致')
        }
      } else {
        message.error('协议文件出错')
      }
    }
    return false
  }

  const updateP = () => {
    Modal.confirm({
      content: '确定使用本地文件配置更新云端协议配置吗?',
      onOk() {
        const loading = message.loading('更新中...')
        updateProtocol(protocol!).then(() => {
          loading()
          Modal.info({ content: '更新完成,更新页面查看最新的协议配置' })
          // 更新成功后关闭 modal + 刷新
          setProtocol(undefined)
          onClose()
        })
      },
    })
  }

  return (
    <Modal
      title={`上传本地 JSON 更新协议: ${protocolName}`}
      open={open}
      onCancel={() => {
        setProtocol(undefined)
        onClose()
      }}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Upload beforeUpload={upfile}>
          <Button icon={<UploadOutlined />}>选择本地 JSON 文件</Button>
        </Upload>
        {protocol && (
          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" onClick={updateP}>
                更新协议
              </Button>
              <Button onClick={() => setProtocol(undefined)}>清除</Button>
            </Space>
            <ProtocolDesLocal Protocol={protocol} />
          </Card>
        )}
      </Space>
    </Modal>
  )
}

const ProtocolInfo: React.FC = () => {
  const query = useSearchParams()
  const router = useRouter()
  // 决策 23b（2026-06-28）：兼容历史 URL 参数名（admin 列表用 Protocol，AI 路径曾误用 name）
  // 防御性：如果 Protocol 没拿到，fallback 到 name，同时 console.warn 提醒调用方改用 Protocol
  const protocolParam = query.get('Protocol') ?? query.get('name')
  if (typeof window !== 'undefined' && !query.get('Protocol') && query.get('name')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[protocols/info] URL 参数 "name" 已废弃, 请改用 "Protocol" (跟 admin 列表 + info page 对齐)',
    )
  }
  const Protocol = protocolParam

  // 决策 23（2026-06-28）：顶层拿 protocol data 给 PageHeader 用 source Tag
  // ProtocolDes 内部会再拉一次（loading 期间 PageHeader 已显示协议名）
  const { data: protocolMeta } = usePromise<Uart.protocol | undefined>(async () => {
    if (!Protocol) return undefined
    const { data } = await getProtocol(Protocol)
    return data
  }, undefined, [Protocol])

  // T2 改造: 「本地文件更新」改 Modal, 由 PageHeader extra 按钮唤出
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // T4 改造: 5 段 device.constants count (Tab 角标计数 + AI 推断 tab 数据源)
  const { data: counts } = usePromise<{
    OprateInstruct: number
    Constant: number
    ShowTag: number
    Threshold: number
    AlarmStat: number
  }>(async () => {
    const empty = { OprateInstruct: 0, Constant: 0, ShowTag: 0, Threshold: 0, AlarmStat: 0 }
    if (!Protocol) return empty
    const types = ['OprateInstruct', 'Constant', 'ShowTag', 'Threshold', 'AlarmStat'] as const
    const results = await Promise.all(
      types.map(async (t) => {
        try {
          const { data } = await getProtocolSetup<any>(Protocol, t as any)
          if (t === 'Constant') {
            return Object.keys(data.sys || {}).filter(k => k !== '_id').length
          }
          return Array.isArray(data.sys) ? data.sys.length : 0
        } catch {
          return 0
        }
      }),
    )
    return {
      OprateInstruct: results[0] ?? 0,
      Constant: results[1] ?? 0,
      ShowTag: results[2] ?? 0,
      Threshold: results[3] ?? 0,
      AlarmStat: results[4] ?? 0,
    }
  }, { OprateInstruct: 0, Constant: 0, ShowTag: 0, Threshold: 0, AlarmStat: 0 }, [Protocol])

  if (!Protocol) {
    return <Empty description="缺少协议参数 (Protocol)" />
  }

  return (
    <>
      <PageHeader
        title={
          <Space size={8} align="center">
            <span>{Protocol}</span>
            {protocolMeta && (
              <ProtocolSourceTag source={protocolMeta.source} remark={protocolMeta.remark} />
            )}
          </Space>
        }
        breadcrumb={[{ title: '协议管理', href: '/admin/node/protocols' }]}
        back
        onBack={() => router.push('/admin/node/protocols')}
        meta={
          protocolMeta ? (
            <>
              <div className="app-kv-cell">
                <span className="app-kv-label">类型</span>
                <span className="app-kv-value">{protocolMeta.Type || '—'}</span>
              </div>
              <div className="app-kv-cell">
                <span className="app-kv-label">设备类型</span>
                <span className="app-kv-value">{protocolMeta.ProtocolType || '—'}</span>
              </div>
              <div className="app-kv-cell">
                <span className="app-kv-label">版本</span>
                <span className="app-kv-value">v{protocolMeta.version ?? '—'}</span>
              </div>
              <div className="app-kv-cell">
                <span className="app-kv-label">最后修改</span>
                <span className="app-kv-value">
                  {protocolMeta.updatedAt
                    ? dayjs(protocolMeta.updatedAt).format('YYYY-MM-DD HH:mm')
                    : '—'}
                </span>
              </div>
              <div className="app-kv-cell">
                <span className="app-kv-label">来源</span>
                <span className="app-kv-value">
                  <ProtocolSourceTag source={protocolMeta.source} remark={protocolMeta.remark} />
                </span>
              </div>
              <div className="app-kv-cell">
                <span className="app-kv-label">已挂载终端</span>
                <span className="app-kv-value">— (TODO)</span>
              </div>
            </>
          ) : undefined
        }
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
              上传本地 JSON
            </Button>
          </Space>
        }
      />
      <Tabs
        items={[
          { key: 'info', label: `采集指令 (${protocolMeta?.instruct?.length ?? '—'})`, children: <ProtocolDes Protocol={Protocol} /> },
          { key: 'oprate', label: `操作指令 (${counts.OprateInstruct})`, children: <ProtocolOprate protocolName={Protocol} /> },
          { key: 'Constant', label: `常量配置 (${counts.Constant})`, children: <ProtocolContant protocolName={Protocol} /> },
          { key: 'show', label: `显示参数 (${counts.ShowTag})`, children: <ProtocolShowTag protocolName={Protocol} /> },
          { key: 'Threld', label: `阈值配置 (${counts.Threshold})`, children: <ProtocolThreshold protocolName={Protocol} /> },
          { key: 'stat', label: `状态配置 (${counts.AlarmStat})`, children: <ProtocolAlarmStat protocolName={Protocol} /> },
          { key: 'aiInferred', label: 'AI 推断', children: <ProtocolAiInferred protocolName={Protocol} /> },
        ]}
      />
      <ProtocolUploadModal
        Protocol={Protocol}
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Spin />}>
      <ProtocolInfo />
    </Suspense>
  )
}