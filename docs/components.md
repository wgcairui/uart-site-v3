# UART 组件库规范 v2

> 本文档是 `components/CLAUDE.md` 的补充，专注于**样式一致性**和**视觉规则**。
> 所有视觉细节定义在 [`docs/style-guide.md`](./style-guide.md)（v2 · 2+3 混合方案）。
> 视觉稿：`docs/assets/hybrid-design-2-3.html`（5 屏 + 移动端 + token 代码）
> 旧方案归档：`docs/archive/2026-07-c-minimal-saas/`（保留 git 历史，**不要参考**）

---

## 1. 组件分层

```
┌─────────────────────────────────────────────────────┐
│  Page (app/(user|admin)/.../page.tsx)               │  ← 页面级，组合 Layout + 业务组件
├─────────────────────────────────────────────────────┤
│  Layout (components/layout/*)                       │  ← 跨页面骨架（侧栏、顶栏、Hero）
├─────────────────────────────────────────────────────┤
│  Domain (components/{terminal,protocol,...}/*)      │  ← 业务组件，按域分目录
├─────────────────────────────────────────────────────┤
│  Common (components/common/*)                       │  ← 通用基础组件（BentoCard / GlassCard / StatusTag 等）
├─────────────────────────────────────────────────────┤
│  Ant Design v5 (主题由 AntdProvider 覆盖)           │  ← 底层 UI 库，不允许绕过
└─────────────────────────────────────────────────────┘
```

**核心约定**：

- 页面**只组合**业务组件 + Layout + 通用组件，**不**写自己的卡片/表格/统计卡
- 业务组件**优先组合** `components/common/*`，不直接写 antd
- antd v5 是底层，**禁止**绕过它（不允许自定义底层交互组件）
- 通用组件优先用 **Tailwind utility class**（写在 `app/globals.css` 的 `@layer utilities`），业务组件用 className 引用

---

## 2. 核心通用组件

### 2.1 `BentoCard` (Bento 风格容器)

**位置**：`components/common/BentoCard.tsx`

**用途**：所有 admin 仪表盘 / 数据页面的主容器。取代 antd `<Card>` + 自定义 className。

**Props**：

```ts
interface BentoCardProps {
  children: ReactNode
  className?: string                            // 外部传入 col-span-* / margin
  variant?: 'default' | 'hero' | 'subtle'      // hero=深紫渐变, subtle=更弱背景
  hoverable?: boolean                            // 默认 true，hover 抬升
  padding?: 'sm' | 'md' | 'lg'                 // sm=16, md=24, lg=32
}
```

**视觉规则**（utility class 在 `app/globals.css`）：

```tsx
// default
<div className="bento-card">
  {children}
</div>

// hero（深紫渐变 + 极光晕）
<div className="bento-card bento-hero">
  {children}
</div>

// subtle（弱背景，用于列表容器）
<div className="bento-card bento-subtle">
  {children}
</div>
```

**反例**：
- ❌ 直接用 antd `<Card>` 然后套 className（样式优先级问题）
- ❌ 自写 `<div className="bg-white rounded-2xl p-6">`（应该用 BentoCard 组件）
- ❌ 在 hero 上加 `hover:translateY`（hero 不应抬升，破坏视觉锚点）

### 2.2 `GlassCard` (Glass 风格容器)

**位置**：`components/common/GlassCard.tsx`

**用途**：设备详情装饰区 / 操作区 / 登录卡 / 任何需要"玻璃"视觉重点的容器。

**Props**：

```ts
interface GlassCardProps {
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark' | 'tinted'         // dark=Mesh 上, light=Bento 上, tinted=粉紫渐变
  padding?: 'md' | 'lg' | 'xl'                  // md=24, lg=32, xl=40
}
```

**视觉规则**：

```tsx
// light（Bento 主体上的玻璃装饰）
<div className="glass-card glass-light">
  {children}
</div>

// dark（Mesh 背景上的玻璃卡 — 登录页用）
<div className="glass-card glass-dark">
  {children}
</div>

// tinted（粉紫渐变玻璃 — 设备操作区用）
<div className="glass-card glass-tinted">
  {children}
</div>
```

**反例**：
- ❌ 在 admin 长时间操作页面用 dark 玻璃（刺眼 + 背景抖动）
- ❌ Glass 嵌套 Glass（视觉混乱）
- ❌ Glass 内用 `bg-white/95`（破坏玻璃透光感）

### 2.3 `StatusTag` (统一状态徽章)

**位置**：`components/common/StatusTag.tsx`

**用途**：在线 / 离线 / 告警 / 错误 / 信息 / 闲置 6 种状态。**必须**有 `●` 前缀（U+25CF）。

**Props**：

```ts
interface StatusTagProps {
  variant: 'online' | 'offline' | 'warning' | 'error' | 'info' | 'idle'
  label?: string                                // 可选覆盖（默认 '在线' / '离线' 等）
  showDot?: boolean                             // 默认 true
  pulse?: boolean                               // 仅 online 有效，2s 循环动画
  size?: 'sm' | 'md'                            // sm=10px, md=12px
}
```

**视觉规则**：

```tsx
<StatusTag variant="online" />                  // ● 在线 (默认 12px)
<StatusTag variant="online" pulse />            // ● 在线 (圆点动画)
<StatusTag variant="warning" label="UPS 故障" />
<StatusTag variant="offline" size="sm" />       // 表格内用 sm
```

**色板**（详见 `style-guide.md` §2.5）：

| variant | 文字 | 背景 | 圆点 |
|---|---|---|---|
| `online`  | `#047857` | `rgba(16,185,129,0.12)` | `#10b981` |
| `offline` | `#be123c` | `rgba(244,63,94,0.12)` | `#f43f5e` |
| `warning` | `#b45309` | `rgba(245,158,11,0.12)` | `#f59e0b` |
| `error`   | `#be123c` | `rgba(244,63,94,0.15)` | `#f43f5e` |
| `info`    | `#5b21b6` | `rgba(139,92,246,0.10)` | `#8b5cf6` |
| `idle`    | `#475569` | `rgba(148,163,184,0.12)` | `#94a3b8` |

**反例**：
- ❌ 单独写 `<Tag color="success">` (antd 默认绿色，没圆点 + 跟 Bento 色不匹配)
- ❌ 用 emoji 圆点 `🟢` (视觉不一致)
- ❌ 不加圆点 `<span>离线</span>` (跟相邻 Tag 区分不出)
- ❌ 自写 `<span className="rounded-full bg-green-100 text-green-700">` (应走 StatusTag)
- ❌ 任意改色（比如 `bg-red-500/20`）— 用 token 走 StatusTag 统一控制

### 2.4 `Button` (统一按钮)

**位置**：`components/common/Button.tsx`

**用途**：取代 antd `<Button type="primary">`（默认蓝），统一品牌渐变。

**Props**：

```ts
interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'default' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg'                     // sm=32px, md=40px, lg=48px 高
  icon?: ReactNode
  loading?: boolean
  block?: boolean
  // ... 其他 antd Button props
}
```

**视觉规则**：

```tsx
<Button variant="primary" icon={<DownloadIcon />}>导出报告</Button>
<Button variant="default">次操作</Button>
<Button variant="danger">解除挂载</Button>
<Button variant="ghost" size="sm">取消</Button>
```

| variant | 背景 | 文字 | 边框 | hover |
|---|---|---|---|---|
| `primary` | `bg-brand-gradient` | white | — | `shadow-glow` + `translateY(-1px)` |
| `default` | `bg-white` | `text-ink-700` | `border-ink-200` | `border-ink-300` |
| `ghost`   | transparent | `text-ink-500` | — | `bg-ink-50` + `text-ink-700` |
| `danger`  | `bg-danger` | white | — | `bg-rose-600` |
| `link`    | transparent | `text-brand-600` | — | `text-brand-700` |

**反例**：
- ❌ 直接用 antd `<Button type="primary">`（默认蓝）
- ❌ `style={{ color: '#1677ff' }}`（破坏 token）
- ❌ 圆角 6px（antd 默认，要 `rounded-xl`）
- ❌ 主按钮加 `style={{ background: 'purple' }}`（应该走 variant="primary"）

### 2.5 `PageHeader` (统一页面头)

**位置**：`components/common/PageHeader.tsx`

**Props**：

```ts
interface PageHeaderProps {
  title: ReactNode                              // 必填，主标题
  subtitle?: ReactNode                          // 可选，副标题
  breadcrumb?: BreadcrumbItem[]                 // 可选（必须是 string）
  extra?: ReactNode                             // 右上操作按钮区
  back?: boolean                                // 是否显示返回按钮
  onBack?: () => void                           // 覆盖 back 默认行为
  size?: 'md' | 'lg'                            // lg 用于 dashboard hero 页面
}
```

**视觉规则**：

```tsx
<PageHeader
  title="设备总览"
  subtitle="device overview"
  breadcrumb={[
    { title: '首页', href: '/main' },
    { title: '设备', href: '/admin/node/terminal' },
  ]}
  extra={
    <>
      <Button variant="default">导出</Button>
      <Button variant="primary">添加设备</Button>
    </>
  }
/>
```

**反例**：
- ❌ 自己写 `<h2>{title}</h2>` 然后外面包一层 `<div>`（破坏视觉一致性）
- ❌ 在 extra 里塞 3 个以上按钮（应该改成次要操作集合到下拉）
- ❌ breadcrumb 用了 `ReactNode`（必须是 string）
- ❌ 不导出 extra 改为内联（会污染样式层）

### 2.6 `PageSummary` (Bento 风格 stat card)

**位置**：`components/common/PageSummary.tsx`

**Props**：

```ts
interface PageSummaryItem {
  label: string                                 // 必填
  value: ReactNode                              // 必填，主数值
  extra?: ReactNode                             // 副标签（"↑ 较昨日 +12"）
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  color?: string                                // 自定义 hex（优先于 variant）
  active?: boolean                              // 多选叠加筛选高亮
  onClick?: () => void                          // 点击回调，启用 hover 效果
}
```

**视觉规则**：

```tsx
<PageSummary
  items={[
    { label: '设备总数', value: pagination.total, variant: 'primary' },
    { label: '在线', value: 291, variant: 'success',
      extra: '↑ 30.9% 在线率',
      active: statFilter.includes('online'),
      onClick: () => toggleStatFilter('online') },
    { label: '告警', value: 12, variant: 'warning',
      active: statFilter.includes('ups'),
      onClick: () => toggleStatFilter('ups') },
  ]}
/>
```

**多选叠加筛选模式**（admin 列表页推荐）：

```tsx
const [statFilter, setStatFilter] = useState<string[]>([])
const apiQuery: PaginationReq = {
  ...query,
  filters: { ...(query.filters || {}), ...(statFilter.length ? { Type: statFilter } : {}) },
}
// items.onClick: toggle 加入/移除 statFilter
```

**已知陷阱**：
- `breadcrumb[].title` 不支持 ReactNode — 如果要 icon，写纯文字"首页"
- `Space` 组件 v5 用 `orientation` 不用 `direction`（已修）
- antd Table `pagination.current/pageSize` 用 `?? 1` fallback（exactOptionalPropertyTypes 不接受 undefined）

### 2.7 `SectionTitle` (区块标题)

**位置**：`components/common/SectionTitle.tsx`

**用途**：取代 antd `<Divider plain>` + 散落 h3，统一区块标题。

**视觉规则**：

```tsx
<SectionTitle title="设备列表" extra={<Button size="sm">导出</Button>} />
```

样式：`flex items-center gap-2 mb-4 font-semibold text-base text-ink-900`

### 2.8 `KVList` (键值对列表)

**位置**：`components/common/KVList.tsx`

**用途**：设备详情 / 用户信息 / 节点元数据等"左键右值"展示。取代 antd `<Descriptions>`。

**Props**：

```ts
interface KVListProps {
  items: { label: string; value: ReactNode; suffix?: ReactNode }[]
  columns?: 1 | 2 | 3                           // 列数，默认 1
}
```

**视觉规则**：

```tsx
<KVList
  items={[
    { label: '设备 MAC', value: '286B2E4BF8AB', suffix: <CopyButton text="..." /> },
    { label: '节点', value: 'pesiv-1' },
    { label: '协议', value: 'modbus-rtu' },
  ]}
  columns={2}
/>
```

样式：label `text-sm text-ink-500`，value `text-sm text-ink-900 font-medium`，行间虚线分隔。

### 2.9 `MyInput` / `MyDatePickerRange` / `MyCopy`

**位置**：`components/common/`

**统一规则**：

- 容器：antd `<Input>` / `<DatePicker.RangePicker>` / 自定义按钮
- 样式：`className="bg-ink-50 border-0 rounded-xl px-4 py-2.5"` 覆盖 antd 默认灰底
- focus 态：用 `focus:ring-2 focus:ring-brand-200 focus:outline-none`
- placeholder：`text-ink-400`

### 2.10 `UserDropdown` / `AddUserTerminalModal`

**位置**：`components/common/`

**统一规则**：

- `UserDropdown`：avatar 用 `bg-brand-gradient` 圆形 + 28px + `shadow-avatar`
- `AddUserTerminalModal`：Modal `okButtonProps` 走品牌色，Descriptions 改 KVList 风格

---

## 3. 业务组件视觉规则

### 3.1 Terminal 域（17 个组件）

| 组件 | 关键样式 |
|---|---|
| `TerminalsTable` | Bento 表样式（见 §2.7）+ StatusTag 状态列 |
| `TerminalInfo` | Tabs（用 `items` prop）+ KVList 详情 |
| `TerminalMountDevs` | Bento Card 网格 + 顶部 stat card |
| `TerminalDev{Air,IO,TH,Ups,Oprate,Page}` | 每个设备类型独立组件，遵循 3 段式 |
| `TerminalAT` | 终端 AT 指令调试（深色代码块，黑底 + 等宽字体 + 语法高亮） |
| `TerminalAddMountDev` | 表单用 antd Form + 24px 标签 |
| `TerminalRunData` | Bento Card 图表 + 表格组合 |
| `TerminalRunDataThresoldLine` | 阈值折线图，主色 brand gradient + 渐变填充 |
| `TerminalRunLog` | 实时日志流，等宽字体 12px，黑底 + 不同级别色 |
| `TerminalMountDevNameLine` | 时间轴 + 设备卡片 |
| `TerminalIccidInfo` | KVList 显示 |
| `TerminalOprate` | 操作历史表格 + StatusTag 状态列 |
| `DeviceDetailHero` | **新增**（v2）：设备详情顶部 aurora hero，参见 §3.4 |
| `DeviceControlPanel` | **新增**（v2）：实时数据 Glass Card 容器 |
| `DeviceActionPanel` | **新增**（v2）：操作按钮 Glass Card 容器 |

### 3.2 Protocol 域（14 个组件）

| 组件 | 关键样式 |
|---|---|
| `Protocol{Instruct,ShowTag,Threshold,AlarmStat}` | 协议详情页 + Tabs（items prop） |
| `ProtocolContant` | 常量表格 |
| `ProtocolOprate` | 操作指令列表（树形结构） |
| `ProtocolsCascader` / `DevTypesCascader` | antd Cascader + brand-600 hover |
| `ProtocolInstructSelect` | 下拉选择 |
| `ProtocolInstructForm` | 表单 + 嵌套参数列表 |
| `ProtocolInstructParamList` | 参数列表 + 添加按钮 |
| `ProtocolInstructParamInput` | 单个参数输入控件 |

### 3.3 Log 域

- `AlarmLogTab` / `LoginLogTab` / `RequestLogTab`：各自 Tabs，遵循 Bento 表样式
- `LogTerminal`：终端日志查询页（form + 表格）
- `UserLog`：用户操作日志
- **新组件**（v2）：`LogFilterPanel`（filter 区域用 Bento Card）

### 3.4 新增组件：设备详情 3 件套 (v2)

**`DeviceDetailHero`**（设备详情顶部 aurora hero）：

```tsx
<div className="bento-card bento-hero">
  <div className="flex items-start justify-between">
    <div>
      <div className="device-icon">📡</div>
      <h1 className="text-2xl font-bold">设备 {mac}</h1>
      <div className="text-xs text-white/70 font-mono mt-1">{node} · protocol: {pid}</div>
      <div className="badges">
        <span className="tag">智能电表</span>
        <span className="tag">485 总线</span>
      </div>
    </div>
    <div className="text-right">
      <StatusTag variant="online" label="实时连接" pulse />
      <div className="text-xs text-white/50 font-mono mt-2">最后上报 · {time}</div>
    </div>
  </div>
</div>
```

**`DeviceControlPanel`**（实时控制区 Glass Card）：

```tsx
<div className="glass-card glass-light">
  <h3 className="text-sm font-semibold text-ink-900">实时数据 · 3 秒前更新</h3>
  <div className="grid grid-cols-3 gap-3 mt-4">
    <div className="ctrl-tile">
      <div className="ctrl-lbl">电压 Ua</div>
      <div className="ctrl-val">220.4<span className="unit">V</span></div>
      <svg className="spark-mini" />
      <div className="ctrl-trend up">↑ 0.8%</div>
    </div>
    ...
  </div>
</div>
```

**`DeviceActionPanel`**（操作按钮 Glass Card 粉紫渐变）：

```tsx
<div className="glass-card glass-tinted">
  <h3>设备操作</h3>
  <button className="action-btn primary">
    <div className="ico">📡</div>
    <div className="grow">立即读取一次数据</div>
    <span className="arrow">→</span>
  </button>
  <button className="action-btn">校准参数 →</button>
  ...
</div>
```

### 3.5 Chart 域

- `MailStatsChart` / `SmsStatsChart`：图表必须用 brand gradient 配色
- 主色：`#8b5cf6` (brand-500)
- 副色：`#f472b6` (accent-400)
- 网格线：`rgba(15, 23, 42, 0.06)`
- 字体：`Outfit + Noto Sans SC`，轴标签 11px，标题 13px
- **必须**用渐变填充（不是纯色）

### 3.6 Data 域（11 个）

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
| **新组件**（v2）：`UserProfileHero` | user 端"我的"页面顶部 hero（Bento 风格） |

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
import { Table } from 'antd'
import { BentoCard } from '@/components/common/BentoCard'
import { StatusTag } from '@/components/common/StatusTag'

interface Props {
  /** 描述 */
  title: string
}

const MyComponent: FC<Props> = ({ title }) => {
  return (
    <BentoCard>
      <h3 className="font-semibold text-base mb-4">{title}</h3>
      <StatusTag variant="online" />
    </BentoCard>
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
- **新分视觉风格**（Bento / Glass / Mesh）需要专门容器

**不该新建**：

- 只用一次且简单（直接写在 page.tsx 里）
- 跟现有 BentoCard / GlassCard / StatusTag / Button 重复
- 跟现有 antd 组件重复（用 antd 的，套上样式即可）

### 4.5 CSS 处理

- **优先** Tailwind utility class（`@layer utilities` 在 `app/globals.css`）
- **次选** CSS-in-JS（antd 内部已经在用，跟随）
- **最后** 才考虑独立 .css 文件（且仅用于跨组件共享的全局样式，如表格行 padding）

### 4.6 视觉风格选择（新增）

写新组件时，**先决定**用哪种视觉风格：

| 用途 | 风格 | 容器 |
|---|---|---|
| 数据展示（列表 / 表格 / 卡片） | Bento | `<BentoCard>` |
| 关键操作区 / 重点装饰 | Glass Light | `<GlassCard variant="light">` |
| 设备操作面板 | Glass Tinted | `<GlassCard variant="tinted">` |
| 品牌入口 / 登录 | Glass Dark | `<GlassCard variant="dark">` |
| Dashboard Hero KPI | Bento Hero | `<BentoCard variant="hero">` |
| 移动端 | Bento（padding 缩到 14-20px） | `<BentoCard padding="sm">` |

**反例**：
- ❌ admin 表格区用 Glass Dark（长时间操作刺眼）
- ❌ 登录页用 Bento（缺品牌冲击）
- ❌ 普通 KPI 用 Hero（视觉重量过大）

---

## 5. 修改组件的 review 清单

每次改组件前过一遍：

### 5.1 视觉一致性

- [ ] 用了 `style-guide.md` v2 定义的 token（颜色 / 字体 / 间距 / 圆角 / 阴影 / 动效）
- [ ] 没有出现 antd 默认蓝 `#1677ff`
- [ ] 卡片用 `bento-card` / `glass-card` utility，不是 antd `<Card>` 默认样式
- [ ] 主按钮用 `<Button variant="primary">`（自动走品牌渐变）
- [ ] 状态用 `<StatusTag variant>`（不是自写彩色 span）
- [ ] 数字加了 `tabular-nums`
- [ ] **没有 emoji 圆点**（用 `●` U+25CF）
- [ ] **视觉风格跟用途匹配**（Bento 数据 / Glass 装饰）

### 5.2 Props 设计

- [ ] 新增 prop 是必填还是可选，逻辑清晰
- [ ] 没有破坏向后兼容（旧调用方不报错）
- [ ] 复杂 prop 用了 `interface` 独立定义
- [ ] 事件回调命名规范（`onXxx`）
- [ ] 视觉风格 prop 走 enum（`'md' | 'lg' | 'xl'`），不接受 string 自由输入

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
- [ ] 玻璃卡用了 `backdrop-blur`（性能影响大，避免单页 >5 个）

### 5.5 可访问性（a11y）

- [ ] 按钮有 `aria-label`（emoji 图标必须）
- [ ] 表格表头用 `<th>` 而不是 `<td>`
- [ ] 颜色不是唯一信息载体（在线/离线用文字 + 颜色 + 圆点，不只用颜色）
- [ ] Glass 文字对比度 ≥ 4.5:1（用 `text-white` + 半透 opacity 要测）

---

## 6. 组件间依赖关系（v2）

```
PageHeader
  ← 所有 admin/user 页面

PageSummary
  ← 几乎所有列表页（KPI 概览）
  → BentoCard（每个 item 一个）

BentoCard
  ← PageSummary 内部 / 列表页主容器 / 详情页数据区
  ← TerminalRunData / ProtocolInstruct / LogFilterPanel
  ← DeviceDetailHero（variant="hero"）

GlassCard (light)
  ← DeviceControlPanel（实时数据区）
  ← 用户协议详情头部
  ← 任何需要"重点装饰"的容器

GlassCard (tinted)
  ← DeviceActionPanel（操作按钮容器）
  ← 告警历史详情

GlassCard (dark)
  ← LoginPage
  ← MarketingLanding
  ← TrialSignUp

StatusTag
  ← 表格状态列 / 设备卡片 / 详情页头部

Button
  ← 所有页面操作按钮
  ← PageHeader.extra
  ← PageSummary.onClick

KVList
  ← TerminalInfo / UserDes / DesList
  ← DeviceDetailHero 详情

SectionTitle
  ← 区块标题场景
  ← 详情页分区

MyInput / MyDatePickerRange / MyCopy
  ← 表单场景
```

---

## 7. 待清理（v2 重构候选）

| 项 | 说明 | 建议处理时机 |
|---|---|---|
| `common/userData.css` | 历史遗留，无引用 | v2 重构时删除 |
| `iconFont` 字体文件未迁移 | 还在老位置 | 迁到 `public/fonts/` |
| `components/common/AbsButton` | 仅 user layout 用，极少触发 | 可考虑删除或迁移 |
| `TerminalDev*` 老组件名 | 外部引用广，迁移成本大于收益 | 保留 |
| 多个 `.css` 文件与组件同目录 | 历史遗留 | 评估是否能合并到 globals.css |
| **新增**：`components/common/Card.tsx` | 旧 antd Card 包装 | v2 重构时合并到 BentoCard |
| **新增**：散落 `style={{ color: '#1677ff' }}` | antd 默认蓝硬编码 | v2 全部走 Button + StatusTag |
| **新增**：`size="small"` 在 user 端页面 | 违规 | v2 强制改回默认 size |

---

## 8. 迁移路径（v2 → v3 内部重构）

> 这是 v3 项目**内部**的设计系统升级，跟 v2→v3 项目迁移无关（v2→v3 已完成）。

| v3 旧（方案 C） | v3 新（2+3 混合） |
|---|---|
| `<Card>` (antd) 默认白卡 | `<BentoCard>` (半透明白 + 紫光晕) |
| `<Card>` (antd) Hero 蓝渐变 | `<BentoCard variant="hero">` (深紫 aurora) |
| 自写 `bg-white/80 backdrop-blur` 玻璃卡 | `<GlassCard variant="light">` |
| 自写 `bg-white/15 backdrop-blur` 登录卡 | `<GlassCard variant="dark">` |
| `<Tag color="success">` (antd 绿) | `<StatusTag variant="online" />` |
| `<Tag color="warning">` (antd 黄) | `<StatusTag variant="warning" />` |
| `<Tag color="error">` (antd 红) | `<StatusTag variant="offline" />` |
| `<Button type="primary">` (antd 蓝) | `<Button variant="primary">` (品牌渐变) |
| `style={{ color: '#1677ff' }}` | `className="text-brand-600"` |
| 字号 `text-2xl font-bold` 24px | 字号 `text-2xl font-bold tracking-tight` 24px + tracking |
| 圆角 6px (antd 默认) | 圆角 10-12px (Button) / 18px (BentoCard) / 20px (GlassCard) |
| 阴影 `shadow-sm` | 阴影 `shadow-bento` (utility) |
| 字体 `Inter` + `PingFang SC` | 字体 `Outfit` + `Noto Sans SC` + `JetBrains Mono` |
| 主色 `#6366f1 → #06b6d4` 渐变 | 主色 `#8b5cf6 → #f472b6` 渐变 |

---

## 9. Token 体系

**完整 token 定义**：见 `style-guide.md` §2 + `lib/utils/designTokens.ts`

**视觉稿自检**：见 `style-guide.md` §10
