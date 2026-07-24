# node 前端模块 (2026-07-24 PR-13 文档化)

> 后端 API: `lib/api/endpoints/admin/nodes.ts` (midwayuartserver `module/admin/nodes`)
> 前端职责: admin 端节点管理的两个核心组件 — 节点选择器 + token 重置明文展示

## 触发模型

```
admin 端节点管理 page
   ↓
[NodesSelects]  节点下拉 (mountNode 字段选择)
   ↓                              ↓
选择节点调接口                    [RotateTokenModal] (高危, 明文只显示一次)
   ↓                              ↓
GET nodes 列表                POST /nodes/{rotate-token | init-token | create}
                                  ↓
                              返回 { Name, plainToken }
                                  ↓
                              Modal 强烈提示运维立即保存
```

## 目录

```
components/node/
├── AGENTS.md                              (本文件)
├── NodesSelects.tsx                       节点下拉 Select (10 行, 包装 antd Select + Nodes 接口)
└── RotateTokenModal.tsx                   token 明文展示 modal (PR-03 已 v2 化)

调用方 (PR-03 已迁移):
app/(admin)/admin/node/page.tsx                       admin 节点列表
app/(admin)/admin/node/nodes/[Name]/page.tsx          admin 节点详情 (rotate / init / create)

lib/api/endpoints/admin/nodes.ts                      Node / Nodes / setNode / deleteNode / rotateNodeToken
lib/api/fetchRoot.ts                                  Nodes 入口 (admin barrel)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| GET | `/api/v2/admin/dashboard/nodes` | 节点列表 (含 hasToken 派生字段) | ADMIN+ROOT |
| GET | `/api/v2/admin/dashboard/nodes/:Name` | 节点详情 (不含 nodeTokenHash) | ADMIN+ROOT |
| POST | `/api/v2/admin/dashboard/nodes` | 创建/更新节点 (返回 plainToken 仅新建时) | ADMIN+ROOT |
| DEL | `/api/v2/admin/dashboard/nodes/:Name` | 删除节点 | ADMIN+ROOT |
| POST | `/api/v2/admin/dashboard/nodes/:Name/rotate-token` | 重置 token (返回明文仅此一次) | ADMIN+ROOT |

**SetNodeResult 字段** (`lib/api/endpoints/admin/nodes.ts:13-16`):
- 新建时 `plainToken` 有值 → 触发 RotateTokenModal (source='create')
- 更新时 `plainToken` 为 undefined → 不弹 modal

**nodeTokenHash 永远不返回**, 前端通过 `hasToken` 派生字段判断是否已配置 token (rotate vs init 文案区分).

## 关键设计

| 维度 | 决策 |
|---|---|
| **RotateTokenModal 单/多 token 模式共用** | props 接受 `single` (单节点) 或 `list` (多节点列表), 内部条件渲染; `list` 当前未使用, 预留扩展 |
| **source 文案区分** | `source: 'rotate' | 'create' | 'init'` 决定 title + hint 文案, 跟运维场景对齐 (重置/创建/首次配 token) |
| **明文 token 仅此一次** | UI 必须强烈提示运维立即保存 (「明文 token 只会显示一次」+ 红字警告), 不提供 CSV 下载、不缓存、不持久化 |
| **复制按钮** | 单 token 用暗背景 + 蓝字; 多 token 用 link 小按钮 + 浅灰底, 复制后 2s 内显示「已复制」反馈 |
| **单按钮确认** | footer 只一个 `<Button type="primary" danger>我已保存</Button>`, 防误关漏存 |
| **PR-03 v2 化** | 已删全部 hardcoded hex (#e84545 / #3a8ee6 / #1a2332 / #4a5670 / #fafbfd / #f0f4f9) → v2 token; StatusTag 替代 Tag color |
| **NodesSelects 极简** | 仅 25 行 — `usePromise` 拉 Nodes() + 渲染 Select.Option (Name + IP); mountNode / 设备挂载等场景都复用 |
| **usePromise 懒加载** | 首次打开 Select 才拉接口, 避免 admin 任何页面都打 nodes 列表 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | NodesSelects 列表数据 |
| `message` | antd v6 | 复制成功 / 失败反馈 |
| `Alert type="error"` | antd v6 | 「明文 token 只会显示一次」顶部警告 |
| `Button type="primary" danger` | antd v6 | 我已保存按钮 (高危确认) |
| `destroyOnHidden` | antd v6 | modal 关闭后清 state, 防 stale 展示旧 token |
| `<code>` 标签 | HTML | 明文 token 等宽字体展示 (跟 v2 `var(--font-mono)` 对齐) |

## 明文 token 安全约束

1. **绝不持久化** — modal 用 `destroyOnHidden`, 关闭后 React 树卸载, 内存清除
2. **绝不缓存** — 不走 localStorage / sessionStorage / Cookie
3. **绝不打印** — `console.log(plainToken)` 禁止, 防 devtools 泄漏
4. **单次返回** — server 端仅在 `rotate-token` / `create` / `init-token` 首次配时返明文, 后续 GET 不返
5. **强烈提示** — UI 红字警告 + 「我已保存」danger 按钮, 防误关

## 验证 (dev mode)

1. admin 登录 → 节点详情 → 点「重置 token」→ 弹 modal (source='rotate')
2. 看到节点名 Tag + 蓝字明文 token + 复制按钮
3. 点复制 → 「已复制到剪贴板」+ 按钮变「已复制」2s 后回退
4. 点「我已保存」→ modal 关闭, 列表 hasToken=true
5. 重新打开 → 不应再看到旧 token (server 端不返)
6. 创建新节点 → 弹 modal (source='create') 同样流程
7. 节点首次配 token (init 场景) → source='init' 文案区分

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 明文 token 泄漏到 devtools / log | 严禁 `console.log(plainToken)`; 仅在 modal 渲染时存在 React state |
| 运维误关 modal 漏存 | footer 单 danger 按钮 + 标题 + hint 三重提示 |
| source 文案与场景不匹配 (rotate vs create vs init) | SOURCE_TITLE + SOURCE_HINT 双 map, server 端明确语义 |
| `list` 多 token 模式未使用但保留 | 不删 props, 留以后端多 token 场景复用, 避免 API 升级时改前端 |
| NodesSelects 25 行极简, 没容错 (data 为空 / 接口挂) | `usePromise` 默认空数组, 接口失败不崩; Select 显示空 (无 option) |
| rotate-token 误调 (无意识覆盖现有 token) | 仅在节点详情页有按钮, 二次确认走 Modal.confirm; 按钮文案「重置 token」明确语义 |

## 不在本次范围

- 节点详情 (Node / Status / mountDev 列表) — 在 page.tsx 内联, 后续可抽
- 节点实时状态 (heartbeat / 流量图) — 不在 nodes 端点, 走心跳端点
- token 有效期 / 轮换策略 (server 端没做)
- 批量 rotate (多节点同时重置) — list 模式预留, UI 不暴露
