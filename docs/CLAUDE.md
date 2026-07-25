# CLAUDE.md — docs/ 目录

项目文档入口。所有架构、设计规范、迁移指南都在这里。

> **当前基线**：**v2 · 2+3 混合方案**（Bento + Aurora + Glass + Mesh）
> **旧基线**：方案 C 浅色极简 SaaS（已归档，**不要参考**）

---

## 文档清单

```
docs/
├── CLAUDE.md              # 本文件（文档索引）
├── architecture.md        # 系统架构、数据流、模块依赖
├── migration-guide.md     # v2 → v3 迁移细节
├── style-guide.md         # 视觉设计规范 v2（design tokens + 组件视觉规则）⚠️ 必读
├── components.md          # 组件库规范 v2（核心组件 props + 业务组件视觉规则）⚠️ 必读
├── PLAN-ui-refactor.md    # UI 重构执行计划 v2（6 阶段 + commit 拆分 + 验证）
├── PRD-v3-hybrid-redesign.md  # v3 hybrid 设计需求文档
├── dev-login.md           # 试用模式 dev-login API 说明（/api/dev-login）
├── assets/
│   └── hybrid-design-2-3.html   # 视觉稿（5 屏 + 移动端 + token 代码）⚠️ 必看
└── archive/
    └── 2026-07-c-minimal-saas/  # 旧方案 C 文档（保留 git 历史，**不要参考**）
        ├── style-guide.md
        ├── PLAN-ui-refactor.md
        └── components.md
```

---

## 阅读顺序

**首次进入项目**：

1. 根目录 `CLAUDE.md` — 项目全景
2. `docs/architecture.md` — 了解架构
3. **`docs/assets/hybrid-design-2-3.html`** — 视觉稿（先看效果，再读规范）
4. `docs/style-guide.md` v2 — 视觉规范（写任何页面/组件前必读）
5. `docs/components.md` v2 — 组件库规范（新建/修改组件前必读）
6. `docs/PLAN-ui-refactor.md` v2 — 如果要做 UI 重构工作（看执行计划）

**迁移相关问题**：

- v2 → v3 对照：`docs/migration-guide.md`

**重置/重看**：

- 旧方案 C 文档：`docs/archive/2026-07-c-minimal-saas/`（**不要参考，仅作历史**）

---

## 强制约束（写代码前必看）

### 视觉风格基线

**2+3 混合方案 (Bento + Aurora + Glass + Mesh)**。所有 token 定义在 `docs/style-guide.md` v2。

**绝对不允许**：

- 出现 antd 默认蓝 `#1677ff` 作为主色
- 自定义 toast / 弹窗（用 antd `message` / `Modal.confirm`）
- 超过 24px 的大圆角（除登录卡）
- 粗黑阴影（`shadow-lg` / `shadow-2xl`）
- 自动播放动画
- 数字不加 `tabular-nums`
- emoji 圆点（用 `●` U+25CF）
- 在 admin 长时间操作页面用 Glass Mesh 背景
- 在登录页用 Bento（缺品牌冲击）

完整反模式清单见 `docs/style-guide.md` v2 第 7 节。

### 组件复用原则

**优先复用 `components/common/*`**，不要自己写卡片/表格/统计卡。

- **数据展示**：用 `<BentoCard>` + `<PageSummary>` + `<Table>`（默认 antd，样式由 globals.css 强制覆盖）
- **关键操作区 / 装饰**：用 `<GlassCard variant="light\|tinted">`
- **登录 / Landing**：用 `<GlassCard variant="dark">`
- **状态徽章**：用 `<StatusTag variant>`
- **按钮**：用 `<Button variant>`（统一品牌渐变）
- **详情页 KV**：用 `<KVList>`

详见 `docs/components.md` v2 第 2 节 + 第 4.6 节"视觉风格选择"。

### 修改组件必须过的 review 清单

详见 `docs/components.md` v2 第 5 节——视觉一致性 / Props / 'use client' / 性能 / a11y 5 个维度。

---

## 关键决策记录

### 近期 ship PR（2026-07-13 → 2026-07-17）

| PR | 日期 | 主题 | 影响文档 |
|---|---|---|---|
| #29 | 2026-07-14 | v4 admin dashboard 首批（HealthScoreBento + 3 优化） | `docs/components.md` §3.1/3.2 |
| #42 | 2026-07-15 | admin user 资源迁移 UI（v3 hybrid v4 样板） | `app/(admin)/admin/node/user/page.tsx` 视觉参考 |
| **#43** | 2026-07-15 | 9 admin 列表页 v3 polish（devices / protocols / users / logs / data） | `docs/components.md` §2.5/2.6 |
| **#44** | 2026-07-17 | 3 AI 工具页整合进协议域（5 个 redirect + 2 新 tab） | `app/CLAUDE.md` 「AI 域整合」+ `docs/components.md` §3.7 |
| **#45** | 2026-07-17 | AI 修改 tab 发送按钮无响应（删冗余 inputForm + 修 Sender no-op） | `docs/components.md` §5.3.1 + §3.7 |

### 2026-07-24 · full-ui-audit 全量审计 + v2 收尾

**触发**：cairui `/feature-dev` 任务，14 PR 批量整合 v2 设计系统收尾。

**3 wave 编排**（13 uart-web worker + 1 root 串行 PR-00）：
- **Wave 1（5 PR）**：modal wrapper + /login Glass + RotateTokenModal + devmodel/[model] v3 + protocols/info extract
- **Wave 2（5 PR）**：user info device template + log detail StatusTag + MountDevDetailDrawer v2 + ScheduleOpModal v2 + FF modals cleanup
- **Wave 3（3 PR）**：5 missing common tests (65 new) + 5 core module AGENTS.md + 5 peripheral module AGENTS.md
- **PR-00（root 串行）**：28+ Modal.confirm/info/success/error/warning 调用点 sweep 36 文件

**P0 sweep（1 PR）**：38 pre-existing eslint errors 清理（unescaped entities / Compilation Skipped / Function type / empty {} / jsx-key / jsx-no-comment-textnodes / rules-of-hooks / Cannot create components during render）+ 3 vitest pre-existing 漂移（PageSummary × 2 + tableCommon × 1，test/impl drift）。

**P1（3 PR）**：
- **P1-1** /wei + /tool 内部工具 Glass + Mesh 重写
- **P1-2** devmodel list page 提取 1 modal 到 _components/AddDevModelModal
- **P1-3** 6 page 移动端响应式 audit + 补齐（matchMedia + Col xs=24 md=N + 2 个新 CSS 加 @media (max-width: 768px)）

**最终结果**：
- 18 commits, 141 文件改动, +1,366 / -1,103 LOC
- tsc 0 错 / eslint 0 错 / vitest 275/275 / build 44 routes / smoke 7/7 HTTP 200/307
- 路由 LOW: 4 → 0 / HIGH: 26 → 35 / Module AGENTS.md: 1/11 → 11/11
- Modal wrapper: 100% 走 btn-brand 紫粉渐变（替代 antd 默认蓝 #1677ff）

**重要变更**：
- `lib/utils/modal.ts` 新建（5 静态方法 wrapper + 调用方优先级语义）
- 10 个 module 全部补 AGENTS.md（terminal/protocol/ai/log/data/admin/node/user/chart/layout）
- 5 个 common 组件补测试（BentoCard/GlassCard/DeviceActions/DeviceLiveStream/LiveControls, 65 new tests）
- Modal 用法：28+ `Modal.confirm` → `confirm()` from `@/lib/utils/modal`

**踩坑教训**：
- 第一波用 `general` agent 没项目专精 memory，6 min 0 commit。**uartsite-v3 项目 worker 永远用 uart-web agent**
- PR-01 modal wrapper 自身有无限递归 bug（`return confirm()` vs `Modal.confirm()`），PR-01 单独跑 mock 巧合通过；PR-00 sweep 触发，修了脚本忽略 `lib/utils/modal.ts` 自身
- 3 conflict 解决：devmodel/[model] (PR-04 vs PR-00), protocols/info (PR-05 vs PR-00), TerminalsTable (PR-67 origin vs PR-00)

### 2026-07-11 · 2+3 混合方案替换方案 C

- **触发**：cairui 看完 5 套设计对比（含 Bento+Aurora / Glass+Mesh / Swiss / Neumorphism / 现状），选定 2+3 混合方案
- **决策**：
  - 数据展示用 Bento + Aurora（admin 仪表盘 / 列表 / 协议 / 日志 / 数据页）
  - 品牌入口用 Glass + Mesh（登录 / Landing / 试用页）
  - 设备详情用 Bento 主体 + Glass 装饰（混合型）
- **品牌色**：从 `#6366f1 → #06b6d4` 紫蓝渐变 → `#8b5cf6 → #f472b6` 紫粉渐变
- **字体**：从 `Inter + PingFang SC` → `Outfit + Noto Sans SC + JetBrains Mono`
- **旧方案归档**：`docs/archive/2026-07-c-minimal-saas/`（保留 git 历史）

---

## 如果你发现文档过时

- Token 改了 → 同步更新 `docs/style-guide.md` v2 + `lib/utils/designTokens.ts`
- 新增通用组件 → 同步更新 `docs/components.md` v2 第 2 节
- 新业务组件域 → 同步更新 `docs/components.md` v2 第 3 节
- 视觉风格变更 → 同步更新 `docs/PLAN-ui-refactor.md` v2
- 视觉稿变更 → 更新 `docs/assets/hybrid-design-2-3.html`

**改代码时文档要一起改**——文档跟代码脱节比没文档更糟。

---

## 文档维护节奏

- **style-guide.md** / **components.md**：每次新增/删除通用组件或 token 改动时同步
- **PLAN-ui-refactor.md**：每次 stage 完成时更新进度标记
- **architecture.md**：架构变化时更新（模块依赖 / 数据流）
- **migration-guide.md**：v2 → v3 内部重构完成时补充记录

文档版本号约定：v1 = 方案 C 旧版（已归档），v2 = 当前 2+3 混合方案。

## Admin Summary Tier 1 (2026-07-25, 决策 24)
- §4.11 StatCard family: 4 variant prop API + 视觉规则
- §5.6 StatCard review checklist: 4 variant 必填项 + danger button 优先级
- 已知 gap: useDashboardStat hook 签名 vs BFF client envelope 错位 (W4-W7 workaround 在 page 层, 后续 PR 修)
