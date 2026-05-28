# CLAUDE.md — providers/ 目录

## 目录职责

存放需要包裹子树的 React Context Provider 组件，**全部是 Client Component**。

## 文件列表

```
providers/
└── AntdProvider.tsx    # Ant Design v5 SSR 样式支持
```

## AntdProvider.tsx

**为什么需要它**：Ant Design v5 使用 CSS-in-JS（`@ant-design/cssinjs`），在 SSR 环境中需要提取关键 CSS 注入 HTML，避免"样式闪烁"（FOUC）。`@ant-design/nextjs-registry` 提供了开箱即用的解决方案。

```tsx
'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { FC, PropsWithChildren } from 'react'

const AntdProvider: FC<PropsWithChildren> = ({ children }) => {
  return <AntdRegistry>{children}</AntdRegistry>
}

export default AntdProvider
```

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

例如添加主题切换：

```tsx
// providers/ThemeProvider.tsx
'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

export default function ThemeProvider({ children }) {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      {children}
    </ConfigProvider>
  )
}
```

然后在 `AntdProvider.tsx` 内部或 `app/layout.tsx` 中组合使用。
