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
├── docs/                   # 架构文档
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
import { Get, Post } from '@/lib/api/fetch'
import { GetRoot, PostRoot } from '@/lib/api/fetchRoot'

// 用户端 API
const result = await Get<Uart.UserInfo>('/api/v2/user/profile')

// 管理员端 API
const result = await GetRoot<Stats>('/api/v2/admin/data/stats')
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
