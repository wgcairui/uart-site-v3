# UART UI 风格指南（Design System v2 · 2+3 混合方案）

> 本文档定义整个 v3 项目唯一的视觉规范。所有页面、组件、新功能都必须遵守。
> 风格基线：**2+3 混合 (Bento + Aurora + Glass + Mesh)**。
> 完整视觉稿（5 屏 + 移动端 + token 代码）：`docs/assets/hybrid-design-2-3.html`
> 旧方案归档：`docs/archive/2026-07-c-minimal-saas/`（保留 git 历史，**不要参考**）

---

## 0. 核心理念：按页面用途分视觉

uart-site-v3 页面分 3 类，每类用不同子风格，**共享同一套色板 + 字体 + token**：

| 页面类型 | 子风格 | 应用场景 |
|---|---|---|
| **数据展示** | Bento + Aurora | admin 仪表盘 / 设备列表 / 协议详情 / 日志 / 数据页 |
| **品牌入口** | Glass + Mesh | 登录页 / Landing / Marketing 落地页 / 试用页 |
| **混合型** | Bento 主体 + Glass 装饰 | 设备详情页（数据走 Bento, 关键操作区走 Glass） |

**反例**：
- ❌ 全站统一 antd 扁平（缺记忆点）
- ❌ 登录页用 Bento（缺乏品牌冲击）
- ❌ admin 表格用 Glass Mesh（长时间操作刺眼、可读性差）

---

## 1. 设计原则

| 原则 | 含义 | 反例 |
|---|---|---|
| **分层视觉** | 数据走 Bento（信息密度高），装饰走 Glass（视觉重点） | 一刀切用一种 |
| **共享 token** | 所有页面走同一套品牌色 + 字体 + 圆角 + 阴影 | 局部硬编码 |
| **数据优先** | 数字 `tabular-nums`，状态用语义色 + 圆点 | 红绿混用表示状态 |
| **玻璃谨慎** | Glass + Mesh 只用于品牌 / 装饰，长时间操作页面禁用 | admin 全盘上玻璃 |
| **动效有意义** | hover/active 才有，单纯装饰禁用 | 自动播放动画 |

---

## 2. Design Tokens

所有 token 集中在 `lib/utils/designTokens.ts`，**禁止**在组件内硬编码 hex / 像素值。

### 2.1 品牌色（紫色系 Bento+Aurora）

| Token | 值 | 用途 |
|---|---|---|
| `brand-50`  | `#f5f3ff` | 浅背景、KPI 弱化区 |
| `brand-100` | `#ede9fe` | 极光晕染底层 |
| `brand-200` | `#ddd6fe` | 弱化边框、辅助 |
| `brand-300` | `#c4b5fd` | 渐变中间色、图表 |
| `brand-400` | `#a78bfa` | hover 态、图表 |
| `brand-500` | **`#8b5cf6`** | **主色（紫）— Logo / 主按钮 / 关键数值** |
| `brand-600` | `#7c3aed` | hover 加深 |
| `brand-700` | `#6d28d9` | 渐变终点 |
| `brand-800` | `#5b21b6` | 暗背景强调 |
| `brand-900` | `#4c1d95` | 深色 hero 背景 |
| `brand-950` | `#2e1065` | 极深 |

**品牌渐变**：

```css
/* Bento 主渐变（紫 → 粉） */
--brand-gradient: linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%);

/* Aurora 极光（深紫 → 紫 → 粉） */
--aurora-gradient: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%);

/* Glow 阴影（主按钮 hover） */
--shadow-glow: 0 4px 12px -2px rgba(139, 92, 246, 0.4);
```

**绝对不允许**直接使用 `#1677ff`（antd 默认蓝）作为主按钮 / Logo。

### 2.2 强调色（粉）

| Token | 值 | 用途 |
|---|---|---|
| `accent-300` | `#f9a8d4` | 弱化强调、图表 |
| `accent-400` | **`#f472b6`** | **强调色（粉）— 今日 / 关键操作** |
| `accent-500` | `#ec4899` | hover 加深 |

### 2.3 中性色（Ink Scale）

| Token | 值 | 用途 |
|---|---|---|
| `ink-900` | `#0f172a` | 一级文本（标题、关键数字） |
| `ink-700` | `#334155` | 二级文本（正文） |
| `ink-500` | `#64748b` | 三级文本（副标签、说明） |
| `ink-400` | `#94a3b8` | 占位符、禁用 |
| `ink-300` | `#cbd5e1` | 边框（默认） |
| `ink-200` | `#e2e8f0` | 强边框 |
| `ink-100` | `#f1f5f9` | 分隔线、表格斑马纹 |
| `ink-50`  | `#f8fafc` | 卡片浅底、二级背景 |

### 2.4 语义色（PageSummary variant 用）

| 语义 | hex | 用途 |
|---|---|---|
| `success` | `#10b981` | 在线、正常 |
| `warning` | `#f59e0b` | 告警、未处理 |
| `danger`  | `#f43f5e` | 严重故障、删除 |
| `info`    | `#6366f1` | 数据流量、信息提示（用 brand 主色作 info） |
| `primary` | `#8b5cf6` | 设备总数、默认（同 brand-500） |

### 2.5 状态徽章色（StatusTag variant 用）

| 状态 | 文字色 | 背景 | 圆点 | 用途 |
|---|---|---|---|---|
| `online`  | `#047857` | `rgba(16,185,129,0.12)` | `#10b981` | 在线、连接正常 |
| `offline` | `#be123c` | `rgba(244,63,94,0.12)` | `#f43f5e` | 离线、断开 |
| `warning` | `#b45309` | `rgba(245,158,11,0.12)` | `#f59e0b` | 告警、未处理 |
| `error`   | `#be123c` | `rgba(244,63,94,0.15)` | `#f43f5e` | 严重错误 |
| `info`    | `#5b21b6` | `rgba(139,92,246,0.10)` | `#8b5cf6` | 信息态 |
| `idle`    | `#475569` | `rgba(148,163,184,0.12)` | `#94a3b8` | 闲置、未知 |

**统一前缀**：`●` (U+25CF)，**不要用 emoji 圆点**。

### 2.6 字体

```css
--font-sans: 'Outfit', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
```

**字体引入**（`app/layout.tsx`）：

```tsx
import { Outfit, JetBrains_Mono, Noto_Sans_SC } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })
const notoSC = Noto_Sans_SC({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-noto-sc' })
```

**字号刻度**：

| Token | px | 用途 |
|---|---|---|
| `font-xs`   | 11 | caption、tag、KPI 标签 |
| `font-sm`   | 12 | 副标签、表格内文 |
| `font-base` | 14 | 默认正文、按钮 |
| `font-md`   | 16 | h3、卡片标题 |
| `font-lg`   | 18 | h2、PageHeader |
| `font-xl`   | 20 | 区块标题 |
| `font-2xl`  | 24 | 页面主标题 |
| `font-3xl`  | 32 | Bento KPI 主数值 |
| `font-4xl`  | 42 | Hero KPI（大数字） |
| `font-5xl`  | 64 | Aurora Hero 主数值（首页大卡） |

**字重**：
- 400 / `font-normal` — 正文
- 500 / `font-medium` — 表格表头、菜单选中、副标签
- 600 / `font-semibold` — 卡片标题、按钮
- 700 / `font-bold` — 页面 h1、Bento 数值

**数字专用**：

```css
font-variant-numeric: tabular-nums;
font-feature-settings: 'tnum';
```

所有 stat card、表格数字列、金额都必须加。

### 2.7 间距（4px 网格）

| 用途 | 值 | 备注 |
|---|---|---|
| 卡片内边距（Bento） | 24px | `p-6` |
| 卡片内边距（Glass） | 32-40px | 玻璃卡空间更松 |
| 页面 padding | 32px | `p-8` |
| 章节间距 | 24-32px | `mb-6` ~ `mb-8` |
| Bento 卡片间距 | 20px | `gap-5` |
| 表格行内边距 | 24×16 | `px-6 py-4` |
| 输入框内边距 | 16×10 | `px-4 py-2.5` |

### 2.8 圆角

| 元素 | 半径 | 备注 |
|---|---|---|
| 主按钮 | 10-12px | `rounded-xl` |
| Tag / Badge | 999px | `rounded-full` 胶囊 |
| **Bento Card** | **18px** | 项目主特征 |
| **Glass Card** | **20px** | 玻璃卡 |
| 登录卡 | 24px | 更大展示 |
| 菜单项 | 8-10px | hover 高亮 |
| 输入框 | 10px | `rounded-xl` |
| Logo 块 | 12px | `rounded-xl` |

**禁止** antd 默认 6px（除非内嵌元素 / 分割线）。**禁止**超过 24px 的大圆角（除登录卡）。

### 2.9 阴影

```css
/* Bento 卡片（轻抬升 + 紫光晕） */
--shadow-bento: 0 4px 20px -8px rgba(99, 102, 241, 0.12);

/* Bento 卡片 hover（更强紫光） */
--shadow-bento-hover: 0 8px 30px -8px rgba(99, 102, 241, 0.20);

/* Glass 卡片（透光感） */
--shadow-glass: 0 20px 60px -10px rgba(0, 0, 0, 0.2);

/* 主按钮 glow */
--shadow-glow: 0 4px 12px -2px rgba(139, 92, 246, 0.4);

/* 头像 / Logo 浮起 */
--shadow-avatar: 0 4px 12px -2px rgba(139, 92, 246, 0.3);
```

**禁止**使用 `shadow-lg` / `shadow-xl` / `shadow-2xl` 这类粗黑阴影——会显得廉价。

### 2.10 动效

```css
--ease: cubic-bezier(0.4, 0, 0.2, 1);
--motion-fast: 150ms;   /* hover / focus */
--motion-base: 250ms;   /* 卡片 hover / 页面切换 */
--motion-slow: 400ms;   /* 玻璃卡透明度渐变 */
```

| 元素 | hover | active |
|---|---|---|
| Bento 卡片 | `translateY(-2px)` + 换 `shadow-bento-hover` | — |
| Glass 卡片 | 透明度微调（避免背景抖动） | — |
| 主按钮 | `translateY(-1px)` + `shadow-glow` | `scale(0.98)` |
| 菜单项 | 背景换 `ink-100`，文字换 `brand-600` | — |
| 表格行 | 背景换 `bg-hover` | — |
| StatusTag online 圆点 | `pulse` 2s 循环 | — |

**禁止**旋转、闪烁、自动播放动画。**禁止** `transition` > 400ms。

---

## 3. 按页面类型的视觉规则

### 3.1 Admin 仪表盘 — Bento + Aurora

**主容器背景**（`app/globals.css` 加 utility）：

```css
.bg-bento-canvas {
  position: relative;
  background:
    radial-gradient(at 0% 0%, #ede9fe 0%, transparent 50%),
    radial-gradient(at 100% 100%, #fce7f3 0%, transparent 50%),
    #fafafa;
  overflow: hidden;
}
.bg-bento-canvas::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
  opacity: 0.18;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}
```

**Hero KPI 大卡**（左侧，1.5x 宽）：

```tsx
<div className="bento-card bento-hero" style={{ padding: 32 }}>
  <div className="lbl">// 设备总数</div>
  <div className="val-hero">941</div>          {/* font-5xl / 64px */}
  <div className="delta">↑ 12 较昨日</div>
  <div className="footer">
    <div>DTU 节点<strong>12</strong></div>
    ...
  </div>
</div>
```

样式：
- 背景：`linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%)` (aurora 深色)
- 文字：白色
- 装饰：右上角 + 左下角极光晕（`::after` radial-gradient）
- 圆角：18px

**普通 Bento 卡**（KPI 子项 / 趋势图 / 设备列表）：

```tsx
<div className="bento-card">
  <div className="lbl">// 在线</div>
  <div className="val">291</div>              {/* font-3xl / 32px */}
  <div className="delta up">↑ 30.9%</div>
</div>
```

样式：
- 背景：`rgba(255, 255, 255, 0.7)` + `backdrop-blur(20px)`
- 边框：`1px solid rgba(255, 255, 255, 0.9)`
- 阴影：`shadow-bento`
- 圆角：18px
- padding：24px

**Bento Grid 布局**（12 列响应式）：

```tsx
<div className="grid grid-cols-12 gap-5">
  <div className="col-span-5">Hero KPI</div>
  <div className="col-span-3">KPI 子项 1</div>
  <div className="col-span-2">KPI 子项 2</div>
  <div className="col-span-2">KPI 子项 3</div>
  <div className="col-span-8">趋势图</div>
  <div className="col-span-4">节点状态列表</div>
  <div className="col-span-12">设备列表</div>
</div>
```

**移动端** (< 768px)：全部 `col-span-12` 单列堆叠，KPI 子项 2 列网格。

### 3.2 设备详情页 — Bento 主体 + Glass 装饰

**设备 Hero 横幅**（顶部，跨满）：

```tsx
<div className="device-hero">
  <div className="device-icon">📡</div>
  <h1>设备 {mac}</h1>
  <div className="mac">{node} · protocol: {pid}</div>
  <div className="badges">
    <span className="tag">智能电表</span>
    <span className="tag">485 总线</span>
  </div>
  <div className="right">
    <div className="live">● 实时连接</div>
    <div className="last-seen">最后上报 · {time}</div>
  </div>
</div>
```

样式：同 Hero KPI（aurora 深色 + 极光晕装饰），padding 32px，跨满宽度。

**实时控制区**（Glass 卡，左侧 8/12 列）：

```tsx
<div className="glass-card glass-controls">
  <h3>实时数据 · 3 秒前更新</h3>
  <div className="control-grid grid-cols-3 gap-3">
    <div className="ctrl-tile">
      <div className="ctrl-lbl">电压 Ua</div>
      <div className="ctrl-val">220.4 V</div>
      <svg className="spark-mini" />
      <div className="ctrl-trend up">↑ 0.8%</div>
    </div>
    ...
  </div>
</div>
```

样式：
- 背景：`linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(237,233,254,0.4) 100%)` + `backdrop-blur(20px)`
- 边框：`1px solid rgba(255, 255, 255, 0.9)`
- 阴影：`shadow-bento`
- 圆角：20px
- padding：24px

**设备操作区**（Glass 卡粉紫渐变，右侧 4/12 列）：

```tsx
<div className="glass-card glass-actions">
  <button className="action-btn primary">
    <div className="ico">📡</div>
    <div className="grow">立即读取一次数据</div>
    <span className="arrow">→</span>
  </button>
  <button className="action-btn">校准参数 →</button>
  ...
</div>
```

样式：
- 背景：`linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(252,231,243,0.4) 100%)`
- 主操作按钮：`linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)` + `shadow-glow`
- 圆角：20px
- 操作按钮：12px 圆角，hover 抬升

**趋势图**（Bento 卡，跨满）：

```tsx
<div className="bento-card">
  <h3>近 24h 实时趋势</h3>
  <svg className="area-chart">
    <defs>
      <linearGradient id="gradViolet"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>...</linearGradient>
    </defs>
    <path d="..." fill="url(#gradViolet)" />
  </svg>
</div>
```

样式：折线主色 `#8b5cf6`，副线 `#f472b6`，必须有渐变填充（不是纯色填充）。

### 3.3 登录页 / Landing — Glass + Mesh

**Mesh 渐变背景**（全屏）：

```css
.bg-glass-mesh {
  position: relative;
  background: linear-gradient(125deg,
    #3b82f6 0%, #8b5cf6 35%, #ec4899 70%, #f97316 100%);
  overflow: hidden;
}
.bg-glass-mesh::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(at 20% 80%, #06b6d4 0%, transparent 40%),
    radial-gradient(at 80% 20%, #f43f5e 0%, transparent 40%);
  opacity: 0.6;
  mix-blend-mode: screen;
  pointer-events: none;
}
```

**Glass 登录卡**（居中）：

```tsx
<div className="bg-glass-mesh">
  <div className="glass-card">
    <h2>欢迎回来</h2>
    <form>
      <label>邮箱</label>
      <input type="text" />
      ...
    </form>
  </div>
</div>
```

样式：
- 背景：`rgba(255, 255, 255, 0.15)` + `backdrop-blur(40px)`
- 边框：`1px solid rgba(255, 255, 255, 0.25)`
- 阴影：`shadow-glass`（强透光阴影）
- 圆角：24px
- padding：40px
- 文字：白色（半透明 opacity 区分主次）
- 输入框：`rgba(255, 255, 255, 0.12)` + `backdrop-blur(10px)` + 边框 `rgba(255, 255, 255, 0.25)`
- 主按钮：`rgba(255, 255, 255, 0.95)` 白底紫字（高对比）

**Landing hero**（左侧 1.2 / 右侧 1 网格）：

```tsx
<div className="login-container grid grid-cols-2 gap-16">
  <div className="login-hero">
    <h1>管理 <em>941 台</em><br>工业 IoT 设备</h1>
    <p>...</p>
    <div className="stats">
      <div>在线设备<strong>291</strong></div>
      <div>覆盖协议<strong>47</strong></div>
      <div>服务节点<strong>12</strong></div>
    </div>
  </div>
  <div className="glass-card">登录表单</div>
</div>
```

样式：左侧 hero 文字白色，h1 48-56px font-6xl，`em` 用 `linear-gradient(135deg, #fbbf24, #f97316)` 渐变文字。

### 3.4 移动端 (3 屏)

**3 屏布局**（首页 / 详情 / 登录），同色系缩放：

- **首页**：2 列 Bento KPI grid + 设备状态列表
- **详情**：单个大 Bento KPI + 2 列小 KPI + 趋势图 + 主操作按钮
- **登录**：同桌面版 Glass 居中卡

所有 Bento 卡 padding 缩到 14-20px，KPI 数值 22-36px，状态 tag 缩小到 9-10px。

---

## 4. 组件视觉规则

### 4.1 `PageHeader`

**统一页面头**（所有 admin/user 列表页 + 详情页必用）：

```
┌─────────────────────────────────────────────────────┐
│ 页面主标题 (text-2xl font-bold tracking-tight)      │  [导出] [+ 添加]
│ 副标题 (text-sm text-ink-500 mt-1)                  │
└─────────────────────────────────────────────────────┘
```

- 容器：`flex items-end justify-between mb-8 pb-3 border-b border-ink-100`
- 主标题：`text-2xl font-bold` (24px / 700) + `tracking-tight`
- 副标题：`text-sm text-ink-500 mt-1`（可选）
- 操作按钮：右对齐，与 h1 同一基线
- **面包屑**：可选用 `text-xs text-ink-500` + `JetBrains Mono`

**反例**：
- ❌ 自己写 `<h2>{title}</h2>` 然后外面包一层 `<div>`（破坏视觉一致性）
- ❌ 在 extra 里塞 3 个以上按钮（应该改成次要操作集合到下拉）
- ❌ breadcrumb 用了 `ReactNode`（必须是 string）

### 4.2 `PageSummary` (Bento 风格 stat card)

**4 列 Bento 网格**（KPI 概览用）：

```tsx
<PageSummary
  items={[
    { label: '设备总数', value: pagination.total, variant: 'primary' },
    { label: '在线', value: 291, variant: 'success',
      extra: '↑ 30.9% 在线率',
      active: statFilter.includes('online'),
      onClick: () => toggleStatFilter('online') },
  ]}
/>
```

**每个卡片样式**（Bento 风）：

```tsx
<div className="bento-card">
  <div className="lbl">{label}</div>     {/* font-xs uppercase text-brand-500 font-mono */}
  <div className="val">{value}</div>     {/* font-3xl font-bold text-ink-900 tabular-nums */}
  {extra && <div className="delta up">{extra}</div>}  {/* font-xs text-success/danger */}
</div>
```

样式：
- 卡片：`bento-card` utility class（`bg-white/70 backdrop-blur-[20px] rounded-[18px] p-6 shadow-bento`）
- 标签：`text-xs text-brand-500 font-mono uppercase tracking-wider`（可选 uppercase）
- 主数值：`text-3xl font-bold text-ink-900 tabular-nums`（**font-bold** 是 Bento 特征）
- 副标签：`text-xs mt-2`，up 用 success、down 用 danger

**变体色**（仅用于 label color + 副标签，**不**用于卡片背景）：

| variant | label color | extra color |
|---|---|---|
| `primary` | `text-brand-500` | `text-success` |
| `success` | `text-success` | `text-success` |
| `warning` | `text-warning` | `text-warning` |
| `danger` | `text-danger` | `text-danger` |
| `info` | `text-info` (brand-500) | `text-info` |
| `purple` | `text-brand-600` | `text-brand-600` |

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

### 4.3 `BentoCard` (核心容器)

**所有数据页面的主容器**：

```tsx
<div className="bento-card">
  <h3>区块标题</h3>
  <p>内容</p>
</div>
```

样式：
- 背景：`bg-white/70 backdrop-blur-[20px]`
- 边框：`border border-white/80`
- 圆角：`rounded-[18px]`
- 阴影：`shadow-bento` (默认) → `shadow-bento-hover` (hover)
- padding：24px
- hover：`translateY(-2px)` + `transition-all duration-200`

### 4.4 `GlassCard` (混合页面装饰容器)

**设备详情 / 操作区 / 登录卡**：

```tsx
<div className="glass-card">
  <h3>玻璃卡标题</h3>
  <p>内容</p>
</div>
```

样式：
- 背景：`bg-white/15 backdrop-blur-[20px]` (浅) 或 `bg-white/70 backdrop-blur-[20px]` (混合页)
- 边框：`border border-white/40` (深) 或 `border border-white/90` (浅)
- 圆角：`rounded-[20px]`
- 阴影：`shadow-bento` (浅) 或 `shadow-glass` (深)
- padding：24px (浅) / 40px (深)

### 4.5 `StatusTag` (统一状态徽章)

**统一用法**：

```tsx
import { StatusTag } from '@/components/common/StatusTag'

<StatusTag variant="online" />
<StatusTag variant="warning" label="告警" />
<StatusTag variant="offline" showDot pulse />
```

**样式规则**：
- 胶囊形：`rounded-full px-2.5 py-0.5 text-xs font-medium`
- 文字色 + 背景色 + 圆点颜色（见 §2.5 状态徽章色）
- 默认有 `●` 前缀（U+25CF）
- `pulse` 变体（仅 `online`）：圆点 2s 循环 box-shadow 动画
- 字体：`font-sans`（不要 monospace）

**反例**：
- ❌ 单独写 `<Tag color="success">` (没圆点，色不匹配 Bento)
- ❌ 用 emoji 圆点 `🟢` (视觉不一致)
- ❌ 不加圆点 `<span>离线</span>` (跟相邻 Tag 区分不出)

### 4.6 `Button` (主按钮 + 次按钮 + 危险)

```tsx
import { Button } from '@/components/common/Button'

<Button variant="primary">主操作</Button>
<Button variant="default">次操作</Button>
<Button variant="danger">删除</Button>
<Button variant="ghost">取消</Button>
```

| variant | 样式 |
|---|---|
| `primary` | `bg-brand-gradient text-white rounded-xl shadow-sm hover:shadow-glow hover:-translate-y-px active:scale-[0.98] font-medium` |
| `default` | `border border-ink-200 bg-white text-ink-700 rounded-xl hover:border-ink-300 font-medium` |
| `ghost`  | `text-ink-500 hover:text-ink-700 hover:bg-ink-50 rounded-xl font-medium` |
| `danger` | `bg-danger text-white rounded-xl font-medium`（仅确认删除时） |

**反例**：
- ❌ antd `<Button type="primary">`（默认蓝）
- ❌ `style={{ color: '#1677ff' }}`（破坏 token）
- ❌ 圆角 6px（antd 默认，要 10-12px）

### 4.7 `Table` (Bento 表格)

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

**样式覆盖**（写到 `app/globals.css`，**不要写在组件内**）：

```css
/* 表格行内边距 */
.ant-table-tbody > tr > td {
  padding: 16px 24px !important;
  font-size: 14px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.06) !important;
}
.ant-table-thead > tr > th {
  padding: 16px 24px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #64748b !important;
  border-bottom: 1px solid #f1f5f9 !important;
  background: rgba(237, 233, 254, 0.3) !important;  /* 极淡 brand 100 透明 */
  font-family: 'JetBrains Mono', monospace !important;
}
.ant-table-tbody > tr:hover > td { background: rgba(139, 92, 246, 0.04) !important; }
.ant-table-tbody > tr > td { border-bottom: 1px solid rgba(139, 92, 246, 0.06) !important; }
```

### 4.8 图表 (Chart)

**所有图表必须遵守**：

- 主色：`#8b5cf6` (brand-500)
- 副色：`#f472b6` (accent-400)
- 渐变填充：必须用 `linearGradient` 配 0.3 → 0 透明度
- 网格线：`rgba(15, 23, 42, 0.06)` (极弱)
- 字体：`'Outfit', 'Noto Sans SC', sans-serif`，轴标签 11px，标题 13px
- 边框：纯紫色或粉色（不用其他色）

**示例 area chart**：

```tsx
<svg className="area-chart" viewBox="0 0 800 200">
  <defs>
    <linearGradient id="gradViolet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
    </linearGradient>
  </defs>
  <path d="M0,140 C..." fill="url(#gradViolet)"/>
  <path d="M0,140 C..." fill="none" stroke="#8b5cf6" strokeWidth="2.5"/>
</svg>
```

### 4.9 侧边栏 (AdminSider / UserSider)

**统一规则**：

- 宽度：`w-60` (240px)
- 容器：`bg-white/80 backdrop-blur border-r border-ink-100`（半透明，让 Bento 背景透出来）
- Logo 块：`w-9 h-9 rounded-xl bg-brand-gradient shadow-glow` + `text-white font-bold`
- 菜单分组标题：`text-[11px] text-ink-500 uppercase tracking-wider px-3 mb-2 font-mono`
- 菜单项：`px-3 py-2.5 rounded-lg text-sm text-ink-700 hover:bg-ink-100 hover:text-brand-600`
- 选中态：`bg-gradient-to-r from-brand-50 to-accent-50/30 text-brand-600 font-medium`

**反例**：
- ❌ antd `<Layout.Sider>` 黑底（不透明，破坏 Bento 背景）
- ❌ 菜单项用 `color: '#1677ff'`

### 4.10 顶栏 (AdminHeader / UserHeader)

**统一规则**：

- 高度：`h-16` (64px)
- 容器：`bg-white/70 backdrop-blur border-b border-ink-100`（半透明 + 模糊）
- 左侧：breadcrumb + 当前页名（`text-xs text-ink-500 font-mono` + `text-sm font-medium`）
- 中间：搜索框（`bg-ink-50 border-0 rounded-xl px-4 py-2`）
- 右侧：通知铃铛 + 用户头像（`rounded-full bg-brand-gradient shadow-avatar`）

---

## 5. 状态反馈规范

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

### 5.1 EmptyState 用法

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

### 5.2 AppSkeleton 用法

| variant | 适用 | 默认 |
|---|---|---|
| `table` | 表格首屏 | 4 列 × 6 行 |
| `card` | 卡片网格首屏 | 4 张 |
| `list` | 列表首屏 | 5 行 |
| `paragraph` | 段落/详情 | 3 行 |

**何时用 Spin 而非 Skeleton**：按钮内联 loading、局部快速刷新（< 300ms）、下拉刷新。

### 5.3 ErrorBoundary 用法

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

## 6. 动画规范

> 业务组件见 `components/common/{PageTransition,StaggerList}.tsx`

### 6.1 动效 token（globals.css）

```css
--ease: cubic-bezier(.4, 0, .2, 1);
--motion-fast: .15s;   /* 按钮 / hover / focus */
--motion-base: .25s;   /* 页面切换 / 列表 stagger */
--motion-slow: .4s;    /* 玻璃卡透明度 */
```

**所有 transition 必须 ≤ 400ms**（违反会导致"卡顿"感）。

### 6.2 PageTransition（页面切换）

- 包装在 `(user)/layout.tsx` / `(admin)/layout.tsx` 的 `<main>` 内部
- pathname 变化时：fade out 200ms → 切新内容 → fade in 200ms
- 关键：必须放在 `<main>` 内部而不是外层，否则 sidebar/header 也会跟着 fade

```tsx
<main>
  <PageTransition>{children}</PageTransition>
</main>
```

### 6.3 StaggerList（列表 stagger 进入）

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

### 6.4 StatusTag pulse 动画（新增）

- 仅 `online` 变体用，圆点 2s 循环
- `box-shadow: 0 0 0 0 rgba(16,185,129,0.5)` → `0 0 0 6px rgba(16,185,129,0)` → 0
- 性能：transform + opacity 优先

### 6.5 禁止的动效

- ❌ 自动播放（无 hover 就开始）
- ❌ 旋转 / 闪烁 / 抖动
- ❌ 单一动画 > 400ms
- ❌ 整个 layout 一起 fade（PageTransition 必须包在 main 内部）
- ❌ 列表全部同时进入（要用 stagger）

---

## 7. 反模式清单（review 时强制检查）

- [ ] 没有出现 antd 默认蓝 `#1677ff` 作为主色
- [ ] 没有出现未声明的 hex / 像素值
- [ ] 没有 antd 默认圆角 6px（除细线元素）
- [ ] 没有超过 24px 的大圆角（除登录卡）
- [ ] 没有粗黑阴影（`shadow-lg`、`shadow-2xl`）
- [ ] 没有自动播放动画
- [ ] 没有 emoji 圆点（用 `●` U+25CF）
- [ ] 没有数字没加 `tabular-nums`
- [ ] 没有硬编码 padding 16px（卡片必须 24px 起）
- [ ] 没有用 antd 默认 size 紧凑 (user 端禁止 `size="small"`)
- [ ] **没有 admin 全盘 Glass Mesh**（长时间操作刺眼）
- [ ] **没有登录页用 Bento**（缺品牌冲击）

### 7.1 反白名单（合理用法，避免误报）

- **`size="small"` 在信息密集 admin 页面允许**：仪表盘（节点详情、Redis 数据、日志表格、终端列表）等需要在一屏展示大量数据行 / 字段的场景，antd 默认 size 偏松散，`size="small"` / `size="middle"` 都是合理用法。**仅 user 端用户面向页面禁止 `size="small"`**。
- **`borderRadius: 4` / `borderRadius: 8` 用于细线元素**（分割线、内嵌 Tag、小图标容器）允许，不算"硬编码圆角"。
- **`#1890ff` 不允许**（antd 默认蓝）。`SearchOutlined` 高亮态等场景应改用 `BRAND.500` 或对应语义色。
- **antd v5 deprecation**：`<Space direction="vertical|horizontal">` 在 v5 已废弃为 `orientation="vertical|horizontal"`，写新代码必须用 `orientation`，改老代码时同步替换。
- **业务组件优先**（不要自己写）：
  - 空状态用 `<EmptyState>`，**禁止**直接用 antd `<Empty>`（缺操作按钮）
  - 加载用 `<AppSkeleton variant>`，**禁止**全屏 `<Spin>`（首屏体验差）
  - 错误兜底用 `<ErrorBoundary>`（layout 顶层必加），**禁止**自写 try/catch
  - 页面切换用 `<PageTransition>`（main 内部包），**禁止**自定义 CSS transition
  - 列表入场用 `<StaggerList>`，**禁止**手写 `animationDelay`
  - 状态徽章用 `<StatusTag variant>`，**禁止**自写彩色 span
  - 主按钮用 `<Button variant="primary">`，**禁止**直接用 antd `<Button type="primary">`（默认蓝）

---

## 8. 快速参考：复制粘贴片段

### 8.1 标准 Admin 页面骨架（Bento 仪表盘）

```tsx
<main className="flex-1 flex flex-col overflow-hidden">
  <Topbar />
  <div className="flex-1 overflow-auto p-8 bg-bento-canvas">
    <PageHeader title="设备总览" extra={<Button variant="primary">导出报告</Button>} />
    <div className="grid grid-cols-12 gap-5">
      <BentoCard className="col-span-5 bento-hero">Hero KPI</BentoCard>
      <BentoCard className="col-span-3"><PageSummary ... /></BentoCard>
      ...
    </div>
    <div className="bento-card mt-6">
      <Table ... />
    </div>
  </div>
</main>
```

### 8.2 标准登录页骨架（Glass Mesh）

```tsx
<div className="bg-glass-mesh min-h-screen flex items-center justify-center p-10">
  <div className="grid grid-cols-2 gap-16 max-w-6xl w-full">
    <div className="login-hero">
      <h1 className="text-5xl font-bold text-white">管理 <em>941 台</em></h1>
      <p className="text-white/90 mt-5">...</p>
    </div>
    <div className="glass-card p-10 text-white">
      <h2>欢迎回来</h2>
      <input className="glass-input" />
      <button className="glass-submit">登 录</button>
    </div>
  </div>
</div>
```

### 8.3 品牌渐变 CSS（app/globals.css 注入）

```css
@layer utilities {
  .bg-brand-gradient {
    background: linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%);
  }
  .bg-aurora-gradient {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%);
  }
  .text-brand-gradient {
    background: linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .bento-card {
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 4px 20px -8px rgba(99, 102, 241, 0.12);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .bento-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px -8px rgba(99, 102, 241, 0.20);
  }
  .bento-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6d28d9 100%);
    color: white;
    border-color: transparent;
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 20px;
    box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.2);
  }
  .shadow-glow { box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.4); }
  .shadow-avatar { box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.3); }
}
```

### 8.4 antd ConfigProvider 主题覆盖

```ts
// providers/AntdProvider.tsx
const theme = {
  token: {
    colorPrimary: '#8b5cf6',
    colorSuccess: '#10b981',
    colorError:   '#f43f5e',
    colorWarning: '#f59e0b',
    colorInfo:    '#6366f1',
    borderRadius: 10,
    fontFamily: "Outfit, 'Noto Sans SC', sans-serif",
  },
  components: {
    Layout: {
      bodyBg: 'transparent',  // 让 Bento 背景透出来
      siderBg: 'transparent',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(139, 92, 246, 0.10)',
      itemSelectedColor: '#8b5cf6',
    },
    Table: {
      headerBg: 'rgba(237, 233, 254, 0.3)',
      borderColor: 'rgba(139, 92, 246, 0.06)',
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.7)',
    },
  },
}
```

---

## 9. 字体引入参考

`app/layout.tsx`：

```tsx
import { Outfit, JetBrains_Mono, Noto_Sans_SC } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})
const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sc',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${outfit.variable} ${jetbrains.variable} ${notoSC.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

`tailwind.config.ts` (如有)：

```ts
fontFamily: {
  sans: ['var(--font-outfit)', 'var(--font-noto-sc)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
},
```

---

## 10. 视觉稿自检清单

每次改完页面用 `bun run dev` 起来后，肉眼 / 截图过一遍：

- [ ] 主色是紫色 `#8b5cf6`（不是 antd 蓝）
- [ ] 大数字字体是 **bold + tabular-nums**
- [ ] Bento 卡片有 `backdrop-blur` 透光感（背景极光晕透出来）
- [ ] Hero 卡片是 aurora 深紫渐变（不是普通卡片）
- [ ] StatusTag 有 `●` 前缀 + 圆点颜色匹配文字
- [ ] 表格表头是 monospace + uppercase + 极淡 brand 背景
- [ ] 按钮主色是 `bg-brand-gradient` 紫粉渐变（不是纯色）
- [ ] 登录页背景是 4 色 mesh 渐变（不是纯色）
- [ ] 移动端 < 768px 全部单列堆叠
- [ ] **没有 emoji 圆点 / emoji 图标**（用 inline SVG 或字符 `●`）

---

**下一步**：见 `docs/PLAN-ui-refactor.md`（6 阶段执行计划 + commit 拆分 + 验证 + 回滚）。
