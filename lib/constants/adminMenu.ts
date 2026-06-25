// 管理员端菜单配置
// 集中维护方便 Sider / 移动端 / 面包屑等地方复用

import type { ReactNode } from 'react'

export interface AdminMenuItem {
  /** 唯一 key，用于 Menu 的 selectedKeys/openKeys */
  key: string
  /** 跳转目标路径 */
  to: string
  /** 显示文字 */
  text: string
  /** antd icon 节点或 unicode 字符（向后兼容旧版 ico 字段） */
  icon?: ReactNode
}

export interface AdminMenuGroup {
  /** 分组标题（一级菜单） */
  title: string
  /** antd icon 节点或 unicode 字符 */
  ico?: ReactNode | string
  /** 子项 */
  child: AdminMenuItem[]
}

export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    title: '基础数据',
    ico: 'el-icon-menu',
    child: [
      { key: 'protocols', to: '/admin/node/protocols', text: '协议' },
      { key: 'devmodel', to: '/admin/node/devmodel', text: '设备类型' },
      { key: 'nodes', to: '/admin/node/nodes', text: '节点' },
      { key: 'terminal', to: '/admin/node/terminal', text: '终端', icon: '' },
      { key: 'user', to: '/admin/node/user', text: '用户', icon: '' },
    ],
  },
  {
    title: '微信数据',
    ico: 'el-icon-chat-round',
    child: [
      { key: 'wx-users', to: '/admin/wx/users', text: '公众号用户', icon: '' },
    ],
  },
  {
    title: '设备数据',
    ico: 'el-icon-coin',
    child: [
      { key: 'redis', to: '/admin/data/redis', text: 'redis', icon: '' },
      { key: 'oss', to: '/admin/data/oss', text: 'OSS', icon: '' },
    ],
  },
{
    title: '日志记录',
    ico: 'el-icon-coin',
    child: [
      { key: 'log-alarm', to: '/admin/log/alarm', text: '告警日志', icon: '⚠' },
      { key: 'log-mail', to: '/admin/log/mail', text: '邮件日志', icon: '✉' },
      { key: 'log-sms', to: '/admin/log/sms', text: '短信日志', icon: '✉' },
      { key: 'log-wxsubscribe', to: '/admin/log/wxsubscribe', text: '微信告警事件日志', icon: '✉' },
      { key: 'log-server-errors', to: '/admin/log/server-errors', text: '服务端错误日志', icon: '⚠' },
    ],
  },
  {
    // 决策 16 + 19 + 20 / 2026-06-24：AI 协议生成器 admin 端入口
    title: 'AI 工具',
    ico: '⚡',
    child: [
      { key: 'ai-generate', to: '/admin/ai/generate', text: '生成新协议', icon: '⚡' },
      { key: 'ai-chat', to: '/admin/ai/chat', text: 'AI 修改协议', icon: '✎' },
      { key: 'ai-dry-run', to: '/admin/ai/dry-run', text: '协议 Dry-run', icon: '✓' },
    ],
  },
]

/** 默认展开的一级分组 key */
export const ADMIN_DEFAULT_OPEN_KEYS = ['基础数据']

/** 当前 pathname 命中的菜单项 key（用于高亮） */
export function matchMenuKey(pathname: string): string | undefined {
  const allItems = ADMIN_MENU.flatMap((g) => g.child)
  // 优先最长前缀匹配，避免 /admin/node/terminal/devline 命中 /admin/node/terminal
  const sorted = [...allItems].sort((a, b) => b.to.length - a.to.length)
  return sorted.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))?.key
}