# admin 前端模块 (2026-07-24 PR-13 文档化)

> 后端 API: `lib/api/endpoints/admin/users.ts` (midwayuartserver `module/admin`)
> 前端职责: 跨页面调用的 admin 端通用 modal 组件, 不绑定特定 page

## 触发模型

```
admin user 列表 / 详情 / 资源盘点
   ↓
[UserActions] 资源迁移按钮 → dispatch CustomEvent 'user-page:open-migrate'
   ↓
admin user 详情 page 监听 event → 打开 [MigrateUserResourcesModal]
   ↓
选 fromUser (离职) / toUser (在职) / reason (审计) / 4 类资源 checkbox
   ↓ 预览 (dryRun=true) → 确认 (dryRun=false)
POST /api/v2/admin/users/migrate-resources
   ↓ 返 { resources (preview) | migrated (commit) + _migrationLogId (审计) }
```

## 目录

```
components/admin/
├── AGENTS.md                              (本文件)
└── MigrateUserResourcesModal.tsx          admin 资源迁移确认 modal (17KB)

调用方 (跨 page 复用):
app/(admin)/admin/node/user/page.tsx                admin user 列表 (操作栏)
app/(admin)/admin/node/user/info/[user]/page.tsx    admin user 详情 (页面级持有 modal)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/users/migrate-resources` | 资源迁移 (dryRun + commit) | ADMIN+ROOT |
| POST | `/api/v2/admin/users/list` | 搜 user (fromUser/toUser 候选项) | ADMIN+ROOT |

**MigrateUserResourcesReq** (`endpoints/admin/users.ts:85-96`): `fromUser` / `toUser` 必填不可相等; `dryRun` 区分预览/提交; `migrate.{devices,alarmSetups,scheduledOps,shareOwner}` 4 类资源勾选; `reason` 审计必填. 错误: 400 / 403 / 404 / 409 (30s lock)

## 关键设计

| 维度 | 决策 |
|---|---|
| **解耦** | CustomEvent `user-page:open-migrate` — UserActions button dispatch, page 监听并打开 modal |
| **Mode 状态机** | `idle → preview → done` — done 后 footer 只剩「完成」按钮 |
| **预览** | 3-col bento-card grid (设备/告警/共享), 不全量列 mac (取前 3 + `…`) |
| **搜索防抖** | 300ms debounce, 4 字段 OR (user/name/tel/mail) |
| **fromUser 锁定** | 从详情页打开时 `fromUserProp` 锁定, Select disabled |
| **Audit** | result.migrated + `_migrationLogId` + by/reason 写入 `log.userMigrations` |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `SectionTitle` / `KVList` | `components/common/*` | 预览标题 / result 7 项 KV (2-col) |
| `StatusTag` | `components/common/StatusTag` | 资源类型 Tag (设备/告警/共享) |
| `Spin` / `message` | antd v6 | 搜索 loading / 错误码→用户文案 (4 类区分) |
| `bento-card` class | `globals.css` | 预览 3-col 容器 |

## CustomEvent 契约

```ts
// 派发 (UserActions.tsx)
window.dispatchEvent(new CustomEvent('user-page:open-migrate', {
  detail: { user: user.user }
}))
// 监听 (page.tsx)
useEffect(() => {
  const handler = (e: CustomEvent<{ user: string }>) => {
    setMigrateFrom(e.detail.user); setMigrateOpen(true)
  }
  window.addEventListener('user-page:open-migrate', handler)
  return () => window.removeEventListener('user-page:open-migrate', handler)
}, [])
```

不用 props / Context: UserActions 在 sidebar, 跟 modal 状态不在同一组件树; CustomEvent 让 button 和 modal 双向解耦.

## 验证 (dev mode)

1. admin 登录 → user 详情 → 资源迁移 → modal 弹出
2. 选 fromUser (test1) + toUser (test2) + reason → 预览 → 3-col bento
3. 确认 → Alert success + KVList 7 项 + `_migrationLogId`
4. mongo `db.log.userMigrations.findOne({})` 看到 fromUser/toUser/by/reason
5. test2 端重登 → 看到 test1 的设备绑定 (migrate.devices 生效)

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 409 lock (30s) — 另一 admin 正在迁移同 user | `message.error('另一 admin 正在迁移, 请稍后重试')` |
| 误操作 — 选错 from/to 资源全迁走 | 强制预览步骤, done 前不允许跳过 |
| CustomEvent 全局污染 | 命名空间 `user-page:` 前缀 |
| 4 类资源 P3 留口 (scheduledOps / shareOwner) | UI 勾选保留, server 返 0 兼容 |
| from/to 不能相同 (server 强校验) | UI 提早 check → message.warning |

## 不在本次范围

- 批量迁移 (多 user → 1 user) / 迁移进度实时推送 / 撤销迁移 (server 合并语义) / 资源类型扩展
