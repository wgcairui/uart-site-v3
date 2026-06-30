# scheduled-op 前端模块 (2026-06-30 决策 18 第一阶段)

> 后端 API: `module/scheduled-op` (Midway 端), 详见 midwayuartserver `module/scheduled-op/AGENTS.md`
> 前端职责: 入口 (admin + user 设备详情页 + 操作指令弹窗) + 列表 (admin + user 设备 tab)

## 触发模型

```
用户点操作指令 (立即 / 定时)
   ↓
buildInstructItem  →  拉 OprateInstruct + 填 %i 占位符
   ↓
[ScheduleOpModal]  checkbox 「定时发送」
   ↓                                  ↓
不勾                                  勾
↓                                  ↓
sendInstructNow  (admin/user)     sendInstructScheduled  →  BullMQ delayed job
↓                                  ↓
POST /api/v2/.../instruct        POST /api/v2/.../scheduled-op
```

## 目录

```
components/scheduled-op/
├── AGENTS.md                              (本文件)
├── ScheduleOpModal.tsx                    立即发送 / 定时发送 共享 Modal
└── ScheduledOpTable.tsx                   列表 + 详情 (admin/user 双端)

components/terminal/
├── AdminScheduledOpTab.tsx                admin 终端详情页 Tabs 「定时操作」面板
├── UserScheduledOpTab.tsx                 user 设备详情页 Tabs 「定时操作」面板
└── useScheduleOpModal.ts                  user 端 4 个 DevXxx 组件共用 hook

lib/api/endpoints/
├── admin/scheduledOps.ts                  create / list / get / cancel / trigger / delete
└── user/scheduledOps.ts                   同上 (user 端 path 略不同, ownership 后端强校验)

lib/utils/sendInstruct.ts                  发送操作指令 helper (buildInstructItem / sendInstructNow / sendInstructScheduled)
                                            含 fillInstructTemplate 前端复刻 (跟 server 端 protocol.service.ts:178 行为一致)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/scheduled-ops` | 创建 | ADMIN+ROOT |
| POST | `/api/v2/admin/scheduled-ops/list` | 列表 | ADMIN+ROOT |
| GET | `/api/v2/admin/scheduled-ops/:id` | 详情 | ADMIN+ROOT |
| POST | `/api/v2/admin/scheduled-ops/:id/cancel` | 取消 | ADMIN+ROOT |
| POST | `/api/v2/admin/scheduled-ops/:id/trigger` | 立即触发 | ADMIN+ROOT |
| DEL | `/api/v2/admin/scheduled-ops/:id` | 删除 | ADMIN+ROOT |
| POST | `/api/v2/user/devices/:mac/mount/:pid/scheduled-op` | 创建 | USER+ADMIN+ROOT (user 端 isBindMac 校验) |
| POST | `/api/v2/user/scheduled-ops/list` | 列表 (createdBy 过滤) | USER+ADMIN+ROOT |
| GET | `/api/v2/user/scheduled-ops/:id` | 详情 (ownership 校验) | USER+ADMIN+ROOT |
| POST | `/api/v2/user/scheduled-ops/:id/cancel` | 取消 (ownership 校验) | USER+ADMIN+ROOT |
| POST | `/api/v2/user/scheduled-ops/:id/trigger` | 立即触发 (ownership 校验) | USER+ADMIN+ROOT |
| DEL | `/api/v2/user/scheduled-ops/:id` | 删除 (ownership 校验) | USER+ADMIN+ROOT |

## 关键设计

| 维度 | 决策 |
|---|---|
| **入口形式** | Checkbox「定时发送」+ DatePicker, 嵌入 ScheduleOpModal (4 个 user 端 DevXxx + 1 个 admin TerminalOprate 共用) |
| **List 位置** | 设备详情页 Tab 嵌入 (admin 端 Tabs + user 端 Tabs) |
| **设备/协议源** | user 端从 dev 详情页 (mac+pid 走 context), admin 端 AdminScheduledOpTab 收集所有 mountDev 的 OprateInstruct 做快速新建按钮 |
| **content 字段** | 前端 sendInstructScheduled 调 fillInstructTemplate 算最终 hex, 跟 server 端行为一致 |
| **状态徽章** | Tag 着色: PENDING=blue / RUNNING=gold / SUCCESS=green / FAILED=red / CANCELED=default |
| **通知通道** | 列表列 notifiedChannels 显示 wx/mail/sms, 详情 Descriptions 完整展示 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | 列表数据 |
| `makeServerSearchProp` | `lib/utils/tableCommon` | 列搜索 |
| `makeServerFilterProp` | `lib/utils/tableCommon` | 列过滤 |
| `message` / `Modal` / `Popconfirm` | antd v6 | 提示/确认 |
| `PageHeader` / `PageSummary` | `components/common` | dev 详情页 header (admin 端沿用 TerminalDetailPage 既有 Tabs) |

## 跟 server 端 fillInstructTemplate 行为对齐

`lib/utils/sendInstruct.ts:fillInstructTemplate` 复刻 server 端 `protocol.service.ts:178`, 包括:
- `%i` → 1-byte hex
- `%i%i` → 2-byte big-endian hex
- `bl` 是纯数字 → 直接 bl * val
- `bl` 是表达式 → new Function 动态执行 (跟 server `ParseCoefficient` 一致)

**复刻原因**: user 端 user.controller 原本是传 item 给 server 端 `fillInstructTemplate`, 但 scheduled-op 的 content 字段是 string, 前端需要预先算好 hex 一起传 content。

## 验证 (dev mode)

1. dev 模式 worker 不启动, 定时任务**到点不触发**
2. 验证创建: `POST /api/v2/admin/scheduled-ops` 返回 `{ id, scheduledAt, status }`
3. 验证执行: `POST /api/v2/admin/scheduled-ops/:id/trigger` 走 `delay:0` 立即触发, 列表 status 变 RUNNING → SUCCESS/FAILED
4. 验证通知: UserAlarmSetup 配置 wxs/mails/tels, 触发成功后可在 wxPublicMessageBull 队列看到 payload
5. e2e: user 端 dev 详情页 → 「操作指令」 Dropdown → 选「开关」→ ScheduleOpModal 勾「定时」→ 选时间 → 「定时发送」

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 改 4 个 user 端 DevXxx 组件改动面大 | 抽到 useScheduleOpModal hook 后改动收敛到 4 处 onClick + 4 处 {scheduleOpModal} |
| `fillInstructTemplate` 前端复刻 | 跟 server 端同一份逻辑, 行为通过手动 e2e 验证; 后续可考虑抽到 shared package |
| `now + MIN_DELAY_MS` (30s) 校验 | 客户端只做体验, 服务端 `scheduledAt > now` 是硬性校验, 不会被绕过 |
| 「定时」按钮文案歧义 | 主按钮文案随勾选切换 (立即发送 ↔ 定时发送), 勾上时表单加红框 hint |
| 后端 `noStandard` 协议 `scriptStart` 处理 | worker 调 socketIoService.InstructQuery 内部已经走 cacheProtocol 拼装, 前端不感知 |

## 不在本次范围

- 周期 cron / 固定间隔 (后端没做)
- 通知通道配置 UI (`UserAlarmSetup` 已有 `getUserAlarmSetup`)
- 后端 worker 启动时间窗配置 / orphan recovery UI
