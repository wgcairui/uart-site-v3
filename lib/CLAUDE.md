# CLAUDE.md — lib/ 工具库目录

## 目录结构

```
lib/
├── api/
│   ├── fetch.ts        # 用户端 API 封装（迁移自 src/common/Fetch.ts）
│   └── fetchRoot.ts    # 管理员端 API 封装（迁移自 src/common/FecthRoot.ts）
├── hooks/
│   ├── useToken.ts     # Token 管理 Hook
│   ├── useNav.ts       # 路由导航 Hook
│   ├── useTerminalData.ts
│   └── usePromise.ts
├── store/
│   └── userStore.ts    # Zustand 全局状态（替代原 Redux store）
├── socket.ts           # Socket.IO 客户端单例
└── utils/
    ├── token.ts        # Cookie token 工具函数
    ├── util.ts         # 通用工具函数
    ├── devImgSource.ts # 设备图片映射
    ├── tableCommon.tsx # 表格公共配置
    └── prompt.tsx      # 提示框封装
```

## lib/api/ — API 请求层

### 核心原则
- 所有 API 调用统一通过这两个文件，**不要在组件中直接使用 `fetch`**
- API 函数是 Promise，在 `'use client'` 组件的 `useEffect` 中调用
- 响应格式统一为 `universalResult<T>`：`{ code, data, message, status }`

### fetch.ts（用户端）

```ts
// 基础方法
Get<T>(path: string, data?: object): Promise<universalResult<T>>
Post<T>(path: string, data: object): Promise<universalResult<T>>
Put<T>(path: string, data: object): Promise<universalResult<T>>
Del<T>(path: string, data?: object): Promise<universalResult<T>>
```

**与旧版的差异**：
- 旧版从 `localStorage.getItem('token')` 获取 token
- 新版从 Cookie 获取（`document.cookie` 或服务端 `cookies()` 函数）
- 403 响应处理：跳转登录使用 `router.push('/login')` 而非 `window.location`

### fetchRoot.ts（管理员端）

管理员 API 额外鉴权（管理员 token 验证），其余与 fetch.ts 相同。

## lib/store/ — Zustand 状态

### userStore.ts

```ts
import { useUserStore } from '@/lib/store/userStore'

// 类型
interface UserStore {
  user: Partial<Uart.UserInfo>
  terminals: Uart.Terminal[]
  setUser: (user: Partial<Uart.UserInfo>) => void
  setTerminals: (terminals: Uart.Terminal[]) => void
}

// 在组件中使用
const user = useUserStore(s => s.user)
const { setUser, setTerminals } = useUserStore()

// 在组件外使用（如 API 回调、工具函数）
useUserStore.getState().setUser(userData)
```

**与旧版 Redux 对照**：
| Redux | Zustand |
|---|---|
| `useSelector(s => s.User.user)` | `useUserStore(s => s.user)` |
| `useSelector(s => s.User.terminals)` | `useUserStore(s => s.terminals)` |
| `dispatch(setUser(data))` | `useUserStore.getState().setUser(data)` |
| `dispatch(setTerminals(data))` | `useUserStore.getState().setTerminals(data)` |
| `<Provider store={store}>` | 无需 Provider |

## lib/socket.ts — Socket.IO

### 使用方式

```ts
import { socketClient, subscribeEvent, unSubscribeEvent } from '@/lib/socket'

// 在组件 useEffect 中连接
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
- 支持事件：`info`、`alarm`、`message`、`registerSuccess`

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

所有 hooks 都需要 `'use client'` 环境（因为使用了 React hooks）。

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

## lib/utils/ — 工具函数

### token.ts（新增）
统一管理 Cookie token：

```ts
import { getToken, setToken, clearToken } from '@/lib/utils/token'

getToken()           // 读取 cookie 中的 token
setToken('xxx')      // 设置 token cookie（HttpOnly 可选）
clearToken()         // 清除 token，用于登出
```

### util.ts
通用工具函数，直接从旧项目迁移，无特殊 Next.js 适配需求。

### prompt.tsx
Ant Design Message/Modal 的封装。注意：Ant Design v5 中 `message` 使用方式不变，但需要确保在 Client Component 中调用。
