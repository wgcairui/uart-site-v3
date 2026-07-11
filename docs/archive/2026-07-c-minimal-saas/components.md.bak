# UART 组件库规范

> 本文档是 `components/CLAUDE.md` 的补充，专注于**样式一致性**和**视觉规则**。
> 所有视觉细节定义在 [`docs/style-guide.md`](./style-guide.md)；本文档只约束"哪个组件应该长什么样、用什么 props、什么时候该复用什么时候该新建"。

---

## 1. 组件分层

```
┌─────────────────────────────────────────────────┐
│  Page (app/(user|admin)/.../page.tsx)           │  ← 页面级，用 PageHeader + PageSummary + 内容
├─────────────────────────────────────────────────┤
│  Layout (components/layout/*)                    │  ← 跨页面骨架（侧栏、顶栏）
├─────────────────────────────────────────────────┤
│  Domain (components/{terminal,protocol,...}/*)   │  ← 业务组件，按域分目录
├─────────────────────────────────────────────────┤
│  Common (components/common/*)                    │  ← 通用基础组件（PageHeader 等）
├─────────────────────────────────────────────────┤
│  Ant Design v5                                   │  ← 底层 UI 库，不允许绕过
└─────────────────────────────────────────────────┘
```

**核心约定**：

- 页面**只组合**业务组件 + Layout，不写自己的卡片/表格/统计卡
- 业务组件**优先组合** `components/common/*`，不直接写 antd
- antd v5 是底层，**禁止**绕过它（不允许自定义底层交互组件）

---

## 2. 核心组件规范

### 2.1 `PageHeader`

**位置**：`components/common/PageHeader.tsx`

**Props**：

```ts
interface PageHeaderProps {
  title: ReactNode                          // 必填，主标题
  subtitle?: ReactNode                      // 可选，副标题（推荐写法替代 title 多行）
  breadcrumb?: BreadcrumbItem[]             // 可选
  extra?: ReactNode                         // 右上操作按钮区
  back?: boolean                            // 是否显示返回按钮
  onBack?: () => void                       // 覆盖 back 默认行为
}
```

**视觉规则**：

```tsx
// 容器
<div className="flex items-end justify-between mb-8 pb-3 border-b border-ink-100">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
  </div>
  {extra && <div className="flex gap-3">{extra}</div>}
</div>
```

**反例**：

- ❌ 自己写 `<h2>{title}</h2>` 然后外面包一层 `<div>`（破坏视觉一致性）
- ❌ 在 extra 里塞 3 个以上按钮（应该改成次要操作集合到下拉）
- ❌ breadcrumb 用了 `ReactNode`（必须是 string）

### 2.2 `PageSummary`

**位置**：`components/common/PageSummary.tsx`

**Props**：

```ts
interface PageSummaryItem {
  label: string                             // 必填
  value: ReactNode                          // 必填，主数值
  extra?: ReactNode                         // 副标签（"↑ 较昨日 +12"）
  icon?: ReactNode                          // 右上角图标（emoji 或 IconFont）
  variant?: SummaryVariant                  // 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  color?: string                            // 自定义 hex（优先于 variant）
  active?: boolean                          // 多选叠加筛选高亮
  onClick?: () => void                      // 点击回调
}
```

**视觉规则**：

```tsx
// 单个卡片
<div className="stat-card bg-white rounded-2xl p-6 shadow-sm">
  <div className="flex items-start justify-between">
    <div>
      <div className="text-xs text-ink-500 font-medium">{label}</div>
      <div className="text-3xl font-bold text-{variant}-600 mt-2 tabular-nums">{value}</div>
      {extra && <div className="text-xs text-ink-500 mt-2">{extra}</div>}
    </div>
    {icon && (
      <div className="w-10 h-10 rounded-xl bg-{variant}-50 flex items-center justify-center text-xl">
        {icon}
      </div>
    )}
  </div>
</div>
```

**变体色映射**（已存在于 `PageSummary.tsx`，不要改）：

| variant | 文字色 | 图标背景 | 适用 |
|---|---|---|---|
| primary | indigo-500 | indigo-50 | 默认 |
| success | emerald-600 | emerald-50 | 在线/正常 |
| warning | amber-600 | amber-50 | 告警 |
| danger | red-600 | red-50 | 严重故障 |
| info | cyan-500 | cyan-50 | 数据/流量 |
| purple | violet-600 | violet-50 | 强调 |

### 2.3 `SectionTitle`

**位置**：`components/common/SectionTitle.tsx`

**视觉规则**：

```tsx
<div className="flex items-center gap-2 mb-4">
  {icon && <span className="text-lg">{icon}</span>}
  <h3 className="font-semibold text-base text-ink-900">{title}</h3>
  {extra && <div className="ml-auto">{extra}</div>}
</div>
```

### 2.4 `MyInput` / `MyDatePickerRange` / `MyCopy`

**位置**：`components/common/`

**统一规则**：

- 容器：antd `<Input>` / `<DatePicker.RangePicker>` / 自定义按钮
- 样式：用 `className="bg-ink-50 border-0 rounded-lg px-4 py-2"` 覆盖 antd 默认灰底
- focus 态：用 `focus:ring-2 focus:ring-indigo-200 focus:outline-none`

### 2.5 表格规范

**所有页面级 Table 必须遵守**：

```tsx
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
  onChange={onTableChange}
  rowKey={r => r.id}
/>
```

**样式覆盖**（写到 `app/globals.css`，不要写在组件内）：

```css
/* 表格行内边距 */
.ant-table-tbody > tr > td { padding: 16px 24px !important; font-size: 14px; }
.ant-table-thead > tr > th { 
  padding: 16px 24px !important; 
  font-size: 11px !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #64748b !important;
  border-bottom: 1px solid #f1f5f9 !important;
  background: transparent !important;
}
.ant-table-tbody > tr:hover > td { background: #fafbfc !important; }
.ant-table-tbody > tr > td { border-bottom: 1px solid #f1f5f9 !important; }
```

### 2.6 Tag / Status Badge

**统一用法**：

```tsx
import { Tag } from 'antd'

// ❌ 反例：每个组件自己写彩色 span
<span style={{ background: '#52c41a20', color: '#52c41a' }}>在线</span>

// ✅ 正例：用 antd Tag，style 引用 style-guide 颜色
<Tag color="success">● 在线</Tag>
```

**自定义状态**（不在 antd 预设里）：

```tsx
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
  ● 在线
</span>
```

**注意**：状态色必须加前缀圆点 `●` (U+25CF)，不要用 emoji。

### 2.7 Sidebar 菜单项

**位置**：`components/layout/AdminSider.tsx` 和 `(user)/layout.tsx`

**视觉规则**：

```tsx
// 菜单分组标题
<div className="text-[11px] text-ink-500 px-3 mb-2 font-medium uppercase tracking-wider">
  Workspace
</div>

// 菜单项（普通）
<div className="flex items-center px-3 py-2.5 rounded-lg text-sm text-ink-700 hover:bg-ink-100 hover:text-indigo-600 cursor-pointer transition-colors">
  <span className="mr-3 text-base">{icon}</span>{label}
</div>

// 菜单项（选中）
<div className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer bg-gradient-to-r from-indigo-50 to-cyan-50 text-indigo-600">
  <span className="mr-3 text-base">{icon}</span>{label}
</div>
```

---

## 3. 业务组件视觉规则

### 3.1 Terminal 域（17 个组件）

| 组件 | 关键样式 |
|---|---|
| `TerminalsTable` | 表格规范 2.5 |
| `TerminalInfo` | Tabs（用 `items` prop），详情页用 `KVList` |
| `TerminalMountDevs` | Card 网格 + 顶部 stat card |
| `TerminalDev{Air,IO,TH,Ups,Oprate,Page}` | 每个设备类型独立组件，遵循 3 段式 |
| `TerminalAT` | 终端 AT 指令调试（深色代码块，黑底 + 等宽字体 + 语法高亮） |
| `TerminalAddMountDev` | 表单用 antd Form + 24px 标签 |
| `TerminalRunData` | 图表 + 表格组合 |
| `TerminalRunDataThresoldLine` | 阈值折线图，主色 brand gradient |
| `TerminalRunLog` | 实时日志流，等宽字体 12px，黑底 + 不同级别色 |
| `TerminalMountDevNameLine` | 时间轴 + 设备卡片 |
| `TerminalIccidInfo` | KVList 显示 |
| `TerminalOprate` | 操作历史表格 |

### 3.2 Protocol 域（14 个组件）

| 组件 | 关键样式 |
|---|---|
| `Protocol{Instruct,ShowTag,Threshold,AlarmStat}` | 协议详情页 + Tabs |
| `ProtocolContant` | 常量表格 |
| `ProtocolOprate` | 操作指令列表（树形结构） |
| `ProtocolsCascader` / `DevTypesCascader` | antd Cascader + 品牌色 hover |
| `ProtocolInstructSelect` | 下拉选择 |
| `ProtocolInstructForm` | 表单 + 嵌套参数列表 |
| `ProtocolInstructParamList` | 参数列表 + 添加按钮 |
| `ProtocolInstructParamInput` | 单个参数输入控件 |

### 3.3 Log 域

- `AlarmLogTab` / `LoginLogTab` / `RequestLogTab`：各自 Tabs，遵循表格规范
- `LogTerminal`：终端日志查询页（form + 表格）
- `UserLog`：用户操作日志

### 3.4 Chart 域

- `MailStatsChart` / `SmsStatsChart`：图表必须用 brand gradient 配色
- 主色：`#6366f1 → #06b6d4` 渐变
- 网格线：`rgba(15,23,42,.06)`
- 字体：`Inter`，轴标签 11px，标题 13px

### 3.5 Data 域（11 个）

| 组件 | 用途 |
|---|---|
| `DesList` / `UserDes` | KV 描述列表（替代 antd Descriptions） |
| `UserStat` / `UserAlarmPage` | 用户统计页 |
| `ClientResultExpandable` | 可展开结果列表 |
| `ResultData{Original,Parse}` | 原始数据 / 解析数据对比 |
| `TimeLine` | 时间轴 |
| `devCard` | 设备卡片（user 端） |
| `devRealTimeLog` | 实时日志（Socket.IO） |
| `devUseTime` | 使用时长统计 |

---

## 4. 新组件开发规范

### 4.1 命名 + 位置

| 类型 | 命名 | 位置 |
|---|---|---|
| 跨页面通用 | `PascalCase` | `components/common/` |
| 业务专属 | `PascalCase` + 域前缀 | `components/{domain}/` |
| 布局 | `PascalCase` | `components/layout/` |
| 一次性使用 | `PascalCase` | 跟 page.tsx 同目录（避免污染 components/） |

### 4.2 文件模板

```tsx
'use client'   // 必须加，components/ 下所有组件都是 Client

import type { FC } from 'react'
// 只 import 用到的 antd 组件，不要 import * as Antd
import { Card, Table } from 'antd'

interface Props {
  /** 描述 */
  title: string
}

const MyComponent: FC<Props> = ({ title }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-base mb-4">{title}</h3>
    </div>
  )
}

export default MyComponent
```

### 4.3 Props 规范

- **必填 prop 放前**，可选 prop 放后
- 用 JSDoc 注释每个 prop
- 复杂对象用 `interface` 定义并 `export`
- 事件回调用 `onXxx` 命名（`onClick`、`onChange`）
- 不要用 `defaultProps`（React 19 已废弃），改用默认参数解构

### 4.4 何时该新建 vs 复用

**新建组件的条件**（满足任一）：

- 跨 2 个以上页面复用
- 业务域专属（terminal / protocol / log / data）
- 视觉逻辑复杂（>50 行 JSX）

**不该新建**：

- 只用一次且简单（直接写在 page.tsx 里）
- 跟现有 antd 组件重复（用 antd 的，套上样式即可）

### 4.5 CSS 处理

- **优先** Tailwind className
- **次选** CSS-in-JS（antd 内部已经在用，跟随）
- **最后** 才考虑独立 .css 文件（且仅用于跨组件共享的全局样式，如表格行 padding）

---

## 5. 修改组件的 review 清单

每次改组件前过一遍：

### 5.1 视觉一致性

- [ ] 用了 `style-guide.md` 定义的 token（颜色 / 字体 / 间距 / 圆角 / 阴影 / 动效）
- [ ] 没有出现 antd 默认蓝 `#1677ff`
- [ ] 卡片用 `rounded-2xl` (16px)，不是 antd 默认 6px
- [ ] 主按钮用了 `brand-gradient`
- [ ] 数字加了 `tabular-nums`

### 5.2 Props 设计

- [ ] 新增 prop 是必填还是可选，逻辑清晰
- [ ] 没有破坏向后兼容（旧调用方不报错）
- [ ] 复杂 prop 用了 `interface` 独立定义
- [ ] 事件回调命名规范（`onXxx`）

### 5.3 'use client'

- [ ] 用了 React hooks → 必须加
- [ ] 用了 antd 交互组件（Button / Form / Modal）→ 必须加
- [ ] 用了 Zustand store → 必须加
- [ ] 用 Socket.IO → 必须加
- [ ] 纯展示 + 无交互 → 可以不加（但实际项目里几乎都用 antd，所以默认加）

### 5.4 性能

- [ ] 列表用了 `rowKey`（否则 antd 会用 index 报警告）
- [ ] 大列表（>100 行）用了 antd Table 自带虚拟滚动（`virtual`）
- [ ] 没用 `useEffect` 缺少依赖项
- [ ] 大对象没在 render 里 inline 创建

### 5.5 可访问性（a11y）

- [ ] 按钮有 `aria-label`（emoji 图标必须）
- [ ] 表格表头用 `<th>` 而不是 `<td>`
- [ ] 颜色不是唯一信息载体（在线/离线用文字 + 颜色，不只用颜色）

---

## 6. 组件间依赖关系（已知）

```
PageHeader ← 所有 admin/user 页面
PageSummary ← 几乎所有列表页
KVList ← TerminalInfo / UserDes / DesList
SectionTitle ← 区块标题场景
MyInput / MyDatePickerRange / MyCopy ← 表单场景

AdminSider ← (admin)/layout.tsx
AdminHeader ← (admin)/layout.tsx
AbsButton ← (user)/layout.tsx

ProtocolInstructForm
  → ProtocolInstructParamList
    → ProtocolInstructParamInput

TerminalsTable ← /admin/node/terminal 页面
TerminalRunData
  → TerminalRunDataThresoldLine（图表）
  → TerminalRunLog（日志）
```

---

## 7. 待清理（refactor 候选）

| 项 | 说明 | 建议处理时机 |
|---|---|---|
| `common/userData.css` | 历史遗留，无引用 | 下次清理时删除 |
| `iconFont` 字体文件未迁移 | 还在老位置 | 迁到 `public/fonts/` |
| `components/common/AbsButton` | 仅 user layout 用，极少触发 | 可考虑删除或迁移 |
| `TerminalDev*` 老组件名 | 外部引用广，迁移成本大于收益 | 保留 |
| 多个 `.css` 文件与组件同目录 | 历史遗留 | 评估是否能合并到 globals.css |

---

## 8. 迁移路径（v2 → v3 已完成）

| v2 旧位置 | v3 新位置 |
|---|---|
| `src/components/` | `components/{common,layout,terminal,protocol,log,chart,data,node}/` |
| `src/user/` | `app/(user)/main/...` |
| `src/root/` | `app/(admin)/admin/...` |
| `src/store/` (Redux) | `lib/store/userStore.ts` (Zustand) |
| `src/common/Fetch.ts` | `lib/api/fetch.ts` |
| `src/common/FecthRoot.ts` | `lib/api/fetchRoot.ts` |
| `src/common/socket.ts` | `lib/socket.ts` |
| `src/common/util.ts` | `lib/utils/*` |

新增功能时**不要**参考 v2 的代码——直接走 v3 的 `components/common/*` 和 `app/(user|admin)/*` 模式。