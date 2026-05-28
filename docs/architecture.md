# 架构设计文档

## 系统概览

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器                                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  登录/公共页  │  │   用户端页面  │  │   管理员端页面    │  │
│  │  Server RSC  │  │ 'use client' │  │  'use client'    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  Next.js 16.2 服务器    │                                    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │           next.config.ts rewrites 代理               │    │
│  │   /api/* → https://uart.ladishb.com/api/*           │    │
│  │   /client/* → https://uart.ladishb.com/client/*     │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │                middleware.ts                         │    │
│  │  - 检查 Cookie token                                │    │
│  │  - 未登录重定向 /login                               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼───────────────────────────────────┐
│            后端服务 (uart.ladishb.com)                        │
│                                                              │
│   REST API        Socket.IO         静态资源                  │
│   /api/v2/*       /client (ws)      图片/文件                 │
└─────────────────────────────────────────────────────────────┘
```

## 数据流

### 登录流程

```
1. 用户访问任意受保护路由
2. middleware.ts 检查 Cookie token → 无 token → redirect('/login')
3. 用户填写登录表单
4. 前端 POST /api/v2/guest/login → 后端返回 token
5. 前端调用 setToken(token) → 写入 Cookie
6. 前端调用 useUserStore.getState().setUser(userData)
7. 前端 router.push('/') → 进入用户首页
```

### 实时数据流（Socket.IO）

```
1. 用户/管理员布局组件 useEffect 中：
   socketClient.connect(user)

2. 后端推送事件：
   - 'alarm': 告警通知
   - 'info': 设备状态更新
   - 'message': 系统消息
   - 'registerSuccess': 终端注册成功

3. 前端 subscribeEvent('alarm', callback)
4. 组件卸载时 unSubscribeEvent('alarm', index)
```

### API 请求流

```
组件 useEffect
  → lib/api/fetch.ts (Get/Post/Put/Del)
    → fetch('/api/v2/...') + Authorization: Bearer <token>
      → Next.js rewrites
        → https://uart.ladishb.com/api/v2/...
          → 返回 universalResult<T>
  → 更新 useState 或 Zustand store
```

## 模块划分

### 渲染责任边界

```
Server Components（SSR）：
├── app/layout.tsx          (Root Layout 骨架)
├── app/login/page.tsx      (登录页初始 HTML)
└── app/page.tsx            (根重定向)

Client Components（CSR）：
├── providers/AntdProvider.tsx   (Ant Design SSR)
├── app/(user)/layout.tsx        (用户侧布局 + Socket 连接)
├── app/(admin)/layout.tsx       (管理员侧布局)
└── app/**/**/page.tsx           (所有业务页面)
```

### 状态管理

```
Zustand userStore（全局，持久至页面刷新）：
├── user: Uart.UserInfo       ← 登录后写入
└── terminals: Uart.Terminal[] ← 登录后写入

本地 useState（组件级，仅当前组件）：
├── 列表数据（分页、搜索结果）
├── 表单状态
├── 加载状态
└── 弹窗开关
```

## 鉴权架构

```
两层鉴权：

1. middleware.ts（服务端）
   - 检查 Cookie 中的 token 是否存在
   - 无 token → 重定向 /login
   - 有 token → 放行（不验证有效性，由 API 返回 403 处理）

2. API 403 响应处理（客户端）
   - lib/api/fetch.ts 检测 403
   - 清除 token Cookie
   - router.push('/login')
```

## 部署架构

```
Docker 容器：
  ├── 基础镜像：node:20-alpine
  ├── 端口：3000
  ├── 构建：npm run build
  └── 运行：npm start（Next.js standalone 服务器）

环境变量（.env.local / Docker env）：
  └── BACKEND_URL=https://uart.ladishb.com（可选，默认硬编码在 next.config.ts）
```
