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
        ├── node/           # /admin/node/...（设备管理，11 个页面）
        │   ├── protocols/page.tsx
        │   ├── protocols/info/page.tsx          # 协议详情，含 9 tab（含 AI 修改 / Dry-run）
        │   ├── protocols/generate/page.tsx      # AI 生成（PR-2 / 2026-07-17 整合自 /admin/ai/generate）
        │   ├── devmodel/page.tsx
        │   ├── nodes/page.tsx
        │   ├── terminal/page.tsx
        │   ├── terminal/[mac]/page.tsx
        │   ├── terminal/devline/page.tsx
        │   ├── terminal/health/page.tsx
        │   ├── user/page.tsx
        │   └── user/info/page.tsx
        ├── log/            # /admin/log/...（日志管理，12 个页面）
        ├── wx/             # /admin/wx/...（微信管理，2 个页面）
        └── data/           # /admin/data/...（数据管理，4 个页面）
```

## AI 域整合（2026-07-17 · PR #44 + #45）

AI 工具 3 个页面（chat / dry-run / generate）全部归并到「协议」域，**`/admin/ai/*` 不再有任何 page.tsx**。5 个老 URL 通过 `next.config.ts` `redirects()` 永久重定向（Next.js 实际返 308，语义跟 301 一致：永久 + 保留 method）：

| 老 URL | 新 URL | 备注 |
|---|---|---|
| `/admin/ai` | `/admin/node/protocols/generate` | 索引页 → 生成 |
| `/admin/ai/generate` | `/admin/node/protocols/generate` | 1:1 整页迁移 |
| `/admin/ai/chat` | `/admin/node/protocols` | chat 列表 → 协议列表（先选协议） |
| `/admin/ai/chat/:name` | `/admin/node/protocols/info?Protocol=:name&tab=aiChat` | 直接进协议详情 AI 修改 tab |
| `/admin/ai/dry-run` | `/admin/node/protocols` | dry-run 列表 → 协议列表（dry-run 需绑协议） |

**新 tab 顺序**（协议详情页 info，9 tab）：

1. 采集指令 · 2. 操作指令 · 3. 常量配置 · 4. 显示参数 · 5. 阈值配置 · 6. 状态配置 · 7. AI 推断 · 8. **AI 修改（NEW）** · 9. **Dry-run（NEW）**

**新增组件**（`components/protocol/*`）：
- `ProtocolAiChatTab`：AI 修改 tab 容器（chat 流式编辑协议）
- `ProtocolAiDryRunTab`：Dry-run tab 容器（参数化 dry-run + 3 KPI）

**AI 域共享组件**（`components/ai/*`）：`AiWorkspace` / `ChatPane` / `ProtocolPreviewForm` / `StatsPane`。详见 `docs/components.md` §3.7。

**菜单**：「AI 工具」group 已删，`生成` 入口移到「协议」group 下，指向 `/admin/node/protocols/generate`。

**踩坑 (PR #45)**：`ProtocolAiChatTab` 写时在 ChatPane 外层塞了 `<Input + 发送按钮>`（inputFormNode），跟 ChatPane 底部内置 Sender 形成双 input，且 `onSubmit={() => undefined}` 是 no-op 导致下面那个 Sender 永远点不动。修法：删 inputFormNode，`onSubmit={submitChat}`。详见 `docs/components.md` §5.3.1。

---

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
  - `components/ResultDataParse.tsx` "查看历史记录" 链接 → `/admin/node/terminal/devline`
  - `components/TerminalRunData.tsx` 管理员侧 "查看历史记录" 链接 → `/admin/node/terminal/devline`
- **删除**：`app/(admin)/root/` 整个目录
- **保留**：`app/(admin)/rootmain.css` 仍被 `(admin)/layout.tsx` 引用，**文件名带 root 是历史遗留**，改文件名需要同步 import 路径，等下次清理时一起处理

## 菜单/页面一致性（2026-06）

之前 menu 配置跟 page.tsx 存在不一致（admin 登录点某些菜单项 404，某些真实页面藏在菜单外）。已修复：

- **删除死链菜单**（v3 初始化就没创建过对应 page.tsx）：`/admin/wx/materials`、`/admin/data/result`、`/admin/data/result-collection`
- **补充遗漏菜单**：基础数据加 `终端运行数据`（`/admin/node/terminal/devline`）；日志记录加 `告警日志/邮件日志/短信日志`（`/admin/log/alarm|mail|sms`）
- **清空 2 个空目录**：`app/(admin)/admin/log/logins/`、`app/(admin)/admin/log/request/`（没有 page.tsx）

## 菜单清理（2026-06）

下架 5 个不再使用的 admin 端功能：

| 路径 | 删的内容 | 说明 |
|---|---|---|
| `/admin/node/terminal/devline` | 菜单项 | 页面 + 2 个组件的"查看历史记录"入口保留（被 `ResultDataParse` / `TerminalRunData` 引用） |
| `/admin/log/dataclean` | 页面 + 菜单项 + `lib/api/fetchRoot.logdataclean` | 无业务入口，仅侧边栏可达 |
| `/admin/log/wxevent` | 页面 + 菜单项 + `lib/api/fetchRoot.log_wxEvent` | 无业务入口，仅侧边栏可达 |
| `/admin/log/innermessage` | 页面 + 菜单项 + `lib/api/fetchRoot.loginnerMessages` | 无业务入口，仅侧边栏可达 |
| `/admin/log/bull` | 页面 + 菜单项 + `lib/api/fetchRoot.logbulls` | 无业务入口，仅侧边栏可达 |

**为什么只删 4 个日志页的 API 而 devline 保留入口**：`devline` 页面被 2 个组件的"查看历史记录"图标实际使用（功能仍有用），只是把侧边栏的菜单项拿掉。`Log` / `DesList` / `TerminalMountDevNameLine` / `getColumnSearchProp` 等共享资源**未触碰**——其它日志页（alarm/mail/sms/wxsubscribe）还在用。

**端点路径**（4 个 fetchRoot 端点）只删前端封装，后端 `/api/v2/admin/*` 路由**不删**（由 `uart-server` 仓库管，不在 v3 范围内）。后端如果想下架，要走 `server-controllers/*.ts` + uart-server 配套。

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
| `/admin` | `app/(admin)/admin/page.tsx` |
| `/admin/node/Protocols` | `app/(admin)/admin/node/protocols/page.tsx` |
| `/admin/log/alarm` | `app/(admin)/admin/log/alarm/page.tsx` |
