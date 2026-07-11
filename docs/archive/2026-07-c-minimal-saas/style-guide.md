# UART UI 风格指南（Design System）

> 本文档定义整个 v3 项目唯一的视觉规范。所有页面、组件、新功能都必须遵守。
> 风格基线：**方案 C · 浅色极简 SaaS**（demo：`/tmp/uart-ui-demo/c-minimal-saas.html`）。

---

## 1. 设计原则

| 原则 | 含义 | 反例 |
|---|---|---|
| **留白优先** | 卡片 padding ≥ 24px，章节间距 ≥ 24px | 紧凑 16px 表格 |
| **克制用色** | 90% 中性灰 + 10% 主色渐变 | 大面积彩色填充 |
| **动效有意义** | hover/active 才有，单纯装饰禁用 | 自动播放动画 |
| **品牌一致** | 主色必须走 `#6366f1 → #06b6d4` 渐变 | 用 antd 默认蓝 |
| **数据清晰** | 数字 tabular-nums、状态用语义色 + 圆点 | 红绿混用表示状态 |

---

## 2. Design Tokens

所有 token 集中在 `providers/AntdProvider.tsx` 的 `theme.token`，**禁止**在组件内硬编码 hex / 像素值。

### 2.1 颜色

#### 品牌色

| Token | 值 | 用途 |
|---|---|---|
| `--brand-start` | `#6366f1` | 渐变起点（Indigo-500） |
| `--brand-end` | `#06b6d4` | 渐变终点（Cyan-500） |
| `--brand-gradient` | `linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)` | Logo、主按钮、关键数值 |

**绝对不允许**直接使用 `#1677ff`（antd 默认蓝）或别的纯色作为主按钮/Logo。

#### 中性色（Ink Scale）

| Token | 值 | 用途 |
|---|---|---|
| `ink-900` | `#0f172a` | 一级文本（标题、关键数字） |
| `ink-700` | `#334155` | 二级文本（正文） |
| `ink-500` | `#64748b` | 三级文本（副标签、说明） |
| `ink-300` | `#cbd5e1` | 边框（默认） |
| `ink-100` | `#f1f5f9` | 分隔线、表格斑马纹 |
| `ink-50`  | `#f8fafc` | 卡片浅底、二级背景 |

#### 语义色（PageSummary variant 用）

| 语义 | hex | Tailwind | 用途 |
|---|---|---|---|
| primary | `#6366f1` | indigo-500 | 设备总数、默认 |
| success  | `#059669` | emerald-600 | 在线、正常 |
| warning  | `#d97706` | amber-600 | 告警、未处理 |
| danger   | `#dc2626` | red-600 | 严重故障、删除 |
| info     | `#06b6d4` | cyan-500 | 数据流量、信息提示 |
| purple   | `#7c3aed` | violet-600 | 强调、特殊状态 |

#### 背景层

| 层级 | 值 | 用途 |
|---|---|---|
| `bg-page`  | `#fafbfc` | 页面底色 |
| `bg-panel` | `#ffffff` | 卡片/表格背景 |
| `bg-hover` | `#fafbfc` | 行 hover |

### 2.2 字体

```css
font-family: "Inter", "PingFang SC", -apple-system, system-ui, sans-serif;
```

**字号刻度**（与 antd token 对齐）：

| Token | px | 用途 |
|---|---|---|
| `font-xs`   | 11 | caption、tag |
| `font-sm`   | 12 | 副标签、表格内文 |
| `font-base` | 14 | 默认正文、按钮 |
| `font-md`   | 16 | h3、卡片标题 |
| `font-lg`   | 18 | h2、PageHeader |
| `font-xl`   | 20 | 区块标题 |
| `font-2xl`  | 24 | 页面主标题 |
| `font-3xl`  | 30 | stat card 主数值 |

**字重**：

- 400 / `font-normal` — 正文
- 500 / `font-medium` — 表格表头、菜单选中
- 600 / `font-semibold` — 卡片标题、按钮
- 700 / `font-bold` — 页面 h1、stat 数值

**数字专用**：

```css
font-variant-numeric: tabular-nums;
```

所有 stat card、表格数字列、金额都必须加。否则等宽数字会让列对不齐。

### 2.3 间距

基于 4px 网格：

| 用途 | Tailwind | 实际值 |
|---|---|---|
| 卡片内边距 | `p-6` | 24px |
| 页面 padding | `p-8` | 32px |
| 章节间距 | `mb-6` ~ `mb-8` | 24-32px |
| 卡片间距 | `gap-5` | 20px |
| 表格行内边距 | `px-6 py-4` | 24×16 |
| 表格表头内边距 | `px-6 py-4` | 24×16（与行同高） |
| 输入框内边距 | `px-4 py-2` | 16×8 |

### 2.4 圆角

| 元素 | 半径 | Tailwind | 备注 |
|---|---|---|---|
| 主按钮 | 8px | `rounded-lg` | |
| Tag / Badge | 999px | `rounded-full` | 胶囊形 |
| 卡片 / Panel | 16px | `rounded-2xl` | 项目主特征 |
| 菜单项 | 8px | `rounded-lg` | hover 高亮 |
| 输入框 | 8px | `rounded-lg` | |
| Logo 块 | 12px | `rounded-xl` | 略大于按钮 |

**禁止** antd 默认 6px 或超过 20px 的大圆角。

### 2.5 阴影

```css
/* 卡片默认 */
shadow-sm:  0 1px 3px rgba(15,23,42,.04), 0 1px 2px rgba(15,23,42,.06);

/* 卡片 hover（抬升 + 品牌色光晕） */
shadow-hover: 0 10px 25px rgba(99,102,241,.1), 0 4px 10px rgba(15,23,42,.06);

/* 主按钮 hover */
shadow-btn: 0 8px 20px rgba(99,102,241,.3);
```

**禁止**使用 `shadow-lg` / `shadow-xl` 这类粗黑阴影——会显得廉价。

### 2.6 动效

```css
transition: all .25s cubic-bezier(.4, 0, .2, 1);
```

| 元素 | hover | active |
|---|---|---|
| 卡片 | `translateY(-2px)` + 换 hover 阴影 | — |
| 主按钮 | `translateY(-1px)` + 阴影 | `scale(.98)` |
| 菜单项 | 背景换 `ink-100`，文字换 indigo | — |
| 表格行 | 背景换 `bg-hover` | — |

**禁止**旋转、闪烁、自动播放动画。**禁止** `transition` > 0.3s。

---

## 3. 组件视觉规则

### 3.1 PageHeader

```
┌─────────────────────────────────────────────────┐
│ 页面主标题 (text-2xl font-bold)                  │  [导出] [+ 添加]
│ 副标题 (text-sm text-ink-500 mt-1)              │
└─────────────────────────────────────────────────┘
```

- 主标题：`text-2xl font-bold` (24px / 700)
- 副标题：`text-sm text-ink-500 mt-1`（可选）
- 操作按钮：右对齐，与 h1 同一基线
- 容器：`flex justify-between items-end mb-8 pb-3 border-b border-ink-100`

### 3.2 PageSummary（stat card）

```
┌──────────────────────┐
│ 设备总数       [📡] │ ← 右上角图标 + 浅色背景圆角块
│ 1,247                │ ← text-3xl font-bold + variant 色
│ ↑ 较昨日 +12         │ ← text-xs，emerald 表示正向
└──────────────────────┘
```

- 4 列 grid（`grid-cols-4 gap-5`），移动端降级到 `grid-cols-1`
- 卡片：`bg-white rounded-2xl p-6 shadow-sm`
- hover：`translateY(-2px) + shadow-hover`
- 标签：`text-xs text-ink-500 font-medium uppercase tracking-wider`（可选 uppercase）
- 主数值：`text-3xl font-bold text-{variant}`（注意加 `font-variant-numeric: tabular-nums`）
- 副标签：`text-xs mt-2`，正向用 emerald-600，负向用 red-600
- 右上角图标容器：`w-10 h-10 rounded-xl bg-{variant}-50` + emoji 或 IconFont

### 3.3 Table

- 行内边距：`px-6 py-4`
- 表头：`text-xs text-ink-500 uppercase tracking-wider border-b border-ink-100`
- 行 hover：`bg-bg-hover`
- 行分隔：`border-b border-ink-100`（**禁用**斑马纹）
- 数字列：必须 `tabular-nums`
- 操作列：品牌色（indigo-600）+ cursor-pointer

### 3.4 Button

| 类型 | 样式 |
|---|---|
| Primary | `brand-gradient text-white font-medium rounded-lg shadow-sm hover:shadow-btn hover:-translate-y-px active:scale-98` |
| Default | `border border-ink-100 bg-white text-ink-700 rounded-lg hover:border-ink-300` |
| Text / Link | `text-indigo-600 hover:text-indigo-700` |
| Danger | `bg-red-600 text-white rounded-lg`（仅确认删除时） |

### 3.5 Tag（状态标签）

- 胶囊形：`rounded-full px-3 py-1 text-xs font-medium`
- 三种状态：
  - **online**：`bg-emerald-50 text-emerald-700`，前缀 `●`
  - **warning**：`bg-amber-50 text-amber-700`，前缀 `●`
  - **offline**：`bg-slate-100 text-slate-500`，前缀 `●`
- 前缀圆点用 `●`（U+25CF），**不要用 emoji 圆点**

### 3.6 Sidebar / Menu

- 宽度：`w-60`（240px）
- 容器：`bg-white border-r border-ink-100`
- 菜单分组标题：`text-[11px] text-ink-500 uppercase tracking-wider px-3 mb-2`
- 菜单项：`px-3 py-2.5 rounded-lg text-sm hover:bg-ink-100 hover:text-indigo-600`
- 选中态：`bg-gradient-to-r from-indigo-50 to-cyan-50 text-indigo-600 font-medium`
- Logo 块：`w-9 h-9 rounded-xl brand-gradient` + `text-white font-bold`

### 3.7 Topbar

- 高度：`h-16`（64px）
- 容器：`bg-white/80 backdrop-blur border-b border-ink-100`（半透明 + 模糊，让下方内容滚动时有层次感）
- 左侧：breadcrumb + 当前页名（`text-xs text-ink-500` + `text-sm font-medium`）
- 右侧：搜索框 + 通知铃铛（带红点）+ 用户头像（`rounded-full brand-gradient`）

### 3.8 Chart 占位

- 容器：`bg-white rounded-2xl p-6 shadow-sm`
- 标题区：`flex justify-between mb-6`
- 时间切换按钮组：`flex gap-1 p-1 bg-ink-50 rounded-lg`，选中态 `bg-white shadow-sm`
- 折线主色：必须用 `url(#gradC)` 渐变填充 + 渐变描边，**不**用纯色

---

## 4. 状态反馈规范

| 场景 | 实现 | 业务组件 |
|---|---|---|
| 加载中（首屏/表格/列表） | antd `<Skeleton>` 骨架屏 | `<AppSkeleton variant="table\|card\|list\|paragraph" />` |
| 加载中（按钮内联/局部） | antd `<Spin size="small" />` | 直接用 antd |
| 空数据 | 居中插画 + 一句话 + 操作按钮 | `<EmptyState description actionLabel onAction />` |
| 错误（toast 提示） | antd `message.error()` | 直接用 antd |
| 错误（JS 渲染崩溃） | React ErrorBoundary | `<ErrorBoundary>`（包在 layout 顶层） |
| 成功 | antd `message.success()` | 直接用 antd |
| 确认操作 | antd `Modal.confirm()` | 直接用 antd |

**业务组件位置**：`components/common/{EmptyState,ErrorBoundary,AppSkeleton}.tsx`

**禁止**自定义 toast / 自定义确认弹窗（除非有特殊交互需求）。

### 4.1 EmptyState 用法

```tsx
<EmptyState
  description="该用户还没有绑定设备"
  actionLabel="去添加"
  onAction={() => nav('/main/addterminal')}
  secondaryLabel="返回首页"
  onSecondary={() => nav('/main')}
/>
```

- 高度默认 360px（卡片列表场景）
- 操作按钮 1 主 1 副，主按钮用 antd `type="primary"`（自动走品牌渐变）
- description 一句话说清楚**为什么空**+**该做什么**，不要只写"暂无数据"

### 4.2 AppSkeleton 用法

| variant | 适用 | 默认 |
|---|---|---|
| `table` | 表格首屏 | 4 列 × 6 行 |
| `card` | 卡片网格首屏 | 4 张 |
| `list` | 列表首屏 | 5 行 |
| `paragraph` | 段落/详情 | 3 行 |

**何时用 Spin 而非 Skeleton**：按钮内联 loading、局部快速刷新（< 300ms）、下拉刷新。

### 4.3 ErrorBoundary 用法

```tsx
// app/(admin)/layout.tsx 顶层
<ErrorBoundary>
  <div>...</div>
</ErrorBoundary>
```

- **必须**放在 layout 顶层（不是 page 顶层）— 否则 layout 自身的错误捕获不到
- 自定义 fallback：`<ErrorBoundary fallback={(err, reset) => <MyUI />}>`
- ⚠️ **不能**捕获：事件回调中的 throw、异步代码、SSR 阶段错误
- 上报：当前 `console.error`，生产应接 Sentry/自家 logger

---

---

## 5. 动画规范

> 业务组件见 `components/common/{PageTransition,StaggerList}.tsx`

### 5.1 动效 token（globals.css）

```css
--ease: cubic-bezier(.4, 0, .2, 1);
--motion-fast: .15s;   /* 按钮 / hover / focus */
--motion-base: .25s;   /* 页面切换 / 列表 stagger */
```

**所有 transition 必须 ≤ 300ms**（style guide §2.6 反模式），违反会导致"卡顿"感。

### 5.2 PageTransition（页面切换）

- 包装在 `(user)/layout.tsx` / `(admin)/layout.tsx` 的 `<main>` 内部
- pathname 变化时：fade out 200ms → 切新内容 → fade in 200ms
- 关键：必须放在 `<main>` 内部而不是外层，否则 sidebar/header 也会跟着 fade

```tsx
<main>
  <PageTransition>{children}</PageTransition>
</main>
```

### 5.3 StaggerList（列表 stagger 进入）

- 包装 `items.map()` 的结果
- 第 1 项立即，第 N 项延迟 `(N-1) × interval ms`，默认 interval=50ms
- 单项 250ms fade + translateY(8px → 0)
- 超过 maxStagger（默认 12）后不再延迟 — 避免长列表卡顿
- **必须给子元素加 `key` prop**（React 识别身份）

```tsx
<StaggerList interval={50} duration={250}>
  {items.map(it => <Card key={it.id}>...</Card>)}
</StaggerList>
```

### 5.4 禁止的动效

- ❌ 自动播放（无 hover 就开始）
- ❌ 旋转 / 闪烁 / 抖动
- ❌ 单一动画 > 300ms
- ❌ 整个 layout 一起 fade（PageTransition 必须包在 main 内部）
- ❌ 列表全部同时进入（要用 stagger）

---

## 6. 主题切换（未来扩展预留）

当前只实现 light theme。代码层预留 dark mode 扩展点：

```tsx
// providers/AntdProvider.tsx
const useUIStore = create<{ mode: 'light' | 'dark' }>(set => ({
  mode: 'light',
  toggleMode: () => set(s => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
}))

<ConfigProvider
  theme={{
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: { ...LIGHT_TOKENS },
  }}
>
```

**不要**现在实现 dark mode，但 token 命名要为未来兼容（如 `ink-900` 在 dark mode 下会映射到 `#e2e8f0`）。

---

## 7. 反模式清单（review 时强制检查）

- [ ] 没有出现 antd 默认蓝 `#1677ff`
- [ ] 没有出现未声明的 hex / 像素值
- [ ] 没有超过 16px 的大圆角（除卡片 16px）
- [ ] 没有粗黑阴影（`shadow-lg`、`shadow-2xl`）
- [ ] 没有自动播放动画
- [ ] 没有 emoji 圆点（用 `●`）
- [ ] 没有数字没加 `tabular-nums`
- [ ] 没有硬编码 padding 16px（必须 24px 起）
- [ ] 没有用 antd 默认圆角 6px
- [ ] 没有自定义 toast / 弹窗

### 6.1 反白名单（合理用法，避免误报）

- **`size="small"` 在信息密集页面允许使用**：admin 仪表盘（节点详情、Redis 数据、日志表格、终端列表）等需要在一屏展示大量数据行 / 字段的场景，antd 默认 size 偏松散，**`size="small"` / `size="middle"` 都是合理用法**。仅在 user 端用户面向页面（设备列表、用户中心）必须用默认 size（不要 `size="small"`，避免信息密度过高）。
- **`borderRadius: 4` / `borderRadius: 8` 用于细线元素**（分割线、内嵌 Tag、小图标容器）允许，不算"硬编码圆角"。
- **`#1890ff` 不允许**（antd 默认蓝）。`SearchOutlined` 高亮态等场景应改用 `BRAND.start` (`#6366f1`) 或对应语义色。
- **antd v5 deprecation**：`<Space direction="vertical|horizontal">` 在 v5 已废弃为 `orientation="vertical|horizontal"`，写新代码必须用 `orientation`，改老代码时同步替换。
- **业务组件优先**（不要自己写）：
  - 空状态用 `<EmptyState>`，**禁止**直接用 antd `<Empty>`（缺操作按钮）
  - 加载用 `<AppSkeleton variant>`，**禁止**全屏 `<Spin>`（首屏体验差）
  - 错误兜底用 `<ErrorBoundary>`（layout 顶层必加），**禁止**自写 try/catch
  - 页面切换用 `<PageTransition>`（main 内部包），**禁止**自定义 CSS transition
  - 列表入场用 `<StaggerList>`，**禁止**手写 `animationDelay`

---

## 8. 快速参考：复制粘贴片段

### 标准页面骨架

```tsx
<main className="flex-1 flex flex-col overflow-hidden">
  <Topbar />
  <div className="flex-1 overflow-auto p-8">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">页面标题</h1>
        <p className="text-sm text-ink-500 mt-1">副标题说明</p>
      </div>
      <div className="flex gap-3">
        <button className="px-4 py-2 text-sm border border-ink-100 rounded-lg hover:border-ink-300 bg-white">次操作</button>
        <button className="btn-primary px-4 py-2 text-sm rounded-lg text-white font-medium">主操作</button>
      </div>
    </div>

    <PageSummary items={stats} />

    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <Chart ... />
    </div>

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <Table ... />
    </div>
  </div>
</main>
```

### Brand Gradient CSS

```css
.brand-gradient {
  background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
}
.brand-text {
  background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

把这两段加到 `app/globals.css` 里。