'use client'
/**
 * admin 报警日志页 (P2-4 · 2026-07-12)
 *
 * 视觉:
 * - 桌面 (>= 768px) 走共享 Log 组件 → 5 列 Table + Pies 概览
 * - 移动 (< 768px) 走 .alarm-mobile-cards 卡片视图, 时间用 dayjs.fromNow() 相对时间
 *   (5 列 Table 在 mobile 视口被挤压、msg 截断、时间列竖排)
 *
 * 移动端数据流独立于 Log 组件: 直接调 loguartterminaldatatransfinites + usePromise
 * (Log 组件不可拆, 不动它以免影响其他 6 个调用方)
 */

import { Button, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { ReloadOutlined } from '@ant-design/icons'
import React, { useEffect, useState } from 'react'

import { Log } from '@/components/log/log'
import { loguartterminaldatatransfinites } from '@/lib/api/fetchRoot'
import { getColumnSearchProp, generateTableKey } from '@/lib/utils/tableCommon'
import { usePromise } from '@/lib/hooks/usePromise'
import { MyDatePickerRange } from '@/components/common/MyDatePickerRange'
import { PageHeader } from '@/components/common/PageHeader'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// ─── 移动端卡片视图 ─────────────────────────────────────────────────────────

const MobileAlarmCards: React.FC = () => {
  const [date, setDate] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])

  const { data, loading, fecth } = usePromise<Uart.uartAlarmObject[]>(
    async () => {
      const { data } = await loguartterminaldatatransfinites(
        date[0].format(),
        date[1].format(),
      )
      let items = Array.isArray(data) ? data : data?.items ?? []
      // 防御性兜底: 试用模式 / 鉴权失败可能返空
      return Array.isArray(items) ? items : []
    },
    [] as Uart.uartAlarmObject[],
    [date],
  )

  const items = data ?? []

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <MyDatePickerRange
          lastDay={30}
          onChange={setDate}
        >
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => fecth()}
          >
            刷新
          </Button>
        </MyDatePickerRange>
      </div>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <div className="alarm-mobile-cards" data-testid="alarm-mobile-cards">
          {generateTableKey(items as any, '_id').map((item: any) => {
            const ts = item.timeStamp
            const d = ts ? dayjs(ts) : null
            const relative = d ? d.fromNow() : '—'
            return (
              <div key={item._id ?? `${item.mac}-${ts}-${item.pid}`} className="alarm-mobile-card">
                <div className="alarm-mobile-card-header">
                  <span className="alarm-mac">{item.mac || '—'}</span>
                  <span className="alarm-mobile-card-time" title={d ? d.format('YYYY-MM-DD HH:mm:ss') : ''}>
                    {relative}
                  </span>
                </div>
                <div className="alarm-mobile-card-body">
                  <div className="kv">
                    <span>设备</span>
                    <span>{item.devName || '—'}</span>
                  </div>
                  <div className="kv">
                    <span>协议 / PID</span>
                    <span>
                      {item.protocol || '—'} / {item.pid ?? '—'}
                    </span>
                  </div>
                  <div className="kv">
                    <span>状态</span>
                    <span>
                      {item.isOk ? (
                        <Tag color="success">已恢复</Tag>
                      ) : (
                        <Tag color="error">告警中</Tag>
                      )}
                    </span>
                  </div>
                  {item.tag && (
                    <div className="alarm-mobile-card-tags">
                      <Tag color="purple">{item.tag}</Tag>
                    </div>
                  )}
                </div>
                {item.msg && (
                  <div className="alarm-mobile-card-msg">{item.msg}</div>
                )}
              </div>
            )
          })}
          {items.length === 0 && !loading && (
            <div className="alarm-mobile-empty">暂无告警记录</div>
          )}
        </div>
      )}
    </>
  )
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────

export const LogAlarm: React.FC = () => {
  // 移动端 detection: < 768px 走 cards 视图, 桌面走 Table (共享 Log 组件)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (isMobile) {
    return (
      <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
        <PageHeader
          title="告警日志"
          subtitle="查看设备告警事件历史记录"
          breadcrumb={[
            { title: '首页', href: '/admin' },
            { title: '日志' },
          ]}
        />
        <MobileAlarmCards />
      </div>
    )
  }

  return (
    <div className="bg-bento-canvas" style={{ position: 'relative', zIndex: 0 }}>
      <PageHeader
        title="告警日志"
        subtitle="查看设备告警事件历史记录"
        breadcrumb={[
          { title: '首页', href: '/admin' },
          { title: '日志' },
        ]}
      />
      <Log
        lastDay={30}
        dataFun={loguartterminaldatatransfinites}
        cPie={['tag']}
        columns={[
          { dataIndex: 'mac', title: 'MAC 地址', ...getColumnSearchProp('mac') },
          { dataIndex: 'pid', title: 'PID' },
          { dataIndex: 'tag', title: '标签', ...getColumnSearchProp('tag') },
          { dataIndex: 'msg', title: '消息', ellipsis: true },
          {
            dataIndex: 'timeStamp',
            title: '时间',
            defaultSortOrder: 'descend',
            sorter: (a: any, b: any) => a.timeStamp - b.timeStamp,
          },
        ]}
      />
    </div>
  )
}

export default LogAlarm
