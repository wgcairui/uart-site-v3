// 管理员端菜单配置
// 集中维护方便 Sider / 移动端 / 面包屑等地方复用

import type { ReactNode } from 'react'
import { IconFont } from '@/components/common/IconFont'
import { HeartFilled } from '@ant-design/icons'

export interface AdminMenuItem {
  /** 唯一 key，用于 Menu 的 selectedKeys/openKeys */
  key: string
  /** 跳转目标路径 */
  to: string
  /** 显示文字 */
  text: string
  /**
   * 图标节点。
   * 推荐用 `<IconFont type="icon-xxx" />`（从 aliCDN 字体库里选）；
   * 也兼容 emoji / unicode 字符（如 ⚠ ✉ ⚡）。
   * 为空时 AdminSider 会 fallback 到 '·'。
   */
  icon?: ReactNode
}

export interface AdminMenuGroup {
  /** 分组标题（一级菜单） */
  title: string
  /** 分组图标 */
  ico?: ReactNode | string
  /** 子项 */
  child: AdminMenuItem[]
}

export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    title: '基础数据',
    ico: <IconFont type="icon-jichuguanli" />,
    child: [
      { key: 'protocols', to: '/admin/node/protocols', text: '协议', icon: <IconFont type="icon-jichuguanli" /> },
      { key: 'devmodel', to: '/admin/node/devmodel', text: '设备类型', icon: <IconFont type="icon-fenzuguanli" /> },
      { key: 'nodes', to: '/admin/node/nodes', text: '节点', icon: <IconFont type="icon-shebeizhuangtai" /> },
      { key: 'terminal', to: '/admin/node/terminal', text: '终端', icon: <IconFont type="icon-shebeiguanli" /> },
      { key: 'terminal-health', to: '/admin/node/terminal/health', text: '设备健康度', icon: <HeartFilled style={{ color: '#ec4899' }} /> },
      { key: 'user', to: '/admin/node/user', text: '用户', icon: <IconFont type="icon-icon_zhanghao" /> },
    ],
  },
  {
    title: '微信数据',
    ico: <IconFont type="icon-renjijiaohu" />,
    child: [
      { key: 'wx-users', to: '/admin/wx/users', text: '公众号用户', icon: <IconFont type="icon-renjijiaohu" /> },
    ],
  },
  {
    title: '设备数据',
    ico: <IconFont type="icon-chucun" />,
    child: [
      { key: 'redis', to: '/admin/data/redis', text: 'redis', icon: <IconFont type="icon-chucun" /> },
      { key: 'oss', to: '/admin/data/oss', text: 'OSS', icon: <IconFont type="icon-yunduanshangchuan" /> },
    ],
  },
  {
    title: '日志记录',
    ico: <IconFont type="icon-xiaoxitongzhi" />,
    child: [
      { key: 'log-alarm', to: '/admin/log/alarm', text: '告警日志', icon: <IconFont type="icon-jinggao" /> },
      { key: 'log-mail', to: '/admin/log/mail', text: '邮件日志', icon: <IconFont type="icon-xiaoxitongzhi" /> },
      { key: 'log-sms', to: '/admin/log/sms', text: '短信日志', icon: <IconFont type="icon-xiaoxitongzhi" /> },
      { key: 'log-wxsubscribe', to: '/admin/log/wxsubscribe', text: '微信告警事件日志', icon: <IconFont type="icon-xiaoxitongzhi" /> },
      { key: 'log-server-errors', to: '/admin/log/server-errors', text: '服务端错误日志', icon: <IconFont type="icon-bug" /> },
    ],
  },
  {
    // 决策 16 + 19 + 20 / 2026-06-24：AI 协议生成器 admin 端入口
    // PR-1 (2026-07-17): ai-chat / ai-dry-run 已并入协议详情 tab, 暂时只留 ai-generate
    // PR-2 将进一步把 ai-generate 移到协议 group 下, 删除整个 "AI 工具" group
    title: 'AI 工具',
    ico: <IconFont type="icon-zhire" />,
    child: [
      { key: 'ai-generate', to: '/admin/ai/generate', text: '生成新协议', icon: <IconFont type="icon-zhire" /> },
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