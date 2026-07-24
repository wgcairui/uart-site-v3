# user 前端模块 (2026-07-24 PR-13 文档化)

> 后端 API: `lib/api/endpoints/admin/users.ts` + `lib/api/endpoints/user.ts` (midwayuartserver)
> 前端职责: admin 端 user 详情页 (v3 hybrid Page B) 的 3 块组件 — 设备绑定 / 操作 / 总览

## 触发模型

```
admin user 详情 page → 组合 3 块组件
   ↓
[BoundTerminalsStrip]  绑定设备主视图 (auto-fill grid)
[UserActions]          4 操作 (模拟登录/切组/改密/资源迁移)
[UserOverview]         16 字段 KV 卡 (账号/昵称/邮箱/...)
   ↓
[UserActions 资源迁移]  dispatch CustomEvent → page 打开 [MigrateUserResourcesModal]
```

## 目录

```
components/user/
├── AGENTS.md                              (本文件)
├── BoundTerminalsStrip.tsx                绑定设备主视图 (auto-fill 280px grid, 增/删/查/在线/共享)
├── UserActions.tsx                        操作玻璃卡 (4 按钮, 跟 DeviceActions 对齐)
└── UserOverview.tsx                       用户信息卡 (16 KV, 3x5 grid + 备注 fullWidth)

调用方 (PR-06 模板化的 admin user 详情):
app/(admin)/admin/node/user/info/[user]/page.tsx    admin user 详情 (3 块组件组合)

关联组件 (跨模块引用, 不在本目录):
components/admin/MigrateUserResourcesModal.tsx      资源迁移 modal (CustomEvent 触发)
components/common/AddUserTerminalModal.tsx           添加设备 modal

lib/api/endpoints/admin/users.ts                     BindDev / delUserTerminal / setTerminalOnline
                                                    changeShareApi / resetUserPassword / toggleUserGroup
                                                    simulateLogin / getUserMailRecords / getUserSmsRecords
                                                    getUserSmsStats / getUserAlarmSetup / modifyUserRemark
lib/api/endpoints/user.ts (user 端路径, 部分 admin 共用)   BindDev (同 admin)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| GET | `/api/v2/admin/users/:user/bind-devs` | user 绑定设备列表 (UTs) | ADMIN+ROOT |
| GET | `/api/v2/admin/users/:user/alarm-setup` | user 告警配置 (含 tels/mails/wxs) | ADMIN+ROOT |
| POST | `/api/v2/admin/users/password` | 重置密码 (`{ user, password }`) | ADMIN+ROOT |
| POST | `/api/v2/admin/users/toggle-group` | 切换用户组 (admin ↔ user) | ADMIN+ROOT |
| POST | `/api/v2/admin/users/remark` | 修改备注 | ADMIN+ROOT |
| POST | `/api/v2/admin/users/:user/simulate-login` | 模拟登录 (返 token, 弹新窗口) | ADMIN+ROOT |
| GET | `/api/v2/admin/terminals` | 终端列表 (切在线/共享用 setTerminalOnline + changeShareApi) | ADMIN+ROOT |
| POST | `/api/v2/admin/users/migrate-resources` | 资源迁移 (CustomEvent → MigrateUserResourcesModal) | ADMIN+ROOT |
| GET | `/api/v2/user/devices` | (user 端, 同名 BindDev) user 自己绑定的设备 | USER+ |

## 关键设计

| 维度 | 决策 |
|---|---|
| **三段式布局** | BoundTerminalsStrip (主, 玻璃 bento 网格) + UserActions (操作, 玻璃卡) + UserOverview (资料, 玻璃卡) — 镜像 terminal/[mac] 详情模板 |
| **CustomEvent 解耦** | UserActions 资源迁移按钮 dispatch `user-page:open-migrate`, admin user 详情 page 监听并打开 MigrateUserResourcesModal (modal 在 components/admin) |
| **模拟登录** | 调 simulateLogin 拿 token → `window.open('/simulate-login?token=...', '_blank')` 防丢当前 admin session |
| **改密弹窗** | UserActions 内部 useState 控 Modal open, 至少 6 位校验, message.success + 关 modal |
| **BoundTerminalsStrip 防御** | `Array.isArray(data.items) ? data.items : []` 兜底, trial mode 缺数据不崩; 列表空 → Empty + 「添加第一台设备」 |
| **terminal card 操作** | Tooltip + Dropdown (查看/设置在线/切换共享) + Popconfirm 解绑, icon-only 按钮, 跟 DeviceActions 视觉统一 |
| **UserOverview 16 KV** | 3x5 响应式 grid + 备注 fullWidth 行; 字段 ?? '-' 兜底, dayjs 格式化时间 |
| **rgtype Tag** | wx/web/app/pesiv 4 类映射中文, fallback 显示原文 |
| **备注 inline 编辑** | click 触发 Input.TextArea autoFocus, onBlur/onPressEnter 保存, 无变化直接关 |
| **资源迁移 root 隐藏** | `user.userGroup !== 'root'` 才显示「资源迁移」按钮, 防 root 自迁 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | BoundTerminalsStrip 设备列表 |
| `bento-card` class | `globals.css` | 3 块组件统一玻璃风容器 |
| `device-actions-v3` class | `globals.css` | UserActions 4 按钮玻璃风 (跟 DeviceActions 对齐) |
| `Button variant` | `components/common/Button` | v2 主按钮 (替换 antd type="primary") |
| `AddUserTerminalModal` | `components/common/AddUserTerminalModal` | 添加设备 modal |
| `MyCopy` | `components/common/MyCopy` | DevMac 复制按钮 |
| `message` / `Modal.confirm` / `Popconfirm` | antd v6 | 提示/确认 (PR-00 之后换 wrapper) |
| `StatusTag` / `KVList` / `SectionTitle` | `components/common/*` | (待迁移) v2 替换硬编码 Tag color |

## CustomEvent 解耦契约

```ts
// 派发 (UserActions.tsx:113)
window.dispatchEvent(new CustomEvent('user-page:open-migrate', {
  detail: { user: user.user }
}))
// 监听 (admin user 详情 page.tsx)
useEffect(() => {
  const handler = (e: CustomEvent<{ user: string }>) => {
    setMigrateFrom(e.detail.user); setMigrateOpen(true)
  }
  window.addEventListener('user-page:open-migrate', handler)
  return () => window.removeEventListener('user-page:open-migrate', handler)
}, [])
```

跟 `components/admin/AGENTS.md` 共享同一份契约 — MigrateUserResourcesModal 同时被 (admin) user 详情 + (admin) user 列表 复用.

## 验证 (dev mode)

1. admin 登录 → user 详情 → 3 块组件正常渲染
2. BoundTerminalsStrip: 添加设备 → modal → 成功 → 列表更新; 切在线/共享 → 状态变化; Popconfirm 解绑 → 成功
3. UserActions: 模拟登录 → 新窗口开 /simulate-login?token=...; 切 admin ↔ user → message.success + UserOverview 顶部 tag 变化
4. UserActions: 重置密码 → modal → 至少 6 位 → 成功; 资源迁移 (非 root) → CustomEvent → page 弹 MigrateUserResourcesModal
5. UserOverview: click 备注 → inline edit → onBlur 保存

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 模拟登录新窗口被浏览器拦截 | `_blank` + 同步 setTimeout (浏览器要求 user gesture 触发的 window.open) |
| CustomEvent 全局污染 | `user-page:` 前缀命名空间; unmount 时 removeEventListener |
| trial mode 缺数据崩 | `Array.isArray()` 兜底 + `?? '-'` 兜底 |
| 改密 6 位过弱 | UI 至少 6 位校验 + server 端 bcrypt 二次校验 |
| 资源迁移 root 误操作 | `userGroup !== 'root'` 才显示按钮, 防 root 自迁资源丢失 |
| UserOverview 16 字段多 | 3x5 grid + 备注 fullWidth, 紧凑但不挤; mobile 单列堆叠 |
| BoundTerminalsStrip grid 窄屏堆叠 | `repeat(auto-fill, minmax(280px, 1fr))` 自动响应 |

## 不在本次范围

- UserAlarmSetup (告警配置页) 独立 page / UserDevices user 端列表 / 改头像/自助改密 / 用户组新增 / 备注历史版本 (无 audit log)
