# CLAUDE.md — components/ 共享组件目录

## 组件列表（迁移自 src/components/）

```
components/
├── userData.tsx          # 用户数据展示
├── terminalData.tsx      # 终端数据展示（18KB，含复杂图表）
├── protocolData.tsx      # 协议数据展示（30KB，最复杂的组件）
├── resultData.tsx        # 结果数据展示
├── terminalsTable.tsx    # 终端表格（24KB，含分页/搜索/操作）
├── TerminalDev.tsx       # 终端设备展示（23KB）
├── devCard.tsx           # 设备卡片
├── devRealTimeLog.tsx    # 设备实时日志（含 Socket.IO）
├── myInput.tsx           # 自定义输入框
├── myDatePickerRange.tsx # 日期范围选择器
├── Selects.tsx           # 下拉选择框
├── myCopy.tsx            # 一键复制组件
├── userDropDown.tsx      # 用户下拉菜单
├── IconFont.tsx          # 字体图标
├── amaploader.tsx        # 高德地图加载器
├── devUseTime.tsx        # 设备使用时间统计
└── absButton.tsx         # 绝对定位按钮
```

## 关键约定

### 所有组件必须是 Client Component

本目录中**所有**组件都使用了 React hooks 或 Ant Design 交互组件，必须在文件顶部添加：

```tsx
'use client'
```

**不要省略**，否则会在 Server Component 环境中报错。

### Ant Design v4 → v5 迁移差异

迁移时需注意以下 API 变化：

| v4 | v5 | 说明 |
|---|---|---|
| `import 'antd/dist/antd.css'` | 删除 | v5 用 CSS-in-JS，无需手动引入 |
| `PageHeader` | 自定义或用 `Descriptions` | 该组件在 v5 中已移除 |
| `BackTop` | `FloatButton.BackTop` | 已移入 FloatButton 命名空间 |
| `message.success()` | 相同 | API 兼容，无需修改 |
| `Modal.confirm()` | 相同 | API 兼容，无需修改 |
| `Table` 的 `locale` 属性 | 相同 | 无变化 |

### CSS 处理

旧版每个组件有配套的 `.css` 文件（如 `TerminalDev.css`）。迁移策略：
- **方式一（推荐）**：保留 `.css` 文件，在组件中用 `import './ComponentName.css'` 引入
- **方式二**：转为 CSS Modules（`ComponentName.module.css`），需修改 className 引用

### 组件间依赖关系

```
protocolData.tsx
  └─ 依赖 myInput.tsx、Selects.tsx、myDatePickerRange.tsx

terminalsTable.tsx
  └─ 依赖 TerminalDev.tsx、devCard.tsx

TerminalDev.tsx
  └─ 依赖 devRealTimeLog.tsx（含 Socket.IO）
       └─ 依赖 lib/socket.ts

amaploader.tsx
  └─ 依赖 @uiw/react-amap（高德地图，API Key 硬编码）
```

### Socket.IO 相关组件

以下组件包含实时数据逻辑，内部使用了 `lib/socket.ts`：
- `devRealTimeLog.tsx` - 实时日志流
- `TerminalDev.tsx` - 终端实时状态

这些组件已经是 Client Component，Socket 连接在 `useEffect` 中建立和清理。

## 新增组件的规范

新增组件时遵循以下模板：

```tsx
'use client'

import type { FC } from 'react'
// Ant Design 按需导入，不要 import * as Antd
import { Button, Table } from 'antd'
import { useUserStore } from '@/lib/store/userStore'

interface Props {
  // 明确定义 props 类型
}

const MyComponent: FC<Props> = ({ ... }) => {
  const user = useUserStore(s => s.user)

  return (
    <div>
      ...
    </div>
  )
}

export default MyComponent
```
