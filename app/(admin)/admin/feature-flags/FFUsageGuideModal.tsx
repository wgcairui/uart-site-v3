'use client'
/**
 * Feature Flag 使用说明弹窗 (2026-07-21)
 *
 * 4 段说明:
 *  1. 什么是 Feature Flag
 *  2. 预置 vs 自定义
 *  3. 字段说明
 *  4. 注意事项 (kill switch / device override)
 *
 * 触发方式: PageHeader 右上角「使用说明」按钮
 */

import { Modal, Tag, Typography } from 'antd'
import React from 'react'

const { Title, Paragraph, Text } = Typography

interface FFUsageGuideModalProps {
  open: boolean
  onClose: () => void
}

export const FFUsageGuideModal: React.FC<FFUsageGuideModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      title="📖 特性开关使用说明"
      width={720}
      okText="知道了"
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 8 }}>
        {/* 1. 什么是 FF */}
        <Title level={5} style={{ marginTop: 0 }}>1. 什么是 Feature Flag?</Title>
        <Paragraph style={{ color: '#475569', lineHeight: 1.7 }}>
          特性开关 (Feature Flag) 是<strong>运行时可远程配置</strong>的开关, 用于控制代码中的行为分支,
          无需发版即可启用/关闭某项功能. 核心价值:
        </Paragraph>
        <ul style={{ color: '#475569', lineHeight: 1.8, paddingLeft: 20 }}>
          <li><strong>灰度发布</strong>: 新功能先对部分设备/用户开放, 验证后再全量</li>
          <li><strong>紧急熔断</strong>: 发现问题时秒级关闭, 不依赖发版</li>
          <li><strong>实验对比</strong>: 不同设备拿不同配置, 观察行为差异</li>
        </ul>

        {/* 2. 预置 vs 自定义 */}
        <Title level={5}>2. 预置 vs 自定义</Title>
        <Paragraph style={{ color: '#475569', lineHeight: 1.7 }}>
          当前平台已有 <Tag color="blue" style={{ marginRight: 4 }}>2 项预置</Tag>:
        </Paragraph>
        <ul style={{ color: '#475569', lineHeight: 1.8, paddingLeft: 20, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
          <li><Text code>alert.dispatch.mode</Text> — 告警发送模式 (auto / manual / delayed_auto)</li>
          <li><Text code>alert.dispatch.kill_switch</Text> — 告警全局熔断 (boolean)</li>
        </ul>
        <Paragraph style={{ color: '#475569', lineHeight: 1.7 }}>
          <strong>自定义开关</strong>: 任何 <Text code>key</Text> (建议 <Text code>模块.功能.动作</Text> 命名, 如
          <Text code>ui.new_dashboard</Text> / <Text code>protocol.strict_mode</Text>), 由代码端读取,
          通过本平台远程修改值. 创建后, 后端会立即生效, 不需要重启.
        </Paragraph>

        {/* 3. 字段说明 */}
        <Title level={5}>3. 字段说明</Title>
        <table style={{ width: '100%', fontSize: 12, color: '#475569', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>字段</th>
              <th style={{ padding: '6px 8px' }}>说明</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['key', '全局唯一, 创建后不可改. 建议命名: 模块.功能.动作 (小写 + . -)'],
              ['type', 'string / number / boolean. 决定默认值控件类型. 创建后不可改'],
              ['defaultValue', '当没有设备覆盖时, 所有设备拿到的默认值'],
              ['enabled', '关闭后, 评估器返回 undefined, 代码端拿到 falsy'],
              ['killSwitch', '高危开关. 开启后, 评估器返回拦截态, 代码端需显式处理'],
              ['killSwitchReason', '开启 kill switch 时必填, 审计用'],
              ['perDeviceOverrides', '按 MAC 强制覆盖. 优先级: override > default'],
              ['recipients', '通知接收方 (email / sms / feishu_bot), 留空不通知'],
              ['severityDurationMap', '仅告警相关 FF 使用. 0ms=立即, 300000ms=5分钟延时'],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{k}</td>
                <td style={{ padding: '6px 8px', lineHeight: 1.6 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. 注意事项 */}
        <Title level={5}>4. 注意事项</Title>
        <div style={{
          padding: 12, background: '#fef2f2', borderRadius: 8,
          border: '1px solid #fecaca', fontSize: 12, color: '#991b1b', lineHeight: 1.7, marginBottom: 12,
        }}>
          ⚠️ <strong>kill switch</strong> 是高危操作, 开启后所有依赖此 FF 的代码路径会进入拦截态.
          系统恢复后请及时关闭, 否则用户/设备会持续处于异常态.
        </div>
        <div style={{
          padding: 12, background: '#fffbeb', borderRadius: 8,
          border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.7, marginBottom: 12,
        }}>
          💡 <strong>设备覆盖</strong>会绕过默认值. 如果配置错误 (如 MAC 写错), 影响范围会被锁定在该设备.
          配置前请确认 MAC 格式正确 (12 字符 hex).
        </div>
        <div style={{
          padding: 12, background: '#eff6ff', borderRadius: 8,
          border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af', lineHeight: 1.7,
        }}>
          🛠️ <strong>软删</strong> (列表中删除按钮) 不会真删, 只是把 enabled 设为 false. 评估器返回 undefined,
          代码端需要兼容. 软删的 FF 仍可恢复 (编辑 + 重新启用).
        </div>
      </div>
    </Modal>
  )
}
