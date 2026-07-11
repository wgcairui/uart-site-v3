# Plan · UI 设计系统 v2 重构 (2+3 混合方案)

> **触发**：cairui 在 `/plan-mode` 拍板，全面重构 web 端视觉
> **目标分支**：`feat/ui-design-system-v2`
> **范围**：设计 token 体系更新 + 业务页面视觉重构
> **完成定义**：`tsc --noEmit` 0 错误 + `bun run lint` 通过 + `bun run build` 通过 + 4 个核心域页面视觉验证
> **视觉稿**：`docs/assets/hybrid-design-2-3.html`（5 屏 + 移动端 + token 代码）
> **设计规范**：`docs/style-guide.md` v2 + `docs/components.md` v2

---

## 0. 上下文（必读）

### 0.1 风格决策

**基线**：2+3 混合方案（**Bento + Aurora** 数据展示 + **Glass + Mesh** 品牌入口）

- 品牌色：`#8b5cf6` (brand-500 紫) + `#f472b6` (accent-400 粉)
- 字体：Outfit + Noto Sans SC + JetBrains Mono
- 圆角：18px (Bento) / 20px (Glass) / 24px (登录)
- 阴影：紫光晕 + Glass 透光
- 动效：≤400ms，hover 抬升 + 紫光晕加强

### 0.2 按页面类型分工

| 类型 | 风格 | 容器 | 适用 |
|---|---|---|---|
| **数据展示** | Bento + Aurora | `<BentoCard>` / `<BentoCard variant="hero">` | admin 仪表盘 / 列表 / 协议 / 日志 / 数据 |
| **混合型** | Bento 主体 + Glass 装饰 | `<BentoCard>` + `<GlassCard variant="light\|tinted">` | 设备详情（数据 Bento + 操作 Glass） |
| **品牌入口** | Glass + Mesh | `<GlassCard variant="dark">` | 登录 / Landing / 试用页 |

### 0.3 范围

**✅ 在范围内**：
- design tokens 全部更新（紫色系）
- 通用组件重写（Button / StatusTag / BentoCard / GlassCard / PageHeader / PageSummary 等）
- 业务页面视觉统一（admin + user 端所有 page.tsx）
- 移动端适配（首页 / 详情 / 登录 3 屏）
- 字体替换（Inter → Outfit + JetBrains Mono）
- antd 主题覆盖（AntdProvider + token）

**❌ 不在范围内**：
- 业务逻辑改动（纯视觉/结构调整）
- 新增功能（如 dark mode — 仅预留 token）
- 数据获取层（lib/api/* 不动）
- 后端 API（midwayuartserver 不动）
- 旧的方案 C 文档清理（已归档到 `docs/archive/2026-07-c-minimal-saas/`，保留 git 历史）

### 0.4 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 玻璃卡性能差（`backdrop-blur` 开销） | 中 | 中 | 限制单页 `backdrop-blur` 数量 ≤ 5；用 Chrome Performance 验证 |
| 紫色系跟用户既有视觉习惯冲突 | 低 | 中 | 保留 `accent-400` 粉色过渡，用户接受度高 |
| 字体加载阻塞首屏 | 低 | 中 | `display: swap` + 字体子集化（latin + 必要中文权重） |
| antd v5 内部样式跟 utility class 冲突 | 中 | 高 | globals.css 用 `!important` 覆盖 + AntdProvider components token 微调 |
| 旧页面里硬编码颜色/尺寸散落 | 高 | 中 | 按域分批 commit，每批末尾跑 grep 验证 |
| 移动端 Glass Mesh 性能 | 中 | 中 | 移动端禁用 Mesh 渐变背景，用纯 Bento 渐变 |

---

## 1. 已完成（前置工作）

| 文件 | 操作 | 状态 |
|---|---|---|
| `docs/archive/2026-07-c-minimal-saas/` | 备份旧方案 C 文档 | ✅ |
| `docs/assets/hybrid-design-2-3.html` | 视觉稿 (5 屏 + 移动端 + token) | ✅ 58KB |
| `docs/style-guide.md` v2 | 重写为 2+3 混合规范 | ✅ |
| `docs/components.md` v2 | 重写组件库规范 | ✅ |
| `docs/CLAUDE.md` | 文档索引（待重写） | ⏳ |
| `lib/utils/designTokens.ts` | 重写为紫色系（待执行） | ⏳ |
| `app/globals.css` | :root + utility class 注入（待执行） | ⏳ |

---

## 2. 待办清单（按依赖顺序执行）

### Stage A · 设计 token + 全局 CSS（约 1.5 小时）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `app/globals.css` | **追加** | `:root` 段：注入 `--brand-*` / `--accent-*` / `--ink-*` / `--success/warning/danger` 颜色变量 + `--font-sans/mono` 字体变量 + `--shadow-bento/glass/glow/avatar` 阴影变量 + `@layer utilities` 注入 `bg-brand-gradient` / `bg-aurora-gradient` / `bento-card` / `glass-card` / `bg-bento-canvas` / `bg-glass-mesh` 等 utility class + `ant-table` 行 padding 覆盖 + StatusTag 6 种 variant 样式 |
| `app/layout.tsx` | **重写** | 引入 Outfit + JetBrains_Mono + Noto_Sans_SC (next/font/google)，注入到 `<html>` 根 className，body 用 `font-sans` |
| `providers/AntdProvider.tsx` | **重写** | theme.token 全部用新紫色系（`colorPrimary: '#8b5cf6'`, `colorSuccess: '#10b981'`, `colorError: '#f43f5e'`, `colorWarning: '#f59e0b'`, `colorInfo: '#6366f1'`, `borderRadius: 10`, `fontFamily: "Outfit, 'Noto Sans SC', sans-serif"`）+ components token 覆盖（Layout bodyBg/siderBg 透明、Menu selected 品牌色、Table headerBg 极淡 brand-100、Card 透明背景） |
| `lib/utils/designTokens.ts` | **重写** | BRAND (50-950) + ACCENT (300-500) + INK (50-900) + SEMANTIC (primary/success/warning/danger/info) + STATUS (online/offline/warning/error/info/idle) + BG + RADIUS (sm/md/lg/xl) + SHADOW (bento/bento-hover/glass/glow/avatar) + FONT (sans/mono) + GRADIENTS (brand/aurora) |
| `tailwind.config.ts` (如有) | 调整 | fontFamily 改用 CSS 变量引用，加品牌色映射（如有） |

### Stage B · 通用组件库（约 2 小时）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `components/common/BentoCard.tsx` | **新建** | `bento-card` 容器，4 个 prop（children, className, variant, hoverable, padding），参考 `style-guide.md §2.3` |
| `components/common/GlassCard.tsx` | **新建** | `glass-card` 容器，3 个 variant（light/tinted/dark），参考 `style-guide.md §2.4` |
| `components/common/StatusTag.tsx` | **新建** | 6 个 variant（online/offline/warning/error/info/idle），6 个色板（来自 status 列表），可选 pulse + size，参考 `style-guide.md §2.5 + §4.5` |
| `components/common/Button.tsx` | **重写** | 5 个 variant（primary/default/ghost/danger/link），主按钮走 `bg-brand-gradient` 紫粉渐变 + `shadow-glow` hover，参考 `style-guide.md §4.6` |
| `components/common/PageHeader.tsx` | **重写** | 容器用 `flex items-end justify-between mb-8 pb-3 border-b border-ink-100`，h1 `text-2xl font-bold tracking-tight` |
| `components/common/PageSummary.tsx` | **重写** | 4 列 Bento 网格，item 走 `<BentoCard>`，label `text-xs text-brand-500 font-mono uppercase tracking-wider`，val `text-3xl font-bold text-ink-900 tabular-nums` |
| `components/common/SectionTitle.tsx` | **重写** | `flex items-center gap-2 mb-4 font-semibold text-base text-ink-900` |
| `components/common/KVList.tsx` | **重写** | label `text-sm text-ink-500`，value `text-sm text-ink-900 font-medium`，行间虚线分隔，支持 1/2/3 列 |
| `components/common/StatCard.tsx` | **重写** | 视觉跟 PageSummary 统一（同一个 StatCardItem 内部组件），可单独用 |
| `components/common/MyInput.tsx` | 改样式 | 主按钮换 `<Button variant="primary">`，去掉 inline style |
| `components/common/MyCopy.tsx` | 改样式 | 按钮用 brand 主色，去掉 inline color |
| `components/common/MyDatePickerRange.tsx` | 改样式 | Form 容器加 32px 边距，去掉 inline marginBottom |
| `components/common/UserDropdown.tsx` | 改样式 | Avatar 换 `bg-brand-gradient` 圆形 + 28px + `shadow-avatar` |
| `components/common/AddUserTerminalModal.tsx` | 改样式 | Modal `okButtonProps` 走品牌色，Descriptions 改 KVList 风格 |

### Stage C · 布局组件（约 1 小时）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `components/layout/AdminSider.tsx` | **重写** | 用 `bg-white/80 backdrop-blur border-r border-ink-100`，Logo `bg-brand-gradient rounded-xl shadow-glow`，菜单选中 `bg-gradient-to-r from-brand-50 to-accent-50/30 text-brand-600` |
| `components/layout/AdminHeader.tsx` | **重写** | 用 `bg-white/70 backdrop-blur border-b border-ink-100`，搜索 `bg-ink-50 border-0 rounded-xl`，头像 `bg-brand-gradient shadow-avatar` |
| `components/layout/AbsButton.tsx` | 暂不改 | 后续清理 |
| `components/layout/UserSider.tsx` (如有) | **重写** | 同 AdminSider 风格 |
| `components/layout/UserHeader.tsx` (如有) | **重写** | 同 AdminHeader 风格 |

### Stage D · 路由 layout（约 30 分钟）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `app/(admin)/layout.tsx` | 调整容器 | 移除 antd `<Layout>`，用 flex 容器 + 透明背景（让 Bento canvas 透出来）+ 引入 `<BentoCanvas>` 顶层 |
| `app/(user)/layout.tsx` | 调整容器 | 同上模式 |

### Stage E · 业务页面视觉重构（约 3-4 小时，按域分批）

**优先级顺序**（按使用频率 + 业务核心度）：

**E1 · 仪表盘 + 设备域（核心 1 小时）**：
- `app/(admin)/admin/page.tsx` + `app/(admin)/admin/_sections/*` (7 个 section) → 全部改 Bento 12 列 grid
- `app/(user)/main/page.tsx` → Bento 2 列 KPI + 设备状态列表
- `app/(admin)/admin/node/terminal/page.tsx` + `components/terminal/TerminalsTable.tsx` → Bento 表
- `app/(admin)/admin/node/terminal/[id]/page.tsx`（设备详情）→ DeviceDetailHero + DeviceControlPanel + DeviceActionPanel 三件套
- `app/(user)/main/dev/[id]/page.tsx` → 同上简化版
- `components/terminal/DeviceDetailHero.tsx` + `DeviceControlPanel.tsx` + `DeviceActionPanel.tsx` → 新建 3 个 v2 组件

**E2 · 协议域（45 分钟）**：
- `app/(admin)/admin/node/protocols/page.tsx` + `info/page.tsx`
- `components/protocol/*.tsx` 14 个 → 视觉统一

**E3 · 日志域（45 分钟）**：
- `app/(admin)/admin/log/*` 全部（12 个页面）
- `components/log/*` 全部（6 个组件）

**E4 · 数据 / 微信 / 其他（30 分钟）**：
- `app/(admin)/admin/data/*` (11 个组件 + 2 个页面)
- `app/(admin)/admin/wx/*`
- `app/(admin)/admin/node/*` (剩余：nodes / user)
- `app/(user)/main/*` (剩余：addterminal / terminal / profile 等)

**E5 · 移动端适配（30 分钟）**：
- 3 屏布局（首页 / 详情 / 登录）走 Bento 单列
- 登录页（`app/login/page.tsx` 或 `app/(auth)/login/page.tsx`）→ Glass + Mesh

**每个页面的标准改动清单**：
- [ ] PageHeader 用 `<PageHeader>`
- [ ] PageSummary 用 `<PageSummary>` + `<BentoCard>` 内嵌
- [ ] Table 行内边距由 globals.css 强制覆盖（24×16），无需逐个改
- [ ] 状态 Tag 换 `<StatusTag variant>`
- [ ] 主按钮换 `<Button variant="primary">`
- [ ] 次按钮换 `<Button variant="default">`
- [ ] 删除 inline style（`style={{ color: '#1677ff' }}` 这种）
- [ ] 删除 antd 默认蓝 `#1677ff` 引用
- [ ] 设备详情页加 DeviceDetailHero + DeviceControlPanel + DeviceActionPanel
- [ ] 登录页加 Glass + Mesh 背景

---

## 3. 测试验证（必做）

按顺序跑，每步不通过就停下修复：

```bash
# 1. TypeScript 检查（项目 CLAUDE.md 说 IDE 误报，以这个为准）
cd /Users/cairui/Code/uart-site-v3
node node_modules/.bin/tsc --noEmit --project tsconfig.json

# 2. ESLint
bun run lint

# 3. 生产构建（会暴露所有 antd token / CSS-in-JS 问题）
bun run build

# 4. 启动 dev server 人工冒烟
bun run dev &
DEV_PID=$!
sleep 5
curl -sS http://localhost:3000/ -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/login -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/main -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/admin -o /dev/null -w "HTTP %{http_code}\n"
kill $DEV_PID

# 5. 视觉自检（用浏览器打开关键页面）
open http://localhost:3000/login          # Glass + Mesh
open http://localhost:3000/main/dev/...   # Bento + Glass 混合
open http://localhost:3000/admin          # Bento + Aurora
```

任何一项失败 → **fix then re-run**（不要跳过）。

**已知风险**：
- antd Modal / Dropdown / DatePicker 内部用的是 emotion CSS-in-JS，部分样式可能逃过 globals.css 的 `!important` 覆盖 → 需要在 AntdProvider 的 components token 里微调
- 旧页面里如果有 `style={{ borderRadius: 6 }}` 这种会跟 18-20px 卡片冲突 → 改成 `<BentoCard>` / `<GlassCard>` 或删除
- 表格在紧凑场景（比如 ProtocolDetail）可能因为 18px 圆角导致内容挤压 → 必要时给单个 `<Table size="small">`
- 玻璃卡 `backdrop-blur` 在低端设备卡 → 限制单页 ≤ 5 个，可考虑 `prefers-reduced-transparency` 降级

---

## 4. Commit + Push + PR

### 4.1 Commit 拆分（按 stage 拆，保持原子化）

```bash
cd /Users/cairui/Code/uart-site-v3

# Stage A · 设计 token
git checkout -b feat/ui-design-system-v2
git add app/globals.css app/layout.tsx providers/AntdProvider.tsx lib/utils/designTokens.ts docs/
git commit -m "feat(ui): 2+3 混合设计系统 token (Bento + Glass + Mesh) + 字体替换 + 视觉规范文档"

# Stage B · 通用组件
git add components/common/BentoCard.tsx components/common/GlassCard.tsx components/common/StatusTag.tsx components/common/Button.tsx
git commit -m "feat(common): BentoCard + GlassCard + StatusTag + Button 基础组件 (v2)"

git add components/common/PageHeader.tsx components/common/PageSummary.tsx components/common/SectionTitle.tsx components/common/StatCard.tsx components/common/KVList.tsx
git commit -m "refactor(common): PageHeader/PageSummary/SectionTitle/StatCard/KVList 应用 v2 设计系统"

git add components/common/MyInput.tsx components/common/MyCopy.tsx components/common/MyDatePickerRange.tsx components/common/UserDropdown.tsx components/common/AddUserTerminalModal.tsx
git commit -m "style(common): MyInput/MyCopy/MyDatePickerRange/UserDropdown/AddUserTerminalModal 应用 v2 品牌样式"

# Stage C · 布局
git add components/layout/
git commit -m "feat(layout): AdminSider/AdminHeader 应用 2+3 混合视觉"

# Stage D · 路由 layout
git add 'app/(admin)/layout.tsx' 'app/(user)/layout.tsx'
git commit -m "refactor(layout): 路由 layout 改为 v2 视觉容器"

# Stage E1 · 仪表盘 + 设备域
git add 'app/(admin)/admin/page.tsx' 'app/(admin)/admin/_sections/' 'app/(user)/main/page.tsx'
git commit -m "refactor(admin/user): 仪表盘首页套用 Bento + Aurora 视觉"

git add 'app/(admin)/admin/node/terminal/' 'components/terminal/TerminalsTable.tsx'
git add components/terminal/DeviceDetailHero.tsx components/terminal/DeviceControlPanel.tsx components/terminal/DeviceActionPanel.tsx
git commit -m "feat(terminal): 设备详情 3 件套 (Hero + Control + Action) + 设备列表 Bento"

# Stage E2 · 协议域
git add 'app/(admin)/admin/node/protocols/' 'components/protocol/'
git commit -m "refactor(protocol): 协议域 14 个组件 + 2 个页面应用 v2 视觉"

# Stage E3 · 日志域
git add 'app/(admin)/admin/log/' 'components/log/'
git commit -m "refactor(log): 日志域 12 个页面 + 6 个组件应用 v2 视觉"

# Stage E4 · 数据 / 微信 / 其他
git add 'app/(admin)/admin/data/' 'app/(admin)/admin/wx/' 'app/(admin)/admin/node/' 'app/(user)/main/'
git commit -m "refactor(data/wx/other): 数据/微信/其他 域应用 v2 视觉"

# Stage E5 · 移动端
git add 'app/(auth)/' 'app/login/'
git commit -m "refactor(login): 登录页改 Glass + Mesh 渐变背景 + 玻璃登录卡"

# Stage F · 文档 + 收尾
git add docs/CLAUDE.md
git commit -m "docs(CLAUDE): 文档索引更新到 v2"
```

### 4.2 Push + PR

```bash
# 当前在 feat/ui-design-system-v2
git push -u origin feat/ui-design-system-v2

# PR body 写文件（避免 zsh 转义坑）
cat > /tmp/pr-body-ui-v2.md <<'EOF'
## Summary
应用 2+3 混合视觉规范（Bento + Aurora + Glass + Mesh）到整个 v3 项目：

### 核心变更
- **品牌色**：从 `#6366f1 → #06b6d4` 紫蓝渐变 → `#8b5cf6 → #f472b6` 紫粉渐变
- **字体**：`Inter + PingFang SC` → `Outfit + Noto Sans SC + JetBrains Mono`
- **圆角**：16px 主卡 → 18-20px Bento/Glass + 24px 登录卡
- **阴影**：单层浅阴影 → 多层紫光晕（`shadow-bento` / `shadow-glow` / `shadow-avatar`）
- **新分视觉**：按页面用途分 Bento（数据）/ Glass（装饰）/ Mesh（品牌）

### 新增通用组件
- `BentoCard` - Bento 风格容器（替代 antd Card）
- `GlassCard` - 3 variant 玻璃容器（light / tinted / dark）
- `StatusTag` - 6 variant 状态徽章（online / offline / warning / error / info / idle）
- `Button` 重写 - 5 variant（primary / default / ghost / danger / link）

### 业务页面统一
- 仪表盘 / 设备 / 协议 / 日志 / 数据 5 大域约 30 个 page.tsx
- 设备详情 3 件套（DeviceDetailHero + DeviceControlPanel + DeviceActionPanel）
- 登录页改 Glass + Mesh 渐变背景

## 视觉参考
- 完整规范：`docs/style-guide.md` v2
- 组件规范：`docs/components.md` v2
- 设计稿（5 屏 + 移动端 + token 代码）：`docs/assets/hybrid-design-2-3.html`
- 旧方案归档：`docs/archive/2026-07-c-minimal-saas/`（保留 git 历史，**不参考**）

## Test plan
- [x] `tsc --noEmit` 0 errors
- [x] `bun run lint` pass
- [x] `bun run build` pass
- [x] dev server 冒烟 /login /main /admin 全部 200
- [ ] 人工 review 关键页面截图（admin 首页 / 设备列表 / 设备详情 / 登录页）

## 已知遗留
（运行时补充）
EOF

gh pr create --base main --head feat/ui-design-system-v2 \
  --title "feat(ui): 应用 2+3 混合视觉规范 (Bento + Glass + Mesh) · 全面重构" \
  --body-file /tmp/pr-body-ui-v2.md
```

### 4.3 PR 创建可能踩的坑（参考 memory `git-pr-and-mr-workflow.md`）

- `gh pr create` 报 "must be a collaborator" → 改用 REST API（`curl + GH_TOKEN`）
- GH_TOKEN 来源：`source ~/.config/credentials/.env.local` + `export $(grep '^GH_TOKEN=' ... | xargs)`
- zsh 多行字符串问题 → 走 `--body-file` 不用 `--body`
- gh CLI 不认 GH_TOKEN env var → 必须 export GITHUB_TOKEN 或走 curl

---

## 5. 回滚预案

如果发现严重问题需要回滚：

```bash
# 当前分支所有未提交改动回滚（保留文件）
git restore .

# 删除整个 feat 分支（已 push 后用 -D 强删）
git checkout main
git branch -D feat/ui-design-system-v2
git push origin --delete feat/ui-design-system-v2
```

`docs/style-guide.md` / `docs/components.md` / `docs/PLAN-ui-refactor.md` 是 v2 独立文档，回滚不影响其他分支。`docs/archive/2026-07-c-minimal-saas/` 保留 git 历史可恢复。

---

## 6. 时间预算

| 阶段 | 预计耗时 |
|---|---|
| Stage A · 设计 token + 全局 CSS | 1.5 小时 |
| Stage B · 通用组件库 | 2 小时 |
| Stage C · 布局组件 | 1 小时 |
| Stage D · 路由 layout | 30 分钟 |
| Stage E1 · 仪表盘 + 设备域 | 1 小时 |
| Stage E2 · 协议域 | 45 分钟 |
| Stage E3 · 日志域 | 45 分钟 |
| Stage E4 · 数据 / 微信 / 其他 | 30 分钟 |
| Stage E5 · 移动端 + 登录页 | 30 分钟 |
| Stage F · 文档 + 收尾 | 20 分钟 |
| **合计** | **~8-9 小时** |

如果超时，**优先保证**：
1. tsc + build 通过（必须有）
2. 视觉稿 5 屏对应核心页面（仪表盘 / 设备列表 / 设备详情 / 登录）
3. 通用组件库完成（Stage A + B）
4. PR 创建（必须）

可降级（延后到下个 PR）：
- 日志域页面（12 个）可只改关键 3-4 个
- 数据/微信域可只改入口
- 移动端可只做首页 + 详情，登录延后

---

## 7. 报告模板

PR 创建成功后给用户报告：

```
✅ UI 重构 v2 完成
- PR: <url>
- 改动统计: X files, +Y/-Z lines
- 视觉稿: docs/assets/hybrid-design-2-3.html
- 自测: tsc / lint / build 全通过
- 已知遗留: <如有未完成的页面，列出来>
```

如有遗留未完成项，**不要**自动 commit 那些页面，保持 PR 干净。

---

## 8. 关键变更对照表（旧 → 新）

| 维度 | 旧（方案 C） | 新（2+3 混合） |
|---|---|---|
| 主色 | `#6366f1` 紫 | `#8b5cf6` 紫 |
| 强调色 | `#06b6d4` 青 | `#f472b6` 粉 |
| 渐变 | 紫→青 | 紫→粉 |
| 字体 | Inter + PingFang SC | Outfit + Noto Sans SC + JetBrains Mono |
| 主圆角 | 16px | 18px (Bento) / 20px (Glass) / 24px (登录) |
| 主阴影 | 单层浅 | 紫光晕多层 |
| 容器 | antd `<Card>` | `<BentoCard>` / `<GlassCard>` |
| 状态 | antd `<Tag>` (绿/黄/红) | `<StatusTag>` (6 种语义 + 圆点) |
| 主按钮 | `<Button type="primary">` (蓝) | `<Button variant="primary">` (紫粉渐变) |
| 表格表头 | 浅灰 | 极淡 brand-100 + JetBrains Mono |
| 数字字体 | 默认 | `font-bold tabular-nums` |
| 登录页 | 普通白底 | Glass + Mesh 4 色渐变 |
| 设备详情 | 平面布局 | Hero (aurora) + Control (glass-light) + Action (glass-tinted) |
| 移动端 | 默认响应式 | 3 屏专用布局 (首页 / 详情 / 登录) |

---

## 9. 后续 (不在 v2 范围)

- **dark mode** — token 已留接口（`useUIStore` + `theme.darkAlgorithm`），后续按需启用
- **新组件** — `<UserProfileHero>` (user 端我的页面) / `<LogFilterPanel>` (日志域)
- **可访问性** — WCAG 2.1 AA 全面审计（玻璃卡文字对比度 ≥ 4.5:1）
- **Storybook** — 通用组件独立展示 + props 文档化
- **E2E 视觉回归** — Playwright 截图对比 CI
