# 迁移指南：uart-site-v2 → uart-site-v3

## 旧项目技术栈

- **构建工具**：Vite 3.1.6
- **框架**：React 17.0.0
- **路由**：React Router v6.4.2
- **状态管理**：Redux Toolkit
- **UI**：Ant Design v4.23.4
- **静态服务器**：Express（仅用于托管 dist/）
- **TypeScript**：4.5.2

## 新项目技术栈

- **框架**：Next.js 16.2.1（内含 React 19.2.4）
- **路由**：App Router
- **状态管理**：Zustand
- **UI**：Ant Design v5
- **TypeScript**：5.x（随 Next.js 升级）

---

## 文件迁移对照表

### 核心基础设施

| 旧文件 | 新文件 | 改动说明 |
|---|---|---|
| `src/common/Fetch.ts` | `lib/api/fetch.ts` | Token 从 cookie 读取，403 跳转用 router |
| `src/common/FecthRoot.ts` | `lib/api/fetchRoot.ts` | 同上 |
| `src/common/socket.ts` | `lib/socket.ts` | 直接迁移，加文件头注释仅浏览器使用 |
| `src/common/util.ts` | `lib/utils/util.ts` | 直接迁移 |
| `src/common/devImgSource.ts` | `lib/utils/devImgSource.ts` | 直接迁移 |
| `src/common/tableCommon.tsx` | `lib/utils/tableCommon.tsx` | 加 'use client' |
| `src/common/prompt.tsx` | `lib/utils/prompt.tsx` | 加 'use client' |
| `src/store/index.ts` | 删除 | 改用 Zustand |
| `src/store/user.ts` | `lib/store/userStore.ts` | 重写为 Zustand create() |
| `src/hook/useToken.ts` | `lib/hooks/useToken.ts` | token 读写从 localStorage 改 cookie |
| `src/hook/useNav.ts` | `lib/hooks/useNav.ts` | useNavigate → useRouter |
| `src/hook/useTerminalData.ts` | `lib/hooks/useTerminalData.ts` | 直接迁移 |
| `src/hook/usePromise.ts` | `lib/hooks/usePromise.ts` | 直接迁移 |
| `src/typing.d.ts` | `types/index.d.ts` | 直接迁移 |

### 组件

| 旧文件 | 新文件 | 改动说明 |
|---|---|---|
| `src/components/*.tsx` | `components/*.tsx` | 加 `'use client'`，处理 antd v5 差异 |
| `src/components/*.css` | `components/*.css` | 直接迁移 |

### 页面（用户端）

| 旧文件 | 新文件 | 改动说明 |
|---|---|---|
| `src/user/UserMain.tsx` | `app/(user)/layout.tsx` | 改为 Next.js 布局 |
| `src/user/index.tsx` | `app/(user)/page.tsx` | 加 'use client' |
| `src/user/alarm.tsx` | `app/(user)/alarm/page.tsx` | 加 'use client' |
| `src/user/dev.tsx` | `app/(user)/dev/[id]/page.tsx` | 路由参数从 useParams → props.params |
| `src/user/devline.tsx` | `app/(user)/devline/[id]/page.tsx` | 同上 |
| `src/user/terminal.tsx` | `app/(user)/terminal/[id]/page.tsx` | 同上 |
| `src/user/addTerminal.tsx` | `app/(user)/addterminal/page.tsx` | 加 'use client' |
| `src/user/userInfo.tsx` | `app/(user)/userinfo/page.tsx` | 加 'use client' |
| `src/user/wxLine.tsx` | `app/(user)/wxline/page.tsx` | 加 'use client' |
| `src/user/constant.tsx` | `app/(user)/constant/page.tsx` | 加 'use client' |

### 页面（管理员端）

| 旧文件 | 新文件 | 改动说明 |
|---|---|---|
| `src/root/RootMain.tsx` | `app/(admin)/layout.tsx` | 改为 Next.js 布局 |
| `src/root/index.tsx` | `app/(admin)/page.tsx` | 加 'use client' |
| `src/root/node/protocols.tsx` | `app/(admin)/node/protocols/page.tsx` | 加 'use client' |
| `src/root/node/protocolInfo.tsx` | `app/(admin)/node/protocols/info/page.tsx` | 加 'use client' |
| `src/root/node/devModel.tsx` | `app/(admin)/node/devmodel/page.tsx` | 加 'use client' |
| `src/root/node/nodes.tsx` | `app/(admin)/node/nodes/page.tsx` | 加 'use client' |
| `src/root/node/terminal.tsx` | `app/(admin)/node/terminal/page.tsx` | 加 'use client' |
| `src/root/node/terminalInfo.tsx` | `app/(admin)/node/terminal/[mac]/page.tsx` | 路由参数 |
| `src/root/node/devline.tsx` | `app/(admin)/node/terminal/devline/page.tsx` | 加 'use client' |
| `src/root/node/terminalRegister.tsx` | `app/(admin)/node/terminal/register/page.tsx` | 加 'use client' |
| `src/root/node/user.tsx` | `app/(admin)/node/user/page.tsx` | 加 'use client' |
| `src/root/node/userInfo.tsx` | `app/(admin)/node/user/info/page.tsx` | 加 'use client' |
| `src/root/log/alarm.tsx` | `app/(admin)/log/alarm/page.tsx` | 加 'use client' |
| `src/root/log/terminal.tsx` | `app/(admin)/log/terminal/page.tsx` | 加 'use client' |
| `src/root/log/nodes.tsx` | `app/(admin)/log/nodes/page.tsx` | 加 'use client' |
| `src/root/log/sms.tsx` | `app/(admin)/log/sms/page.tsx` | 加 'use client' |
| `src/root/log/mail.tsx` | `app/(admin)/log/mail/page.tsx` | 加 'use client' |
| `src/root/log/logins.tsx` | `app/(admin)/log/logins/page.tsx` | 加 'use client' |
| `src/root/log/request.tsx` | `app/(admin)/log/request/page.tsx` | 加 'use client' |
| `src/root/log/wxEvent.tsx` | `app/(admin)/log/wxevent/page.tsx` | 加 'use client' |
| `src/root/log/wxSubscribe.tsx` | `app/(admin)/log/wxsubscribe/page.tsx` | 加 'use client' |
| `src/root/log/innerMessage.tsx` | `app/(admin)/log/innermessage/page.tsx` | 加 'use client' |
| `src/root/log/bull.tsx` | `app/(admin)/log/bull/page.tsx` | 加 'use client' |
| `src/root/log/dataClean.tsx` | `app/(admin)/log/dataclean/page.tsx` | 加 'use client' |
| `src/root/wx/user.tsx` | `app/(admin)/wx/users/page.tsx` | 加 'use client' |
| `src/root/wx/materials_list.tsx` | `app/(admin)/wx/materials/page.tsx` | 加 'use client' |
| `src/root/data/clientResult.tsx` | `app/(admin)/data/result/page.tsx` | 加 'use client' |
| `src/root/data/clientResultColltion.tsx` | `app/(admin)/data/result-collection/page.tsx` | 加 'use client' |
| `src/root/data/redis.tsx` | `app/(admin)/data/redis/page.tsx` | 加 'use client' |
| `src/root/data/oss.tsx` | `app/(admin)/data/oss/page.tsx` | 加 'use client' |

### 删除文件

| 旧文件 | 原因 |
|---|---|
| `src/main.tsx` | Next.js 自带入口 |
| `src/App.tsx` | 路由改为文件系统路由 |
| `src/App.css` | 全局样式可放 app/globals.css |
| `vite.config.ts` | 改用 next.config.ts |
| `express/` 整个目录 | Next.js 内置服务器替代 |
| `index.html` | Next.js 自动生成 HTML |

---

## 代码改动检查清单

迁移每个文件时，检查以下改动点：

### 必须修改

- [ ] 文件顶部加 `'use client'`（如果使用了 hooks 或事件）
- [ ] 删除 `import 'antd/dist/antd.css'`
- [ ] `useNavigate` → `useRouter` from `'next/navigation'`
- [ ] `useParams` → `props.params`（页面组件的 props）
- [ ] `useSelector(s => s.User.xxx)` → `useUserStore(s => s.xxx)`
- [ ] `dispatch(setUser(data))` → `useUserStore.getState().setUser(data)`
- [ ] `localStorage.getItem('token')` → `getToken()` from `'@/lib/utils/token'`

### 可能需要修改

- [ ] `PageHeader` → 自定义实现（v5 已移除）
- [ ] `BackTop` → `FloatButton.BackTop`（v5 变更）
- [ ] `window.location.href = '/login'` → `router.push('/login')`
- [ ] 导入路径从 `../../components/` → `@/components/`

### 无需修改

- [ ] Ant Design 大部分组件 API（v5 基本兼容 v4）
- [ ] API 函数调用（`Get`, `Post` 等签名不变）
- [ ] Socket.IO 事件订阅逻辑
- [ ] 业务逻辑代码

---

## 常见迁移陷阱

### 1. 忘记加 'use client'

**症状**：`Error: You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with "use client".`

**解决**：在文件第一行加 `'use client'`，必须在任何 import 之前。

### 2. 路由参数获取方式变化

旧版（React Router）：
```tsx
const { id } = useParams()
```

新版（Next.js App Router，页面组件）：
```tsx
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}
```

### 3. 全局样式丢失

旧版 `App.css` 有全局样式。需在 `app/globals.css` 中重新引入，或在 `app/layout.tsx` 中：
```tsx
import './globals.css'
```

### 4. Ant Design 表格中文配置

旧版通过 `<ConfigProvider locale={zhCN}>` 配置，新版需在 `providers/AntdProvider.tsx` 中加入：
```tsx
import zhCN from 'antd/locale/zh_CN'
<ConfigProvider locale={zhCN}>
```
