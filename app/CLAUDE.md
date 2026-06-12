# CLAUDE.md — app/ 路由目录

## App Router 结构概述

Next.js App Router 使用**文件系统路由**，每个目录下的 `page.tsx` 是该路径的页面组件，`layout.tsx` 是该层级及所有子路由共享的布局。

## 路由结构

```
app/
├── layout.tsx              # Root Layout（所有页面共享，含 AntdProvider）
├── page.tsx                # / → redirect('/login')
├── login/
│   └── page.tsx            # /login（登录页，Server Component，SSR）
├── loginwx/
│   └── page.tsx            # /loginwx（微信登录，Client Component）
├── tool/
│   └── page.tsx            # /tool（工具页，Client Component）
├── wei/
│   └── page.tsx            # /wei（微信页，Client Component）
│
├── (user)/                 # 路由组：用户端（URL 中不含 "(user)"）
│   ├── layout.tsx          # 用户侧共享布局（侧边栏导航、鉴权检查）
│   └── main/               # ⚠️ 必须有此层，否则与 (admin)/admin/ 同解析到 /
│       ├── page.tsx        # /main（用户首页）
│       ├── alarm/page.tsx  # /main/alarm
│       ├── dev/[id]/page.tsx         # /main/dev/:id
│       ├── devline/[id]/page.tsx     # /main/devline/:id
│       ├── terminal/[id]/page.tsx    # /main/terminal/:id
│       ├── addterminal/page.tsx      # /main/addterminal
│       ├── userinfo/page.tsx         # /main/userinfo
│       ├── wxline/page.tsx           # /main/wxline
│       └── constant/page.tsx         # /main/constant
│
└── (admin)/                # 路由组：管理员端
    ├── layout.tsx          # 管理员侧共享布局
    ├── rootmain.css        # admin 布局样式（文件名带 root 是历史遗留，不要重命名除非配套 import 一起改）
    └── admin/              # ⚠️ 必须有此层
        ├── page.tsx        # /admin（管理员首页）
        ├── node/           # /admin/node/...（设备管理，10 个页面）
        │   ├── protocols/page.tsx
        │   ├── protocols/info/page.tsx
        │   ├── devmodel/page.tsx
        │   ├── nodes/page.tsx
        │   ├── terminal/page.tsx
        │   ├── terminal/[mac]/page.tsx
        │   ├── terminal/devline/page.tsx
        │   ├── terminal/register/page.tsx
        │   ├── user/page.tsx
        │   └── user/info/page.tsx
        ├── log/            # /admin/log/...（日志管理，12 个页面）
        ├── wx/             # /admin/wx/...（微信管理，2 个页面）
        └── data/           # /admin/data/...（数据管理，4 个页面）
```

## 渲染策略

| 路由 | 类型 | 原因 |
|---|---|---|
| `/login` | Server Component | 无客户端状态，SSR 提升首屏速度 |
| `(user)/layout.tsx` | Client Component | 含 Socket.IO 连接、Zustand 状态 |
| `(admin)/layout.tsx` | Client Component | 含鉴权检查、用户信息加载 |
| 数据/实时页面 | Client Component | 含 Socket 数据、交互操作 |
| 日志列表页 | 可做 Server Component | 可通过 fetch 直接获取初始数据 |

## 路由前缀统一（2026-06）

admin 端历史上混用 `/admin` 和 `/root` 两个前缀。已统一：

- **统一方向**：管理员端一律走 `/admin/...`（用户端 `/main/...` 不变）
- **孤岛迁移**：`/root/node/Terminal/info/[mac]` 已合并到 `/admin/node/terminal/[mac]`（用孤岛版覆盖，保留更全功能 + `?tab=` URL 同步 + 挂载设备内嵌二级 Tabs「详情/当前数据/历史数据」）
- **入口修复**：
  - `components/TerminalsTable.tsx` "查看" 按钮 → `/admin/node/terminal/{mac}`
  - `components/userDropDown.tsx` 下拉默认 `userPage` → `/main/userinfo`（之前是 `"/root/node/user/userInfo"` 这个路径根本不存在）
- **删除**：`app/(admin)/root/` 整个目录
- **保留**：`app/(admin)/rootmain.css` 仍被 `(admin)/layout.tsx` 引用，**文件名带 root 是历史遗留**，改文件名需要同步 import 路径，等下次清理时一起处理

## 路由组（Route Groups）说明

`(user)` 和 `(admin)` 是 Next.js **路由组**（括号包裹的目录名），URL 中**不包含**这个前缀。

⚠️ **同一个项目中两个路由组不能有同级 `page.tsx`**，否则都解析到 `/` 报冲突：
```
❌ (user)/page.tsx   → /   ← 冲突！
❌ (admin)/page.tsx  → /   ← 冲突！

✅ (user)/main/page.tsx   → /main
✅ (admin)/admin/page.tsx → /admin
```

实际 URL 前缀：用户端 `/main/...`，管理员端 `/admin/...`。
鉴权通过 `proxy.ts` 匹配 `/main` 和 `/admin` 路径。

## 动态路由

```tsx
// app/(user)/dev/[id]/page.tsx
export default function DevPage({ params }: { params: { id: string } }) {
  // params.id 是路由参数
}

// app/(admin)/node/terminal/[mac]/page.tsx
export default function TerminalInfoPage({ params }: { params: { mac: string } }) {
  // params.mac 是 MAC 地址
}
```

## 每个 page.tsx 的标准结构

```tsx
'use client'  // 如果需要客户端交互

import { useEffect, useState } from 'react'
import { useUserStore } from '@/lib/store/userStore'
import { Get } from '@/lib/api/fetch'

export default function SomePage() {
  const user = useUserStore(s => s.user)
  const [data, setData] = useState(null)

  useEffect(() => {
    Get('/api/v2/...').then(res => {
      if (res.code === 200) setData(res.data)
    })
  }, [])

  return <div>...</div>
}
```

## 旧项目路由对照

| 旧 React Router 路径 | 新 App Router 文件 |
|---|---|
| `/` | `app/login/page.tsx`（根重定向） |
| `/login` | `app/login/page.tsx` |
| `/loginwx` | `app/loginwx/page.tsx` |
| `/user` | `app/(user)/main/page.tsx` |
| `/user/alarm` | `app/(user)/main/alarm/page.tsx` |
| `/user/dev` | `app/(user)/main/dev/[id]/page.tsx` |
| `/root` | `app/(admin)/admin/page.tsx` |
| `/root/node/Protocols` | `app/(admin)/admin/node/protocols/page.tsx` |
| `/root/log/alarm` | `app/(admin)/admin/log/alarm/page.tsx` |
