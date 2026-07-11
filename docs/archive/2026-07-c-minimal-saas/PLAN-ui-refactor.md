# Plan · UI 组件库 + 页面重构

> **触发**：cron 2 小时后自动开始
> **目标分支**：`feat/ui-design-system`
> **范围**：组件库基础建设 + 业务页面视觉重构
> **完成定义**：tsc 0 错误 + bun run build 通过 + PR 创建并通过 CI

---

## 0. 上下文（必读）

- 用户选定了 UI 风格方向：**方案 C · 浅色极简 SaaS**
- 完整视觉规范：`docs/style-guide.md`
- 组件库规范：`docs/components.md`
- 设计 Demo：`/tmp/uart-ui-demo/c-minimal-saas.html`
- 当前分支：`feat/ui-design-system`（从 main 拉出，已与 main 同步）

## 1. 已完成（预热阶段，不需重做）

| 阶段 | 文件 | 状态 |
|---|---|---|
| 设计 tokens | `app/globals.css` | ✅ 重写 |
| Theme provider | `providers/AntdProvider.tsx` | ✅ 应用方案 C theme.token |
| Token 常量 | `lib/utils/designTokens.ts` | ✅ 新建（BRAND/INK/SEMANTIC/BG/RADIUS/SHADOW/FONT） |
| 品牌 Logo | `components/common/BrandLogo.tsx` | ✅ 新建 |
| 统一按钮 | `components/common/Button.tsx` | ✅ 新建 |
| 设计文档 | `docs/style-guide.md` + `docs/components.md` + `docs/CLAUDE.md` | ✅ |

这些改动**未提交**，是 feat/ui-design-system 的当前工作区状态。开始执行时先 `git status` 确认。

---

## 2. 待办清单（按依赖顺序执行）

### Stage A · 组件库剩余（约 1 小时）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `components/common/StatusTag.tsx` | 新建 | 统一状态徽章（online/warning/offline/error/info），用 `globals.css` 的 `.status-tag-*` 类 |
| `components/common/PageHeader.tsx` | **重写** | 用 `.app-page-header` 类 + `<h1>` + 可选 `<p>` subtitle + extra 按钮区 |
| `components/common/PageSummary.tsx` | **重写** | 用 `.stat-card` + variant 语义色 + 右上角 `.stat-card-icon` + tabular-nums |
| `components/common/SectionTitle.tsx` | **重写** | 用 `.app-section-title`，移除 antd Divider |
| `components/common/StatCard.tsx` | **重写** | 视觉跟 PageSummary 统一（同一个 StatCardItem 内部组件） |
| `components/common/KVList.tsx` | **重写** | 用 `.app-card` + `.app-section-title`，去掉 antd Card 强样式 |
| `components/common/MyInput.tsx` | 改样式 | 主按钮换 `Button variant="primary"`，去掉 inline style |
| `components/common/MyCopy.tsx` | 改样式 | 按钮用 brand 主色，去掉 inline color |
| `components/common/MyDatePickerRange.tsx` | 改样式 | Form 容器加 32px 边距，去掉 inline marginBottom |
| `components/common/UserDropdown.tsx` | 改样式 | Avatar 换 brand-gradient 圆形 + 28px |
| `components/common/AddUserTerminalModal.tsx` | 改样式 | Modal `okButtonProps` 走品牌色，Descriptions 改 KVList 风格 |

### Stage B · 布局组件（约 30 分钟）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `components/layout/AdminSider.tsx` | **重写** | 用 `.app-sider` + `.sider-menu-*` + BrandLogo，移除 antd Sider 黑底 |
| `components/layout/AdminHeader.tsx` | **重写** | 用 `.app-topbar`，半透明 + blur，右侧用 UserDropdown 优化 |
| `components/layout/AbsButton.tsx` | 暂不改 | 后续清理 |

### Stage C · 路由 layout（约 20 分钟）

| 文件 | 操作 | 关键改动 |
|---|---|---|
| `app/(admin)/layout.tsx` | 调整容器 | 移除 antd `<Layout>`，用 flex 容器 + `.app-sider` + `.app-topbar` + `.scroll-area` |
| `app/(user)/layout.tsx` | 调整容器 | 同上模式 |

### Stage D · 业务页面视觉重构（约 2-3 小时）

**优先级顺序**（按使用频率）：

1. **仪表盘首页**（admin + user 各一个）
   - `app/(admin)/admin/page.tsx`
   - `app/(admin)/admin/_sections/*`（7 个 section 组件）
   - `app/(user)/main/page.tsx`

2. **设备/终端管理**（核心域）
   - `app/(admin)/admin/node/terminal/page.tsx` + `components/terminal/TerminalsTable.tsx`
   - `app/(admin)/admin/node/nodes/page.tsx`
   - `app/(admin)/admin/node/user/page.tsx`

3. **协议域**（14 个组件 + 2 个页面）
   - `app/(admin)/admin/node/protocols/page.tsx` + `info/page.tsx`
   - 所有 `components/protocol/*.tsx` 视觉统一

4. **日志域**（12 个页面 + 6 个组件）
   - `app/(admin)/admin/log/*` 全部
   - `components/log/*` 全部

5. **数据 / 微信 / 其他**（剩余 ~10 个页面）
   - `app/(admin)/admin/data/*`
   - `app/(admin)/admin/wx/*`
   - `app/(user)/main/*`

**每个页面的标准改动清单**：
- [ ] PageHeader 用 `.app-page-header` 样式
- [ ] PageSummary 用 `.stat-card` 系列
- [ ] Table 行内边距检查（antd 表格已被 globals.css 强制改 24×16，无需逐个改）
- [ ] 状态 Tag 换 `<StatusTag variant="online|warning|offline|error|info">`
- [ ] 主按钮换 `<Button variant="primary">`
- [ ] 次按钮换 `<Button variant="default">`
- [ ] 删除 inline style（`style={{ color: '#1677ff' }}` 这种）
- [ ] 删除 antd 默认蓝 `#1677ff` 引用

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

# 4. 启动 dev server 人工冒烟（不需要截图，但跑一下确认无 runtime error）
bun run dev &
DEV_PID=$!
sleep 5
curl -sS http://localhost:3000/ -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/login -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/main -o /dev/null -w "HTTP %{http_code}\n"
curl -sS http://localhost:3000/admin -o /dev/null -w "HTTP %{http_code}\n"
kill $DEV_PID
```

任何一项失败 → **fix then re-run**（不要跳过）。

**已知风险**：
- antd Modal / Dropdown / DatePicker 内部用的是 emotion CSS-in-JS，部分样式可能逃过 globals.css 的 `!important` 覆盖 → 需要在 AntdProvider 的 components token 里微调
- 旧页面里如果有 `style={{ borderRadius: 6 }}` 这种会跟 16px 卡片冲突 → 改成 `.app-card` 或删除
- 表格在紧凑场景（比如 ProtocolDetail）可能因为 16px 行高导致内容挤压 → 必要时给单个 `<Table size="small">`

---

## 4. Commit + Push + PR

### Commit 拆分（按 stage 拆，保持原子化）

```bash
cd /Users/cairui/Code/uart-site-v3
git add app/globals.css providers/AntdProvider.tsx lib/utils/designTokens.ts docs/
git commit -m "feat(ui): design system tokens + 视觉规范文档"

git add components/common/BrandLogo.tsx components/common/Button.tsx components/common/StatusTag.tsx
git commit -m "feat(common): BrandLogo + Button + StatusTag 基础组件"

git add components/common/PageHeader.tsx components/common/PageSummary.tsx components/common/SectionTitle.tsx components/common/StatCard.tsx components/common/KVList.tsx
git commit -m "refactor(common): PageHeader/PageSummary/SectionTitle/StatCard/KVList 应用设计系统"

git add components/common/MyInput.tsx components/common/MyCopy.tsx components/common/MyDatePickerRange.tsx components/common/UserDropdown.tsx components/common/AddUserTerminalModal.tsx
git commit -m "style(common): MyInput/MyCopy/MyDatePickerRange/UserDropdown/AddUserTerminalModal 应用品牌样式"

git add components/layout/AdminSider.tsx components/layout/AdminHeader.tsx
git commit -m "feat(layout): AdminSider/AdminHeader 应用方案 C 视觉"

git add 'app/(admin)/layout.tsx' 'app/(user)/layout.tsx'
git commit -m "refactor(layout): 路由 layout 改为新视觉容器"

git add 'app/(admin)/admin/page.tsx' 'app/(admin)/admin/_sections/' 'app/(user)/main/page.tsx'
git commit -m "refactor(admin/user): 仪表盘首页套用方案 C 视觉"

# 业务页面按域拆多个 commit（terminal/protocol/log/data/wx）
```

### Push + PR

```bash
# 当前在 feat/ui-design-system
git push -u origin feat/ui-design-system

# PR body 写文件（避免 zsh 转义坑）
cat > /tmp/pr-body-ui-design-system.md <<'EOF'
## Summary
应用方案 C 视觉规范（浅色极简 SaaS）到整个 v3 项目：
- 品牌色统一 `#6366f1 → #06b6d4` 渐变
- 中性色阶 + 16px 卡片圆角
- 统一状态徽章 / 按钮 / PageHeader / PageSummary
- antd table 统一 24×16 行内边距

## 视觉参考
- 完整规范：`docs/style-guide.md`
- Demo：`/tmp/uart-ui-demo/c-minimal-saas.html`
- 组件规范：`docs/components.md`

## 改动范围
- **新增**：`lib/utils/designTokens.ts` + `components/common/BrandLogo.tsx` + `Button.tsx` + `StatusTag.tsx`
- **重写**：`PageHeader` / `PageSummary` / `SectionTitle` / `StatCard` / `KVList` / `AdminSider` / `AdminHeader`
- **样式调整**：所有 admin/user 页面（~30 个 page.tsx）
- **主题**：`AntdProvider` 注入方案 C theme.token
- **全局 CSS**：`app/globals.css` 注入 design tokens + 表格/卡片/输入框覆盖

## 不在范围内
- dark mode（仅预留 token，未来扩展）
- 业务逻辑改动（纯视觉/结构调整）

## Test plan
- [x] `tsc --noEmit` 0 errors
- [x] `bun run lint` pass
- [x] `bun run build` pass
- [x] dev server 冒烟 /login /main /admin 全部 200
- [ ] 人工 review 关键页面截图（admin 首页 / 设备列表 / 协议详情 / 日志）
EOF

gh pr create --base main --head feat/ui-design-system \
  --title "feat(ui): 应用方案 C 视觉规范 · 组件库 + 页面重构" \
  --body-file /tmp/pr-body-ui-design-system.md
```

### PR 创建可能踩的坑（参考 memory `git-pr-and-mr-workflow.md`）

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
git branch -D feat/ui-design-system
git push origin --delete feat/ui-design-system
```

`docs/style-guide.md` 和 `docs/components.md` 是独立文档，回滚不影响其他分支。

---

## 6. 时间预算

| 阶段 | 预计耗时 |
|---|---|
| Stage A · 组件库剩余 | 1 小时 |
| Stage B · 布局组件 | 30 分钟 |
| Stage C · 路由 layout | 20 分钟 |
| Stage D · 业务页面 | 2-3 小时 |
| Stage E · 测试 + 修复 | 30 分钟 |
| Stage F · Commit + PR | 20 分钟 |
| **合计** | **~5-6 小时** |

如果超时，**优先保证**：
1. tsc + build 通过（必须有）
2. admin 首页 + 设备列表 + 协议详情完成（核心域）
3. PR 创建（必须）

可降级（延后到下个 PR）：
- 日志域页面（12 个）
- 数据/微信域页面
- 业务组件深度样式调整

---

## 7. 报告

PR 创建成功后给用户报告：

```
✅ UI 重构完成
- PR: <url>
- 改动统计: X files, +Y/-Z lines
- 视觉 Demo: /tmp/uart-ui-demo/c-minimal-saas.html
- 自测: tsc / lint / build 全通过
- 已知遗留: <如有未完成的页面，列出来>
```

如有遗留未完成项，**不要** 自动 commit 那些页面，保持 PR 干净。