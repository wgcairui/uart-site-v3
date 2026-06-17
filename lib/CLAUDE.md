# CLAUDE.md — lib/ 工具库目录

## 目录结构

```
lib/
├── api/
│   ├── fetch-impl.ts           # 底层 HTTP 封装（Get/Post/Put/Patch/Del/header）
│   ├── fetch.ts                # 用户端 API 桶（barrel re-export）
│   ├── fetchRoot.ts            # 管理员端 API 桶（barrel re-export）
│   └── endpoints/              # 按业务域拆分的具体 API
│       ├── auth.ts             # 登录/注册/密码重置/工具
│       ├── user.ts             # 用户端 User/Device/Alarm/Data/Protocol
│       ├── amap.ts             # 高德地图（外部 API）
│       └── admin/
│           ├── dashboard.ts    # Admin 仪表盘/统计
│           ├── users.ts        # Admin 用户管理
│           ├── terminals.ts    # Admin 终端管理
│           ├── protocols.ts    # Admin 协议/设备类型
│           ├── nodes.ts        # Admin 节点管理
│           ├── logs.ts         # Admin 日志
│           └── system.ts       # Admin Redis/OSS + IOT/Secrets(deprecated)
├── constants/
│   └── adminMenu.ts            # 管理员端菜单配置 + matchMenuKey 工具
├── hooks/
│   ├── useToken.ts             # Token 管理（Cookie + URL query）
│   ├── useNav.ts               # useRouter 包装，支持对象 query
│   ├── useTerminalData.ts
│   └── usePromise.ts           # 异步 loading/data/error 状态管理
├── store/
│   └── userStore.ts            # Zustand 全局状态（替代原 Redux）
├── socket.ts                   # Socket.IO 客户端单例
└── utils/
    ├── token.ts                # Cookie token 工具
    ├── util.ts                 # 通用工具
    ├── devImgSource.ts         # 设备图片映射
    ├── tableCommon.tsx         # 表格公共配置（generateTableKey、tableConfig）
    └── prompt.tsx              # 提示框封装
```

## lib/api/ — API 请求层

### 核心原则

- **底层**：`fetch-impl.ts` 提供纯 HTTP 封装，不依赖业务
- **业务**：每个端点一个函数，按业务域拆到 `endpoints/`
- **桶**：`fetch.ts` / `fetchRoot.ts` 是 barrel re-export，向后兼容老 import
- **新代码**推荐直接 `import { xxx } from '@/lib/api/endpoints/<domain>'`
- **老代码**继续从 `@/lib/api/fetch` 或 `@/lib/api/fetchRoot` 导入

### 端点路径

所有端点路径以 `/api/v2/` 开头，前端通过 `next.config.ts` rewrites 代理到后端 `https://uart.ladishb.com`：

| 前缀 | 用途 |
|---|---|
| `/api/v2/auth/*` | 登录认证 |
| `/api/v2/guest/*` | 游客操作（注册、重置密码） |
| `/api/v2/user/*` | 用户端 API（profile/devices/alarms/protocols/layouts/aggregations） |
| `/api/v2/admin/*` | 管理员端 API（users/terminals/protocols/dashboard/logs/system） |
| `/api/v2/open/*` | 开放工具（crc、amap gps 转换） |

### fetch-impl.ts 底层方法

```ts
Get<T>(path: string, data?: object): Promise<universalResult<T>>
Post<T>(path: string, data: object): Promise<universalResult<T>>
Put<T>(path: string, data: object): Promise<universalResult<T>>
Patch<T>(path: string, data: object): Promise<universalResult<T>>
Del<T>(path: string, data?: object): Promise<universalResult<T>>
```

**与旧版的差异**：
- 旧版从 `localStorage.getItem('token')` 获取 token
- 新版从 Cookie 获取（`document.cookie` 或服务端 `cookies()` 函数）
- 403 响应处理：弹 `message.error('操作没有权限')`（不跳转登录）

## lib/store/ — Zustand 状态

```ts
import { useUserStore } from '@/lib/store/userStore'

// 类型
interface UserStore {
  user: Partial<Uart.UserInfo>
  terminals: Uart.Terminal[]
  isSimulated: boolean
  setUser: (user: Partial<Uart.UserInfo>) => void
  setTerminals: (terminals: Uart.Terminal[]) => void
  setSimulated: (simulated: boolean) => void
}

// 在组件中使用
const user = useUserStore(s => s.user)
const { setUser, setTerminals } = useUserStore()

// 组件外修改（如 API 回调、工具函数）
useUserStore.getState().setUser(userData)
```

**与旧版 Redux 对照**：

| Redux | Zustand |
|---|---|
| `useSelector(s => s.User.user)` | `useUserStore(s => s.user)` |
| `dispatch(setUser(data))` | `useUserStore.getState().setUser(userData)` |
| `<Provider store={store}>` | 无需 Provider |

## lib/socket.ts — Socket.IO

### 使用方式

```tsx
useEffect(() => {
  socketClient.connect(user)

  const idx = subscribeEvent('alarm', (data) => {
    // 处理告警事件
  })

  return () => {
    unSubscribeEvent('alarm', idx)
  }
}, [user])
```

### 注意事项
- Socket.IO 是浏览器 API，**只能在 `'use client'` 组件中使用**
- 连接地址：`/client`（通过 `next.config.ts` rewrites 代理到后端）
- 支持事件：`info`、`alarm`、`message`、`registerSuccess`、`MacUpdate<mac>`

### Socket useEffect 正确模式

```tsx
// ✅ 依赖用户标识，不依赖整个 data 对象（避免引用变化触发无效断连重连）
useEffect(() => {
    if (!data?.user) return
    socketClient.connect(data.user)
    return () => socketClient.disConnect()
}, [data?.user])

// ❌ 错误：[data] 对象引用变化就触发 cleanup → 反复断连
useEffect(() => {
    if (data) socketClient.connect(data.user)
    return () => socketClient.disConnect()
}, [data])
```

## lib/hooks/ — 自定义 Hooks

所有 hooks 都需要 `'use client'` 环境。

### useToken.ts
从 Cookie 读取 token，处理 URL query 中的 token 参数（微信登录回调）。

```ts
const { token, isValid } = useToken()
```

### useNav.ts
包装 `useRouter`，支持对象形式的 query 参数。

```ts
const nav = useNav()
nav('/user/dev', { id: '123', tab: 'info' })
// 等价于 router.push('/user/dev?id=123&tab=info')
```

### usePromise.ts
管理 `useEffect` 中异步调用的 `loading` / `data` 状态。

```tsx
const { data, loading, fecth } = usePromise(async () => {
  const { data } = await getProtocols()
  return data
})
```

## lib/constants/adminMenu.ts

管理员端侧边栏菜单配置。集中维护方便 Sider / 移动端 / 面包屑复用。

```ts
import { ADMIN_MENU, matchMenuKey } from '@/lib/constants/adminMenu'

// 当前 pathname 命中的菜单项 key（用于 Sider 高亮）
const selected = matchMenuKey('/admin/node/terminal/devline')  // → 'terminal'（最长前缀匹配）
```

## lib/utils/ — 工具函数

### token.ts

```ts
import { getToken, setToken, clearToken, getAuthToken } from '@/lib/utils/token'

getToken()           // 读取 cookie 中的 token
setToken('xxx')      // 设置 token cookie
clearToken()         // 清除 token（退出登录时）
getAuthToken()       // 读取带 "Bearer " 前缀的 token（用于 API header）
```

**已知陷阱**：
- `getAuthToken()` 不能对 token 调用 `JSON.parse`——Cookie 存的是原始字符串
- 退出登录必须调用 `clearToken()`，仅清 localStorage 对 proxy.ts 无效

### util.ts
通用工具函数（直接从旧项目迁移）。

### prompt.tsx
Ant Design Message/Modal 的封装。注意：v5 中 `message` 使用方式不变，需在 Client Component 中调用。

### tableCommon.tsx
- `generateTableKey<T>(items, keyField)` — 给 Table dataSource 加 React key
- `tableConfig` — 通用 Table props 配置

## types/ — 全局类型

```
types/
├── index.d.ts          # 通用类型：universalResult、PaginationReq、V2ListResponse
└── uart.d.ts           # 全局 `Uart.*` 命名空间（domain models），用 declare global
```

**使用方式**：
```ts
// Uart 是 global namespace，无需 import
const user: Uart.UserInfo = { ... }

// 通用类型从 '@/types' 显式 import
import type { PaginationReq, V2ListResponse } from '@/types'
```

**已知陷阱**：
- ❌ `import type Uart from '@/types/uart'` —— uart.d.ts 不是 module，import 会报 TS2306
- ✅ 直接用 `Uart.UserInfo`（TS 自动识别 global namespace）