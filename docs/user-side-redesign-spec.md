# User Side Redesign — "Control Room" 主题 (2026-07-25)

> 本文件是 user 端 (`/main/*`) 视觉重设计的设计规范，作为 implementation 的 source of truth。
> 主题名: **Control Room**。参考 pear.us/cai ShadowFocus 思路 (近黑底 + 高亮 accent)，但
> 给 accent 一个**产品语义** — 黄色不是装饰，是 IoT 数据流通的"能量流"指示。

---

## 0. 背景

- **触发**: 2026-07-25 cairui 要求参考 pear.us/cai 重新设计 user 端。
- **现状**: user 端已 mobile-first 改造 (PR #70 #80 锁 375px 容器 + hamburger drawer + 2x2 PageSummary)
- **问题**: 当前视觉 (Bento+Aurora 浅色 + 紫渐变) 跟 admin 端高度同质，user 端缺独立品牌识别。
- **目标**: user 端独立视觉 — 深色为主 + 高对比度 + 暗色调控制室"实时数据"感。

## 1. 设计原则

| 原则 | 含义 | 反例 |
|---|---|---|
| **控制室语义** | 视觉要让"实时数据在流动"被看见 (黄色 pulse, status 强烈) | 静态装饰性渐变 |
| **产品差异化** | user 端跟 admin 端是 2 套视觉，同色同组件不混淆 | 跟 admin 复用 antd 默认 |
| **高对比可读性** | 深色背景 + 亮色文字，长时间看设备状态不刺眼 | 紫粉荧光叠加 |
| **375 不动** | 移动端锁宽 375px 是已 ship 的设计决策 (PR #70)，**保留不动** | 改用 full responsive |
| **token 优先** | 所有颜色 / 阴影 / 圆角 / 间距走 CSS variable，不硬编码 | inline style hex |

## 2. 设计 Token (Control Room 主题 — 仅 user 端使用)

> 写入 `app/globals.css` 跟现有 `--brand-50/100/...` 同级，prefix `--cr-` (control room)。
> 现有 Bento+Aurora 主题 token **不删**，admin 端继续用。

### 2.1 表面 (Surface)

| Token | 值 | 用途 |
|---|---|---|
| `--cr-bg` | `#0E0A1F` | 页面主背景 (比 pear.us `#110921` 更深一档，更"控制室") |
| `--cr-bg-elev-1` | `#1A1230` | 一级卡片 (PageSummary, DevCard, 设备详情 header) |
| `--cr-bg-elev-2` | `#251A40` | 二级卡片 (嵌套 / drawer / modal) |
| `--cr-bg-overlay` | `rgba(14, 10, 31, 0.85)` | drawer mask + modal 背景 |
| `--cr-border` | `rgba(255, 255, 255, 0.08)` | 卡片 / 输入框 默认边框 (subtle) |
| `--cr-border-strong` | `rgba(255, 255, 255, 0.16)` | focus / hover 边框 |

### 2.2 文字 (Text)

| Token | 值 | 用途 |
|---|---|---|
| `--cr-text-1` | `#F5F2FF` | 一级 (标题、关键数字) |
| `--cr-text-2` | `#C8C2DC` | 二级 (正文) |
| `--cr-text-3` | `#8A8499` | 三级 (副标签、说明) |
| `--cr-text-muted` | `#5A556B` | placeholder / disabled |

### 2.3 Accent — Energy Flow (黄色) ★ 签名色

| Token | 值 | 用途 |
|---|---|---|
| `--cr-accent` | `#F0B429` | 主按钮 / 高亮 / 在线指示 (比 pear `#FACA4E` 偏橙，更"能量") |
| `--cr-accent-hover` | `#FFD23F` | hover |
| `--cr-accent-active` | `#D4981E` | active / pressed |
| `--cr-accent-soft` | `rgba(240, 180, 41, 0.16)` | 选中态底色 (stat card active) |
| `--cr-accent-glow` | `0 0 20px rgba(240, 180, 41, 0.4)` | 主按钮 / 关键 CTA 的 glow |

**为什么是黄色不是青色 / 绿色**: IoT 设备控制 = 能量 = 电流 = 电流颜色。
绿色是"OK"已经用了 (`#10b981`)，重复会冲突。黄色是 status 里**没有的主色**，变成"动作 / 高亮 / 实时"专属。

### 2.4 状态色 (Status — 跟现有 semantic 对齐但深色模式优化)

| Token | 值 | 用途 |
|---|---|---|
| `--cr-status-online` | `#34D399` | 在线 (比浅色 `#10b981` 亮一档，深色背景更清晰) |
| `--cr-status-warning` | `#FBBF24` | 告警 / 离线 |
| `--cr-status-danger` | `#F87171` | 严重故障 |
| `--cr-status-offline` | `#9CA3AF` | 离线 (灰) |

### 2.5 字体 (跟现有共享)

```css
/* 跟 admin 端共用 font stack — 只在 user 端覆盖字重和字距 */
--cr-font-display: var(--font-outfit), 'Inter', system-ui;
--cr-font-body: var(--font-noto-sc), system-ui;
--cr-font-mono: var(--font-jetbrains), ui-monospace;
```

**user 端特有**:
- Tab/标题字重提到 **700** (admin 用 600)，跟 pear.us Inter 700-800 对齐
- 数字列加 `font-variant-numeric: tabular-nums` (跟现有共用)

### 2.6 圆角 / 阴影 / 间距

| Token | 值 | 备注 |
|---|---|---|
| `--cr-radius-card` | `16px` | 主卡片 (比 Bento 18 小一档，深色 + 小圆角更"控制台") |
| `--cr-radius-pill` | `999px` | status tag / chip |
| `--cr-radius-btn` | `10px` | 按钮 |
| `--cr-shadow-card` | `0 2px 12px rgba(0, 0, 0, 0.4)` | 卡片静止态 (深色阴影更明显) |
| `--cr-shadow-card-hover` | `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--cr-accent-soft)` | hover + accent border |
| `--cr-gap-section` | `16px` | 区块间距 |
| `--cr-pad-card` | `20px` | 主卡片内边距 (比 Bento 24 略小，375 容器紧张) |
| `--cr-pad-frame` | `16px` | user-content-frame 横向 padding (跟现有一致) |

## 3. 布局原则

### 3.1 锁宽 375 保留 (PR #70)

- `.user-content-frame` 锁 `max-width: 375px` 不动
- `.app-topbar-user` 锁 `max-width: 375px` 不动
- desktop 居中，左右留白
- 移动端 (≤ 375) 满宽减 16px 安全区

### 3.2 单列 / 2 列 规则

- PageSummary: 2x2 (4 项) — 跟现有 PR #70 一致
- DevCard: 永远 1 列 (375 容器下 2 列会压成 180px 太挤)
- dev/[id] 详情: 永远 1 列 stack (LiveControls + DeviceActions 都吃满 375 宽，跟现有 PR #70 一致)
- 表格 (alarm 列表): 横向滚动 (跟现有 mobile fix 一致)

### 3.3 顶部状态 (Signature element ★)

- 整站唯一一处在 topbar 右上角的"Live Pulse"指示：
  - 8px 圆点，颜色 `--cr-accent` (`#F0B429`)
  - `animation: cr-pulse 2s ease-in-out infinite`
  - 旁边 11px 大写字母 "LIVE" (字距 0.1em, 字重 700, 文字色 `--cr-text-3`)
- 整站零处其他地方用这个 pulse 动画 — 避免视觉噪音
- 即使没有真实 socket 连接，也显示"LIVE"（视觉一致性优先；之后可加 real-time indicator 强化）

## 4. 组件级规范

### 4.1 PageHeader (user 端)

```
[ 标题 h2 22px 字重 700 文字色 cr-text-1 ]
[ 副标题 13px 字重 400 文字色 cr-text-3 ]
[ 分隔线 1px cr-border 8px margin-top ]
```

**改动**:
- 标题颜色: `var(--ink-900)` → `var(--cr-text-1)`
- 副标题颜色: `var(--ink-500)` → `var(--cr-text-3)`
- 加 `--cr` 视觉变体 (`<PageHeader theme="control-room">` 默认 user 端，admin 端不传)

### 4.2 PageSummary (user 端)

**2x2 grid (4 项) — 跟现有 PR #70 一致**:
- 卡片底色 `--cr-bg-elev-1`
- 边框 1px `--cr-border`
- 圆角 `--cr-radius-card` (16px)
- padding `--cr-pad-card` (20px)
- 标签 12px 字重 500 文字色 `--cr-text-3` 大写 + tracking 0.06em
- 数值 24px 字重 700 文字色 `--cr-text-1` + tabular-nums
- 状态圆点 8px 圆，颜色跟 variant 对齐 (primary=accent / success=online / warning=warning)
- **active 态**: 底色换 `--cr-accent-soft` + 边框 `var(--cr-accent)` 1px + 圆点变 accent
- hover: `--cr-shadow-card-hover` + 边框 `--cr-border-strong`

### 4.3 DevCard (user 端)

- 卡片底色 `--cr-bg-elev-1`，1px `--cr-border`，16px 圆角
- 图片区: 顶 120px 高，背景 `--cr-bg-elev-2` 兜底
- 状态 overlay (左下): 半透明黑底 + status dot + 文字
- 标题区: 16px 字重 600 文字色 `--cr-text-1`
- 副标题: 12px mono 字体 文字色 `--cr-text-3` (mac 地址)
- 点击: 整卡可点，hover 走 `--cr-shadow-card-hover`

### 4.4 StatusTag (user 端)

- 半透明背景 (`rgba(52, 211, 153, 0.12)` for online) — 跟现有语义对齐
- 文字 12px 字重 500
- 圆点 6px，2px 间距
- 圆角 pill
- **online 变体 pulse**: 圆点 2s ease-in-out infinite 0.5 opacity 缩放 (跟现有 pulse 行为对齐)

### 4.5 Button (user 端)

| variant | 样式 |
|---|---|
| `primary` | 底色 `--cr-accent`，文字 `#0E0A1F` (深色)，hover `--cr-accent-hover` + `--cr-accent-glow` |
| `default` | 底色透明，1px `--cr-border`，文字 `--cr-text-1`，hover 边框 `--cr-accent` |
| `danger` | 底色 `--cr-status-danger`，文字白 |
| `link` | 文字 `--cr-accent`，无下划线，hover `--cr-accent-hover` |

> 跟现有 `components/common/Button` 保持 API 一致，加 `theme="control-room"` 变体
> 或在 `(user)/layout.tsx` 的 ConfigProvider 里设置 default。

### 4.6 BrandLogo (user 端)

- **不再用紫色渐变方块** — 改用 accent 黄色方块
- 文字 "UART" 改纯白 (跟随整体浅色文字)
- 副标题 "IoT Management" 隐藏 (PR #70 已 ship，showSubtitle={false})

### 4.7 AbsButton (user 端)

- 那个浮动的"我的设备"折叠按钮 — 改成右下角小圆形 floating action button
- 底色 `--cr-accent`，图标色深色
- hover glow

### 4.8 Drawer (user 端)

- 底色 `--cr-bg-elev-2` (比页面背景亮一档)
- backdrop `var(--cr-bg-overlay)` + `backdrop-filter: blur(8px)`
- menu item: 16px padding, 14px 文字大小, hover 底色 `--cr-accent-soft`, active 左 3px 黄色边

## 5. 页面级 mapping (10 个 page)

| Page | 主要变化 |
|---|---|
| `app/(user)/layout.tsx` | topbar 加 LIVE pulse + 改背景 dark; drawer 改 dark |
| `app/(user)/main/page.tsx` | PageSummary / Tabs / DevCard 全部走 control-room token |
| `app/(user)/main/dev/[id]/page.tsx` | 设备详情 header / LiveControls / DeviceActions 容器改 dark |
| `app/(user)/main/devline/[id]/page.tsx` | 设备数据表格改 dark (复用现有 antd Table v3 暗色覆盖) |
| `app/(user)/main/terminal/[id]/page.tsx` | 网关详情改 dark |
| `app/(user)/main/alarm/page.tsx` | 告警列表 + 图表改 dark |
| `app/(user)/main/userinfo/page.tsx` | 用户信息 Descriptions / Form 改 dark |
| `app/(user)/main/addterminal/page.tsx` | 添加网关表单改 dark |
| `app/(user)/main/wxline/page.tsx` | 微信线路改 dark |
| `app/(user)/main/constant/page.tsx` | 常量配置改 dark |

**所有 page 复用 `bg-cr-canvas` 顶层 class** (替代 `bg-bento-canvas`):

```css
.bg-cr-canvas {
  background:
    radial-gradient(circle at 20% 0%, rgba(240, 180, 41, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    var(--cr-bg);
  min-height: 100%;
}
```

> 微妙的双 radial-gradient: 左上角黄色能量光晕 (呼应 live) + 右下角紫色极淡的余韵
> (跟 admin 端有隐性延续)。**不抢戏** — 透明度都 ≤ 0.08。

## 6. 不改的范围

- ❌ 不动 admin 端 (`/admin/*`)
- ❌ 不动 login / loginwx / tool / wei 页面
- ❌ 不动 API 调用层 (`lib/api/*`)
- ❌ 不动状态管理 (`lib/store/*`)
- ❌ 不动 socket (`lib/socket.ts`)
- ❌ 不动权限 (`proxy.ts`)
- ❌ 不删 375px 锁宽、hamburger drawer、2x2 PageSummary、1 列设备卡 (都是已 ship 设计决策)
- ❌ 不动现存的 v3 通用组件 API (PageHeader/PageSummary/StatusTag 等)，只加 `theme` prop / 暗色变体

## 7. 实施 checklist

- [ ] `app/globals.css`: 新增 `--cr-*` token block
- [ ] `app/(user)/layout.tsx`: topbar dark + LIVE pulse + drawer dark
- [ ] `app/(user)/main/page.tsx`: PageSummary + Tabs + DevCard 切到 control-room
- [ ] `app/(user)/main/dev/[id]/page.tsx`: 详情 header + grid 容器 dark
- [ ] `app/(user)/main/devline/[id]/page.tsx`: 表格 dark
- [ ] `app/(user)/main/terminal/[id]/page.tsx`: 网关 dark
- [ ] `app/(user)/main/alarm/page.tsx`: alarm 列表 + 图表 dark
- [ ] `app/(user)/main/userinfo/page.tsx`: 用户信息 dark
- [ ] `app/(user)/main/addterminal/page.tsx`: 表单 dark
- [ ] `app/(user)/main/wxline/page.tsx`: wxline dark
- [ ] `app/(user)/main/constant/page.tsx`: constant dark
- [ ] `components/common/Button.tsx`: 加 control-room 变体
- [ ] `components/common/StatusTag.tsx`: 加 control-room 变体 (暗色背景优化)
- [ ] `components/common/PageHeader.tsx`: 加 theme="control-room"
- [ ] `components/common/PageSummary.tsx`: 加 theme="control-room"
- [ ] `components/common/BrandLogo.tsx`: 加 control-room 变体 (黄色方块 + 白字)
- [ ] `components/data/devCard.tsx`: 加 theme="control-room"
- [ ] `components/layout/AbsButton.tsx`: dark floating button
- [ ] 共享 antd ConfigProvider: user 路由组包一层 `theme={{ algorithm: theme.darkAlgorithm, ... }}`
- [ ] 实际跑 `bun run dev` 验证 10 个页面渲染 + console 无 error
- [ ] 截图 mobile 320 / 375 / 414 / desktop 1440 4 个断点
- [ ] 4 个 reviewer (visual / mobile / a11y / code) 并行审
- [ ] 修 review findings
- [ ] 推送 + 开 PR

## 8. 验收 (cross-reviewer 共用 checklist)

视觉 reviewer (verifier-A):
- [ ] 10 个 page 都在 `bg-cr-canvas` 容器内，背景一致
- [ ] 标题 / 文字 / 数字 / 状态色全部走 `--cr-*` token，0 处硬编码 hex
- [ ] 主按钮 hover 有 `--cr-accent-glow`
- [ ] LIVE pulse 圆点只在 topbar 出现 1 次

移动端 reviewer (verifier-B):
- [ ] 320 / 375 / 414 / 1440 4 断点均无横向滚动
- [ ] 320 极窄屏 (iPhone SE) 不溢出 / 不截断文字
- [ ] 1440 desktop 居中，左右留白对称
- [ ] PageSummary 2x2 在 320 / 375 不换行不溢出
- [ ] DevCard 1 列永远成立

A11y reviewer (verifier-C):
- [ ] 所有文字 vs 背景对比度 ≥ 4.5:1 (WCAG AA)
- [ ] focus 状态有明显 outline (走 `--cr-accent`)
- [ ] status 文字不只靠颜色 (text 标签 + dot 双重)
- [ ] topbar 按钮 aria-label 完整

代码质量 reviewer (verifier-D):
- [ ] 0 处 inline style hex / px (除动态值)
- [ ] 0 处 `style={{ color: 'var(--ink-900)' }}` 等混入 admin token
- [ ] 公共组件加了 theme / variant 区分，没硬改组件主体
- [ ] 没有动 admin 端任何文件
- [ ] TypeScript `tsc --noEmit` 0 error
- [ ] ESLint 0 new warning (existing baseline 不动)
