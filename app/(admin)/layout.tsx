'use client'
import React, { useMemo } from "react"
import { Layout, Menu } from "antd"
import "./rootmain.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserDropDown } from "@/components/userDropDown"
import { AbsButton } from "@/components/absButton"

interface navi {
  title: string
  ico: string;
  child: {
    to: string
    text: string;
    ico?: string;
  }[]
}

/**
 * root页面通用布局
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {

  const nav: navi[] =
    [{
      title: "基础数据",
      ico: "el-icon-menu",
      child: [
        {
          to: "/admin/node/protocols",
          text: "协议",
        },
        {
          to: "/admin/node/devmodel",
          text: "设备类型",
        },
        {
          to: "/admin/node/nodes",
          text: "节点",
        },
        {
          to: "/admin/node/terminal",
          text: "终端",
          ico: "\uEB63",
        },
        {
          to: "/admin/node/user",
          text: "用户",
          ico: "\uEB6f",
        }
      ],
    },
    {
      title: "微信数据",
      ico: "el-icon-chat-round",
      child: [
        {
          to: "/admin/wx/users",
          text: "公众号用户",
          ico: "\uEB64",
        },
        {
          to: "/admin/wx/materials",
          text: "素材列表",
          ico: "\uEB6f",
        },
      ],
    },
    {
      title: '设备数据',
      ico: "el-icon-coin",
      child: [
        {
          to: "/admin/data/result",
          text: "单例数据",
          ico: "\uEB64",
        },
        {
          to: "/admin/data/result-collection",
          text: "解析数据",
          ico: "\uEB64",
        },
        {
          to: "/admin/data/redis",
          text: "redis",
          ico: "\uEB64",
        },
        {
          to: "/admin/data/oss",
          text: "OSS",
          ico: "\uEB64",
        },
      ],
    },
    {
      title: "日志记录",
      ico: "el-icon-coin",
      child: [
        
        {
          to: "/admin/log/dataclean",
          text: "数据清洗日志",
          ico: "\uEB8c",
        },
        {
          to: "/admin/log/wxevent",
          text: "微信推送事件日志",
          ico: "\uEB8c",
        },
        {
          to: "/admin/log/wxsubscribe",
          text: "微信告警事件日志",
          ico: "\uEB8c",
        },
        {
          to: "/admin/log/innermessage",
          text: "站内信",
          ico: "\uEB8c",
        },
        {
          to: "/admin/log/bull",
          text: "bull队列",
          ico: "\uEB8c",
        },
      ]
    }]

  const pathname = usePathname()

  const path = useMemo(() => {
    const pathName = pathname.replace(/^\//, '').split("/")
    return pathName
  }, [pathname])

  const menuItems = useMemo(() => {
    return nav.map(el => ({
      key: el.title,
      label: el.title,
      children: el.child.map(child => ({
        key: child.text + el.title,
        label: <Link href={child.to}>{child.text}</Link>,
      }))
    }))
  }, [nav])

  const titles = useMemo(() => {
    return nav.map(el => el.title)
  }, [nav])

  return (
    <Layout className="layout" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Layout.Sider width={200} className="site-layout-background" style={{ backgroundColor: "#011529", marginRight: 24, overflow: "auto" }}>
        <div style={{ padding: 12 }}>
          <Link href="/admin">
            <h2 color="#fff" style={{ color: "#fff" }}>百事服管理后台</h2>
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          style={{ borderRight: 0 }}
          defaultOpenKeys={["基础数据"]}
          items={menuItems}
        />
      </Layout.Sider>
      <Layout style={{ flex: 1, height: "100%", overflow: "hidden", display: 'flex', flexDirection: 'column' }}>
        <section style={{ alignItems: 'center', display: "flex", padding: '0 24px', flexShrink: 0, minHeight: '64px' }}>
          <div style={{ margin: '16px 0' }}>
            {path.map((el, i) => <span key={el + i}>{i > 0 ? ' / ' : ''}{el}</span>)}
          </div>
          <span style={{ marginLeft: 'auto' }}>
            <UserDropDown />
          </span>
        </section>
        <div className="content" style={{ overflow: "auto", flex: 1, marginBottom: 24 }}>
          {children}
        </div>
        <AbsButton>
          <Menu
            mode="inline"
            style={{ borderRight: 0 }}
            openKeys={titles}
            items={menuItems}
          />
        </AbsButton>
      </Layout>
    </Layout>
  )
}
