# CLAUDE.md — providers/ 目录

## 目录职责

存放需要包裹子树的 React Context Provider 组件，**全部是 Client Component**。

## 文件列表

```
providers/
└── AntdProvider.tsx    # Ant Design v5 SSR 样式支持 + v2 紫系 ConfigProvider + App 消息包裹
```

## AntdProvider.tsx（实际结构）

**为什么需要它**：Ant Design v5 使用 CSS-in-JS（`@ant-design/cssinjs`），在 SSR 环境中需要提取关键 CSS 注入 HTML，避免"样式闪烁"（FOUC）。`@ant-design/nextjs-registry` 提供了开箱即用的解决方案。

当前结构是 **3 层复合**（不只是 AntdRegistry）：

```tsx
'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { App, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BRAND, INK, RADIUS, BG, SEMANTIC } from '@/lib/utils/designTokens'

const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: BRAND[500],         // #8b5cf6 紫
            colorInfo: SEMANTIC.info,
            colorSuccess: SEMANTIC.success,   // #10b981
            colorWarning: SEMANTIC.warning,   // #f59e0b
            colorError: SEMANTIC.danger,      // #f43f5e
            // ... ink / border / bg / radius / font 全走 designTokens
            boxShadow: 'none',                // 关键：关闭 antd 默认阴影，用 globals.css 自定义
            colorBgLayout: 'transparent',     // 关键：让 Bento canvas 透出
          },
          components: { Button, Card, Modal, Table, Tabs, Input, Select, DatePicker, Layout, Menu },
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <App message={{ maxCount: 3 }}>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  )
}
```

**3 层职责**：
1. `AntdRegistry` — CSS-in-JS SSR 注入（FOUC 修复）
2. `ConfigProvider` — v2 紫系主题覆盖（token + 10 个 component token）
3. `App` — 静态方法转 hook 调用（`message` / `Modal` / `notification`），统一 `maxCount: 3` 避免刷屏

**在 `app/layout.tsx` 中使用**：

```tsx
import AntdProvider from '@/providers/AntdProvider'

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  )
}
```

## 为什么不需要 Redux Provider

旧项目使用 Redux，需要 `<Provider store={store}>` 包裹。新项目改用 **Zustand**，状态存储在模块级单例中，无需 Provider。任何 Client Component 直接调用 `useUserStore()` 即可。

## 如果需要添加新 Provider

**示例：v2 紫系主题（正确写法）**：

```tsx
// providers/ThemeProvider.tsx
'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BRAND, SEMANTIC } from '@/lib/utils/designTokens'

export default function ThemeProvider({ children }) {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: BRAND[500] } }}>
      {children}
    </ConfigProvider>
  )
}
```

然后在 `AntdProvider.tsx` 内部或 `app/layout.tsx` 中组合使用。

**反例（之前示例是错的，已修）**：
- ❌ `colorPrimary: '#1677ff'`（antd v4 默认蓝，违规，根 CLAUDE.md 明确禁止）
- ✅ `colorPrimary: BRAND[500]`（从 designTokens 取，保证视觉一致）

## 已知陷阱

- ❌ **不要在外部再 wrap 一层 `ConfigProvider`**。AntdProvider 内部已用 `ConfigProvider` + 全套 v2 token，外面再 wrap 会导致 token 覆盖或 antd 报「重复 ConfigProvider」warning
- ❌ **不要绕开 `App` 直接用 `message.success()`**。`App` 是 hook 化 message 的唯一入口，绕开会导致静态调用拿不到 context（`message.success` 不显示）
- ❌ **不要修改 `colorBgLayout: 'transparent'`**。这是 Bento canvas 透出的关键，改成 antd 默认白底会盖死视觉层
