# CLAUDE.md — components/ 共享组件目录

## 目录结构（按业务域分组）

```
components/
├── common/                     # 通用基础组件
│   ├── PageHeader.tsx          # 统一页面头部（标题 + 面包屑 + 返回 + extra 操作）
│   ├── PageSummary.tsx         # 统一汇总卡（横排 variant 配色 + 多选叠加筛选）
│   ├── StatCard.tsx            # 数字统计卡片（顶部彩色边框 + icon + 可点击）
│   ├── SectionTitle.tsx        # 带 icon 的 section 标题
│   ├── KVList.tsx              # Key-Value 列表（替代重复 Descriptions 渲染）
│   ├── MyInput.tsx             # 自定义输入框（带 onSave 回调）
│   ├── MyCopy.tsx              # 一键复制按钮
│   ├── MyDatePickerRange.tsx   # 日期范围选择器
│   ├── UserDropdown.tsx        # 用户下拉菜单（登录/退出/用户中心）
│   ├── IconFont.tsx            # 字体图标
│   └── AddUserTerminalModal.tsx
├── layout/                     # 布局组件
│   ├── AdminSider.tsx          # 管理员端侧边栏（lg 断点自动折叠）
│   ├── AdminHeader.tsx         # 管理员端顶栏（面包屑 + 用户菜单）
│   └── AbsButton.tsx           # 浮动按钮（仅 (user) layout 使用）
├── terminal/                   # 终端域（17 个）
│   ├── TerminalInfo.tsx
│   ├── TerminalMountDevs.tsx
│   ├── TerminalsTable.tsx      # 终端表格（admin/node/terminal）
│   ├── TerminalIccidInfo.tsx
│   ├── TerminalDev{Air,IO,TH,Ups,Oprate,Page}.tsx
│   ├── TerminalAT.tsx
│   ├── TerminalAddMountDev.tsx
│   ├── TerminalRunData.tsx
│   ├── TerminalRunDataThresoldLine.tsx
│   ├── TerminalRunLog.tsx
│   ├── TerminalMountDevNameLine.tsx
│   └── TerminalOprate.tsx
├── protocol/                   # 协议域（16 个，PR #44 加 2 个 AI tab）
│   ├── Protocol{Instruct,ShowTag,Threshold,AlarmStat}{,User}.tsx
│   ├── ProtocolContant.tsx     # 常量配置
│   ├── ProtocolOprate.tsx      # 操作指令
│   ├── ProtocolSourceTag.tsx   # 协议来源徽章（admin / ai-generate / ai-chat）
│   ├── ProtocolsCascader.tsx   # 协议级联选择
│   ├── DevTypesCascader.tsx    # 设备类型级联
│   ├── ProtocolInstructSelect.tsx
│   ├── ProtocolInstructForm.tsx     # 协议指令修改表单（从 protocols/info 抽出）
│   ├── ProtocolInstructParamList.tsx # 协议指令参数列表
│   ├── ProtocolInstructParamInput.tsx # 单个参数表单
│   ├── ProtocolAiChatTab.tsx   # AI 修改 tab（PR #44 / PR #45 修复后稳定）
│   └── ProtocolAiDryRunTab.tsx # Dry-run tab（参数化 dry-run + 3 KPI）
├── node/                       # 节点域
│   ├── NodesSelects.tsx
│   └── RotateTokenModal.tsx    # 节点 token 重置/配 token 弹窗
├── log/                        # 日志域
│   ├── AlarmLogTab.tsx
│   ├── LoginLogTab.tsx
│   ├── RequestLogTab.tsx
│   ├── LogTerminal.tsx
│   ├── UserLog.tsx
│   └── log.tsx                 # 通用日志组件
├── chart/                      # 图表
│   ├── MailStatsChart.tsx
│   └── SmsStatsChart.tsx
├── ai/                         # AI 域（PR #44 / 2026-07-17 新建）
│   ├── AiWorkspace.tsx         # 上下分栏布局（topBar + left + right）
│   ├── ChatPane.tsx            # 消息 + 内置 Sender（@ant-design/x）— 注意：Sender 是一部分
│   ├── ProtocolPreviewForm.tsx # 协议 JSON 预览 form（mode: chat | generate）
│   └── StatsPane.tsx           # 顶部紫渐变 hero + 4 KPI 槽
└── data/                       # 数据展示（11 个）
    ├── DesList.tsx
    ├── UserDes.tsx
    ├── UserStat.tsx
    ├── UserAlarmPage.tsx
    ├── ClientResultExpandable.tsx
    ├── ResultData{Original,Parse}.tsx
    ├── TimeLine.tsx
    ├── devCard.tsx
    ├── devRealTimeLog.tsx      # 含 Socket.IO
    └── devUseTime.tsx
```

## 关键约定

### 所有组件必须是 Client Component

本目录中**所有**组件都使用了 React hooks 或 Ant Design 交互组件，必须在文件顶部添加：

```tsx
'use client'
```

**不要省略**，否则会在 Server Component 环境中报错。

### 页面设计三段式

所有 admin/user 端页面统一使用 **PageHeader + PageSummary + 内容** 三段式（见顶层 CLAUDE.md）。

- `PageHeader`：标题 + 面包屑 + 右上 extra 操作 + 可选 back 按钮
- `PageSummary`：横排汇总卡，6 种 variant 语义色，可叠加筛选
- 内容：Table / Card 网格 / Form 等

### 命名规范

- **PascalCase**（已统一从老的 lowerCamel 迁移，如 `myInput` → `MyInput`、`absButton` → `AbsButton`）
- 旧组件 `TerminalDev*` 保留旧名（外部引用广泛，迁移成本大于收益）
- 跨组件 import 用绝对路径 `@/components/<domain>/<Name>`
- 同域组件 import 可用相对路径 `./X`

### Ant Design v4 → v5 迁移差异

| v4 | v5 | 说明 |
|---|---|---|
| `import 'antd/dist/antd.css'` | 删除 | v5 用 CSS-in-JS，无需手动引入 |
| `PageHeader` | `@/components/common/PageHeader` | 该组件在 v5 中已移除，用自定义的替代 |
| `BackTop` | `FloatButton.BackTop` | 已移入 FloatButton 命名空间 |
| `message.success()` | 相同 | API 兼容，无需修改 |
| `Modal.confirm()` | 相同 | API 兼容，无需修改 |
| `Table` 的 `locale` 属性 | 相同 | 无变化 |

### CSS 处理

- 部分组件有配套的 `.css` 文件（如 `data/devCard.css`），就近放在同目录
- 推荐用 `import './ComponentName.css'` 引入
- 暂不强制 CSS Modules（避免一次性大改）

### Socket.IO 相关组件

以下组件包含实时数据逻辑，内部使用了 `lib/socket.ts`：
- `data/devRealTimeLog.tsx` - 实时日志流
- `terminal/TerminalDevPage.tsx` - 终端实时状态

这些组件已经是 Client Component，Socket 连接在 `useEffect` 中建立和清理。

### 组件间依赖关系

```
common/PageHeader.tsx
  └─ 被所有 admin/user 顶层 page.tsx 引用

layout/AdminSider.tsx
  └─ 依赖 lib/constants/adminMenu.ts

protocol/ProtocolInstructForm.tsx
  └─ 依赖 protocol/ProtocolInstructParamList.tsx
     └─ 依赖 protocol/ProtocolInstructParamInput.tsx

# AI 域（PR #44 起）
ai/AiWorkspace.tsx
  └─ 协议详情 info Tabs 的 chat / generate tab 顶层布局
     └─ topBar: ai/StatsPane.tsx
     └─ left:   ai/ChatPane.tsx（含内置 Sender）
     └─ right:  ai/ProtocolPreviewForm.tsx

ai/ChatPane.tsx
  └─ 唯一用户输入入口：底部 <Sender>，onSubmit 必须接真 handler
  └─ ProtocolAiChatTab（AI 修改 tab）
  └─ /admin/node/protocols/generate（AI 生成 page）

protocol/ProtocolAiChatTab.tsx
  └─ key={protocolName} 强制协议切换 remount
  └─ onSubmit={submitChat}（PR #45 修法：删冗余 inputFormNode + 改 onSubmit）
  └─ 依赖 lib/hooks/useAiStream（POST /api/v2/admin/ai/chat-stream SSE）

protocol/ProtocolAiDryRunTab.tsx
  └─ 依赖 lib/api/endpoints/admin/ai (aiDryRun: POST /api/v2/admin/ai/dry-run)
```

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

  return <div>...</div>
}

export default MyComponent
```

**业务域分类**：
- 跨页面通用 → `common/`
- 终端/协议/节点/日志/数据展示等专属 → 对应域目录
- 布局/导航相关 → `layout/`

## 已知陷阱

- `userData.css` 残留在 `common/` 目录（历史遗留），暂无引用
- `iconFont` 字体文件未迁移到 `public/`（待清理）
- `AbsButton` 仅 `(user)/layout.tsx` 引用，是底部弹出式 Sider（极少触发，可考虑删除）

### ChatPane 双 input 陷阱（PR #45 踩坑）

- ❌ **不要在 `ChatPane` 外层再塞 `inputForm`（`<Input + 发送按钮>`）**。`ChatPane` 底部有内置 `<Sender>`，再塞会形成两个 input，第二个还会因为 `onSubmit={() => undefined}` no-op 永远点不动（PR #45 修法：删外层 inputFormNode，`onSubmit={submitChat}`）
- ❌ **`ChatPane` 的 `onSubmit` 必须接真 handler**，空函数 / `() => undefined` 等于把 Sender 弄成"按钮坏了"
- ❌ **不要给 `ChatPane` 外层 inputForm 写误导 placeholder**。Sender 的 placeholder 是 hardcode `"输入修改诉求后回车提交"`，外层塞的 placeholder 会被用户误认为 Sender 提示
- ✅ **`ChatPane` Sender 没内置 abort 按钮**（跟 generate tab 一致）。如要 abort 单独提 PR 给 `ChatPane` 加 `onAbort` prop
- 详见 `docs/components.md` §3.7 + §5.3.1