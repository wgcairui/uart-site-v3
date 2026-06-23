@AGENTS.md

# CLAUDE.md — uart-site-v3 项目根

## 项目概述

**IoT 设备管理平台**，从旧版 `uart-site-v2`（Vite + React 17 SPA）迁移至 **Next.js 16.2**。

- **后端 API**：`https://uart.ladishb.com`（独立服务，前端通过 `next.config.ts` rewrites 代理）
- **实时通信**：Socket.IO（连接 `/client` 路径）
- **双端系统**：用户端 `(user)`、管理员端 `(admin)`

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2 + React 19 + TypeScript |
| 路由 | App Router（文件系统路由） |
| UI | Ant Design v5（CSS-in-JS，无需导入 CSS） |
| 状态管理 | Zustand（无 Provider，直接 hook 调用） |
| 实时通信 | Socket.IO client |
| 工具 | ahooks、dayjs、lodash、crypto-js |
| 地图 | @uiw/react-amap（高德地图） |

## 关键命令

```bash
bun run dev      # 开发（Turbopack，超快热重载）
bun run build    # 生产构建
bun run start    # 生产启动
bun run lint     # ESLint 检查
bun install      # 安装依赖（使用 bun.lock）
```

## TypeScript 验证

**正确方式**（IDE 可能显示大量误报，以下命令为准）：
```bash
node node_modules/.bin/tsc --noEmit --project tsconfig.json
```

**IDE 误报原因**：VS Code 内置旧版 TypeScript，不支持 `moduleResolution: "bundler"`。所有 "Cannot find module...Did you mean to set 'moduleResolution' to 'node'" 均为误报。

**一次性修复**：运行 `bun run dev` 生成 `.next/types/`，然后 VS Code 执行 `Cmd+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version"

## 项目结构

```
uart-site-v3/
├── app/                    # 路由页面（见 app/CLAUDE.md）
├── components/             # 共享组件（见 components/CLAUDE.md）
├── lib/                    # 工具库（见 lib/CLAUDE.md）
├── providers/              # React Providers（见 providers/CLAUDE.md）
├── types/                  # 全局类型定义
├── docs/                   # 文档（见 docs/CLAUDE.md）
│   ├── architecture.md      # 系统架构
│   ├── migration-guide.md   # v2 → v3 迁移
│   ├── style-guide.md       # 视觉规范（设计 token + 组件视觉规则）⚠️ 必读
│   └── components.md        # 组件库规范（props + 复用规则 + review 清单）⚠️ 必读
├── proxy.ts                 # 路由鉴权（Cookie token）— Next.js 16.2 新约定
└── next.config.ts           # API 代理配置
```

## 全局约定

### Ant Design v5 `items` Prop
- ⚠️ Tabs、Table、Form 等组件正在迁移到 `items` prop 替代 children
- 示例：`<Tabs items={[...]}>` 而非 `<Tabs><TabPane>...</TabPane></Tabs>`

### 动态路由
- 格式：`app/(admin)/admin/node/user/info/[user]/page.tsx`（对应 `/admin/node/user/info/:user`）
- 获取参数：`const { user } = useParams()`（需 `'use client'`）

### 登录后初始化
- ⚠️ 登录后必须调用 `useUserStore.getState().setUser(userData)` 才能让 Zustand store 生效
- 页面刷新后需在 `useEffect` 中重新从 API 获取用户数据并调用 `setUser`

### 'use client' 规则
- **Server Component（默认）**：无状态、无事件监听、无浏览器 API 的组件
- **Client Component（需加 `'use client'`）**：
  - 使用 `useState`、`useEffect`、`useRef` 等 hooks
  - 使用 Zustand store（`useUserStore`）
  - 使用 Socket.IO
  - 使用 Ant Design 交互组件（Button click、Form 等）
  - **规则**：如有疑问，加 `'use client'`；不要让 Server Component 导入 Client Component 的副作用

### 状态管理（Zustand）

```ts
import { useUserStore } from '@/lib/store/userStore'

// 读取状态（组件内）
const user = useUserStore(s => s.user)

// 修改状态（组件内或事件回调）
const setUser = useUserStore(s => s.setUser)
setUser(newUser)

// 组件外修改（如 API 回调）
useUserStore.getState().setUser(newUser)
```

### API 调用

```ts
// 用户端 API（lib/api/fetch.ts 是 barrel，按业务域拆到 lib/api/endpoints/）
import { Get, Post } from '@/lib/api/fetch'              // 底层 HTTP 封装
import { getProtocol, userInfo } from '@/lib/api/fetch'  // 具体业务 API（barrel re-export）
import { BindDev } from '@/lib/api/endpoints/user'       // 直接从 endpoints 导入

// 管理员端 API（lib/api/fetchRoot.ts 是 barrel）
import { runingState, nodes, setNode } from '@/lib/api/fetchRoot'

// 用法
const result = await Get<Uart.UserInfo>('/api/v2/user/profile')  // 裸 URL
const { data } = await getProtocol('modbus')                       // 业务封装
```

### Token 管理
- **存储**：Cookie（`token` key）—— 服务端 proxy 可读
- **读写**：`lib/utils/token.ts` 提供 `getToken()` / `setToken()` / `clearToken()`
- **鉴权**：`proxy.ts` 拦截 `/main` 和 `/admin` 路由，无 token 跳转 `/login`

**已知陷阱**：
- `getAuthToken()` 不能对 token 调用 `JSON.parse`——Cookie 存的是原始字符串（旧版 ahooks localStorage 才是 JSON 序列化的）
- 退出登录必须调用 `clearToken()`，仅清 localStorage 对 middleware 无效（middleware 只读 Cookie）
- 需要判断 token 是否存在时用 `getToken()`，不要手写 `document.cookie.includes('token=')`

### 路由跳转

```ts
// 组件内
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/user')

// Server Component 或 Server Action
import { redirect } from 'next/navigation'
redirect('/login')
```

## 迁移来源对照

| 旧 (uart-site-v2) | 新 (uart-site-v3) |
|---|---|
| `src/common/Fetch.ts` | `lib/api/fetch.ts` |
| `src/common/FecthRoot.ts` | `lib/api/fetchRoot.ts` |
| `src/common/socket.ts` | `lib/socket.ts` |
| `src/common/util.ts` | `lib/utils/` |
| `src/store/` (Redux) | `lib/store/userStore.ts` (Zustand) |
| `src/hook/` | `lib/hooks/` |
| `src/components/` | `components/` |
| `src/user/` | `app/(user)/` |
| `src/root/` | `app/(admin)/` |
| React Router | Next.js App Router |
| Ant Design v4 | Ant Design v5 |
| `vite.config.ts` proxy | `next.config.ts` rewrites |
| Express 静态服务 | Next.js 内置服务器 |

## 环境注意

- ⚠️ Vercel CLI 经常落后，每次部署前运行 `npm i -g vercel@latest` 或 `pnpm add -g vercel@latest`

## Next.js 16.2 特有约定

- ⚠️ **`proxy.ts` 而非 `middleware.ts`**：Next.js 16.2 废弃了 `middleware.ts`，改用 `proxy.ts`，且导出函数名必须为 `proxy`（不是 `middleware`）
- ⚠️ **路由组不能有同级 `page.tsx`**：`(user)/page.tsx` 和 `(admin)/page.tsx` 都解析到 `/` 会报冲突，必须在路由组内加一层真实路径（如 `main/`、`admin/`）
- **浏览器日志转终端**：`next.config.ts` 中 `logging.browserToTerminal: true` 将所有 `console.*` 转发到终端，调试无需开浏览器

## 常见问题

**Q：为什么加了 `'use client'` 还报 "React Server Component" 错误？**
A：检查是否有父级 Server Component 导入了这个 Client Component，且父级忘记加 `'use client'`。

**Q：Ant Design 组件样式没加载？**
A：确保 `app/layout.tsx` 中包裹了 `<AntdProvider>`（来自 `providers/AntdProvider.tsx`）。

**Q：Socket.IO 连接失败？**
A：检查 `next.config.ts` 中 `/client/:path*` 的 rewrites 配置，确保代理到 `https://uart.ladishb.com`。

**Q：`useUserStore` 返回初始空值？**
A：登录后需调用 `useUserStore.getState().setUser(userData)` 写入数据。store 在内存中，页面刷新后需重新从 API 获取（在布局组件的 `useEffect` 中初始化）。

## 页面设计规范

所有 admin/user 端列表页和详情页统一使用 **PageHeader + PageSummary + 内容** 三段式。

### PageHeader（统一页面头）

`@/components/common/PageHeader`

```tsx
<PageHeader
  title="协议管理"                          // 必填，h2 显示
  breadcrumb={[                              // 可选，面包屑
    { title: '首页', href: '/main' },
    { title: '协议', href: '/admin/node/protocols' },
  ]}
  extra={<Button type="primary">添加协议</Button>}  // 右上角操作区
  back                                          // 可选，显示返回按钮（默认 router.back()）
/>
```

- 替代旧版 `<h2>{title}</h2>` + `<Breadcrumb>` + `<Divider plain>标题 / {total}</Divider>` 等风格
- `breadcrumb[].title` 必须是 string（不支持 ReactNode，避免类型推导复杂化）
- `back` 按钮会调 `router.back()`，可传 `onBack` 覆盖

### PageSummary（统一汇总卡）

`@/components/common/PageSummary`

```tsx
<PageSummary
  items={[
    { label: '协议总数', value: pagination.total, variant: 'primary' },
    { label: '7天活跃', value: 17, variant: 'success' },
    { label: '未处理告警', value: 12, variant: 'danger' },
    {
      label: 'UPS', value: 5, variant: 'info',
      active: statFilter.includes('ups'),                       // 多选叠加高亮
      onClick: () => toggleStatFilter('ups'),                   // 触发筛选
    },
  ]}
/>
```

**PageSummaryItem 字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `label` | string | 标签文字 |
| `value` | ReactNode | 主数值 |
| `variant` | `primary \| success \| warning \| danger \| info \| purple` | 语义色（推荐）|
| `color` | string | 自定义 hex（优先级高于 variant）|
| `extra` | ReactNode | 副标签（如"昨日新增 +12"）|
| `active` | boolean | 选中态（多选叠加筛选时高亮）|
| `onClick` | () => void | 点击回调，启用 hover 效果 |

**多选叠加筛选模式**（admin 列表页推荐）：

```tsx
const [statFilter, setStatFilter] = useState<string[]>([])
const apiQuery: PaginationReq = {
  ...query,
  filters: { ...(query.filters || {}), ...(statFilter.length ? { Type: statFilter } : {}) },
}
// items.onClick: toggle 加入/移除 statFilter
```

**已知陷阱**：
- `breadcrumb[].title` 不支持 ReactNode — 如果要 icon，写纯文字"首页"
- `Space` 组件 v5 用 `orientation` 不用 `direction`（已修）
- antd Table `pagination.current/pageSize` 用 `?? 1` fallback（exactOptionalPropertyTypes 不接受 undefined）

### 三段式完整模板

```tsx
export default function MyListPage() {
  const [query, setQuery] = useState<PaginationReq>({ page: 1, pageSize: 20 })
  const [statFilter, setStatFilter] = useState<string[]>([])
  const apiQuery = { ...query, filters: { Type: statFilter } }

  const { data, loading, fecth } = usePromise<V2ListResponse<T>>(...)
  const items = data?.items ?? []
  const pagination = data?.pagination ?? { total: 0 }

  return (
    <>
      <PageHeader
        title="页面标题"
        extra={<Button type="primary" onClick={...}>操作</Button>}
      />
      <PageSummary
        items={[
          { label: '总数', value: pagination.total, variant: 'primary' },
          { label: '类型A', value: 5, variant: 'info',
            active: statFilter.includes('A'),
            onClick: () => setStatFilter(toggle('A')) },
        ]}
      />
      <Table
        dataSource={items}
        loading={loading}
        pagination={{
          current: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          total: pagination.total,
          showTotal: t => `共 ${t} 条`,
          showSizeChanger: true,
        }}
        onChange={...}
      />
    </>
  )
}
```

### user 端 vs admin 端差异

- **admin 端**（`/admin/...`）：后台管理，重点是表格 + 汇总 + 增删改
- **user 端**（`/main/...`）：用户端，重点是 DevCard 网格 + KPI 概览
- 共用同一套 PageHeader/PageSummary，但页面布局差异（admin 用 Table，user 用 Card 网格）
- 试用模式（无真实 user 数据）下，user 端 API 返回 403，所有防御性 ?? 兜底必须做好

### 防御性 ?? 模式

```tsx
// ✅ 试用模式 + 鉴权失败都能渲染
const data = items ?? []
const pagination = data?.pagination ?? { total: 0 }
const alarms = Array.isArray(rawAlarms) ? rawAlarms : []

// ❌ 直接读会崩
const items = data.items
const alarms = await getAlarm(...)
```
