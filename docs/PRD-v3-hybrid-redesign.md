# PRD v3 · Hybrid 视觉重构

> 触发: cairui 2026-07-11 22:29 反馈"v2 部署后整体色调单调紫, 左侧菜单栏需要不一样的色调, 仪表盘需要全部重构, 重构所有页面"
> 参考: `/private/tmp/uart-design/hybrid.html` (风格 2 Bento+Aurora + 风格 3 Glass+Mesh 混合方案)
> 上游: PR #26 (Decision 23 v2 design system) 已部署, 但仅 token+组件层落地, 业务页视觉仍 v1 antd 残留

---

## 1. 目标

按 `hybrid.html` 完整重做 uart-site-v3 所有业务页, 落地 3 套视觉语言:

| 视觉 | 适用页面 | 特征 |
|---|---|---|
| **Bento + Aurora (Page A)** | admin 仪表盘, 业务列表 | 紫粉渐变 + 极光晕染 + 12 列 Bento Grid |
| **Bento + Glass 装饰 (Page B)** | 设备详情, 数据密集页 | 紫渐变 hero + Glass 控制卡 + Bento 主体 |
| **Glass + Mesh (Page C)** | 登录页, Landing | 4 色渐变 + 玻璃登录卡 + 品牌 hero |

**共享 token**: brand `#8b5cf6` + accent `#f472b6`, 字体 (Outfit + JetBrains Mono + Noto Sans SC), 圆角 (bento 18px / glass 20px / login 24px).

---

## 2. 范围 (所有页面)

### 2.1 admin 端 (8 个 page)
| Page | 视觉 | 现状 → 目标 |
|---|---|---|
| `app/(admin)/admin/page.tsx` (仪表盘) | Bento + Aurora | 老 antd 紫 → hybrid Page A 完整 12 列 Bento (kpi hero + 3 kpi + chart + status + devices table) |
| `app/(admin)/admin/node/terminal/page.tsx` (终端管理) | Bento | 老 antd table → Bento 列表 + status badge 6 variant + filter chips |
| `app/(admin)/admin/node/terminal/[mac]/page.tsx` (设备详情) | Bento + Glass | 老 antd → hybrid Page B (device hero + live controls + actions + trend) |
| `app/(admin)/admin/node/alarm/page.tsx` (告警) | Bento | 老 antd → Bento 列表 + severity 3 variant color |
| `app/(admin)/admin/node/protocols/page.tsx` (协议) | Bento | 老 antd → Bento table + status indicator |
| `app/(admin)/admin/node/user/page.tsx` (用户) | Bento | 老 antd → Bento table + userGroup badge |
| `app/(admin)/admin/node/user/info/[user]/page.tsx` (用户详情) | Bento + Glass | 老 antd → hybrid Page B style + journey timeline |
| `app/(admin)/admin/node/scheduled-op/page.tsx` (定时操作) | Bento | 老 antd → Bento table + status badge |

### 2.2 user 端 (4 个 page)
| Page | 视觉 | 现状 → 目标 |
|---|---|---|
| `app/(user)/main/page.tsx` (首页) | Bento + Aurora | 老 antd → hybrid Mobile 屏 1 风格 (2 列 KPI) + device list Bento |
| `app/(user)/main/dev/page.tsx` (设备列表) | Bento | 老 antd → Bento list + status 6 variant |
| `app/(user)/main/dev/[id]/page.tsx` (设备详情) | Bento + Glass | 老 antd → hybrid Page B user 端 (简化版) |
| `app/(user)/main/alarm/page.tsx` (告警) | Bento | 老 antd → Bento + severity 3 variant |

### 2.3 auth (1 个 page)
| Page | 视觉 | 现状 → 目标 |
|---|---|---|
| `app/login/page.tsx` + `login.css` | Glass + Mesh | v2 PR #26 已有 Glass → 升级 v3 hybrid (4 色蓝紫粉橙 + 品牌 hero + 玻璃登录卡) |

### 2.4 移动端 3 屏
- 仪表盘 (admin + user 同一套): 2 列 KPI grid + 1 大 device status + 底部 tab bar
- 设备详情: 1 大 hero KPI + 2 列数据 tile + 24h sparkline + 1 主操作按钮
- 登录: 居中玻璃卡 + 简化 hero

### 2.5 通用层 (PR #26 已就位, 不重做)
- `lib/utils/designTokens.ts` (brand 9 色阶 + accent + ink + status)
- `app/globals.css` (bento/glass utility class)
- `providers/AntdProvider.tsx` (theme)
- `components/common/BentoCard.tsx` + `GlassCard.tsx` (通用组件)
- 3 字体 (Outfit + JetBrains Mono + Noto Sans SC)

**v3 任务不重做通用层, 只把通用层套到业务页 + 升级登录页到 v3 hybrid mesh 4 色**.

---

## 3. 落地步骤 (PR 拆分 5 步, 跟 hybrid 6 步建议对齐)

按 hybrid.html "落地建议" 6 步, 合并到 5 个 PR (前 2 步 PR #26 已就位):

| PR | 范围 | 状态 | 估时 |
|---|---|---|---|
| **#1 token + antd theme** | brand/accent/ink/status 9 色阶 + ConfigProvider 覆盖 + 字体 | ✅ PR #26 已 merged | 0 |
| **#2 字体替换** | Outfit + JetBrains Mono + Noto Sans SC 注入 layout | ✅ PR #26 已 merged | 0 |
| **#3 admin 业务页 Bento 化 (仪表盘 1 + 业务列表 6)** | admin/page.tsx 完整 hybrid Page A 重做 + 6 个业务页套 Bento + status 6 variant badge | 🔜 v3 PR #1 | 4-6 h |
| **#4 设备详情 hybrid Page B** | terminal/[mac] 完整重做 + user/dev/[id] 简化版 + scheduled-op 操作按钮 v3 化 | 🔜 v3 PR #2 | 3-4 h |
| **#5 user 端 + 登录 v3 + 移动端** | main/page.tsx + 4 user 业务页 Bento + login v3 hybrid 4 色 + mobile 3 屏 media query | 🔜 v3 PR #3 | 3-4 h |

**总估时: 10-14 h** (实际取决于 cairui 拍 deploy 窗口, 周末 / 工作日).

---

## 4. 关键设计 token (跟 PR #26 复用, 不重定义)

```ts
// brand 9 色阶
brand: { 50: '#f5f3ff', 100: '#ede9fe', ..., 500: '#8b5cf6' 主, ..., 950: '#2e1065' }
accent: { 400: '#f472b6' 粉, 500: '#ec4899' }
ink: { 900: '#0f172a', 700: '#334155', 500: '#64748b', 400: '#94a3b8', 200: '#e2e8f0', 50: '#f8fafc' }
status: { online: '#10b981', offline: '#f43f5e', warn: '#f59e0b', warning: '#f59e0b', error: '#f43f5e', info: '#3b82f6', idle: '#94a3b8' }
radius: { bento: '18px', glass: '20px', login: '24px' }
blur: { bento: '20px', glass: '40px' }
shadow: { bento: '0 4px 20px -8px rgba(99,102,241,0.12)', glass: '0 20px 60px -10px rgba(0,0,0,0.2)' }
```

---

## 5. 关键组件复用

| 组件 | 路径 | 用途 |
|---|---|---|
| `BentoCard` | `components/common/BentoCard.tsx` | 所有 Bento 卡 (仪表盘 / 业务列表 / 设备详情主体) |
| `GlassCard` | `components/common/GlassCard.tsx` | 玻璃控制卡 (设备详情操作) + 登录卡 |
| `PageHeader` + `PageSummary` | `components/common/PageHeader.tsx` + `PageSummary.tsx` | 三段式布局 (CLAUDE.md 必读) |
| `StatusTag` | `components/common/StatusTag.tsx` | 6 variant status badge (online/offline/warn/warning/error/info/idle) |
| `KpiHero` (新) | `components/common/KpiHero.tsx` | 大 KPI 卡片 (Bento 5 列, 紫渐变 + 极光晕染) |
| `LiveControls` (新) | `components/common/LiveControls.tsx` | 6 tile 实时数据 (Bento 8 列 + sparkline) |

**新增 2 个组件** (KpiHero + LiveControls) 跟 v3 PR #1 一起 ship.

---

## 6. server 端影响

**0 改动**. server API 已就位 (Decision 23):
- 6 status enum (terminal.status + mountDev.status)
- alarm severity 3 variant
- 4 multi-tile endpoint
- socket payload status 字段

如果 v3 实施中发现 server 缺数据 (e.g. 趋势图 24h data, 实时 tile 6 字段), ping sibling (uart-server) 加, 走 PR + 互锁 deploy 流程.

---

## 7. deploy 窗口

| 窗口 | 优势 | 风险 |
|---|---|---|
| **A 立即** (周末 22:30+ 现在) | 早 ship, 周末 buffer 观察, 跟 sibling decision 23 同模式 | 周五晚, 跟 cron 02:00/02:30 错开, 风险中等 |
| **B 周末 03:00+** | cron 跑完, 低峰 | 慢 5 h, cairui 等 |
| **C 工作日白天** | 风险最低, cairui 在场 | 慢, 但 production 改动大白天 deploy 是 P1 教训 |

**我建议 A** (立即, 分 3 个 PR 顺序 push + deploy). 但 cairui 拍.

---

## 8. 验证清单 (跟 PR #26 5 步一致)

每个 PR 部署后:
1. `/login` 200 + v3 hybrid mesh 4 色背景 + 玻璃卡
2. `/admin` 200 + v3 Bento 12 列完整 (kpi hero + 3 kpi + chart + status + devices)
3. `/admin/node/terminal/<test mac>` 200 + v3 Bento + Glass (live controls + actions)
4. `/main` 200 + user 端 Bento
5. `/api/health` 200

---

## 9. 风险

- **范围大**: 13 个业务页 + 1 登录 + 3 移动屏 = 17 个 PR level 改动, 工作量 10-14 h
- **依赖 PR #26 通用层**: v3 实施前必 verify PR #26 prod 稳态 (sibling decision 23 24 h 监测 cron)
- **跨 agent**: server 0 改动, v3 全 web 域单闭环, 不越界
- **cairui 拍板时间**: 4 维度 (设计稿 / 拆分 PR / deploy 窗口 / 估时是否接受) 都需 cairui 拍

---

## 10. 等 cairui 拍

1. **PRD v3 接受?** (整体方向 + 范围)
2. **PR 拆分 OK?** (3 个 PR 顺序 ship)
3. **deploy 窗口?** (A 立即 / B 03:00+ / C 工作日)
4. **估时 10-14 h 是否接受?**
5. **如有 server 端缺数据想加, 现在说** (跟 v3 一起 ship, 不走多次 deploy)

拍板后我开 feat/v3-hybrid-redesign 分支 (已开) 写代码.
