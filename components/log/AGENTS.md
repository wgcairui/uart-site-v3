# log 前端模块 (4 维日志 + 监控中心 + user 行为日志)

> 职责: admin 端 4 维日志（告警 / 用户操作请求 / 设备通信 / 终端 timeline / 登录）+ 监控中心 3 sub-tab 合并（MonitorCenter）；user 端 1 维（用户行为聚合 UserLog）。所有 detail modal 提到 page 级 `_components/`（参考 `log/alarm/_components/AlarmDetailModal`），本 module 只做列表 + Tab 容器。
> 跟谁对接: server 端 `module/log`（admin-log.controller.ts prefix `/api/v2/admin/logs`，**复数带 s**，区别老 logUserRequest 单数）；shared util `lib/api/fetch{Root}`、`lib/api/endpoints/admin/logs`、`lib/hooks/usePromise`。
> 最近 ship PR: PR #24 feat/log-journey-view（UserJourney 业务事件追踪）· PR #26 feat/log-detail-status-tag（detail modal StatusTag v2 视觉）· PR #28 feat/admin-server-errors（5xx 错误日志）· PR #57 feat/terminal-timeline（terminal 17 事件 timeline）。

## 触发模型

### 1. admin 监控中心 (MonitorCenter 3 sub-tab + 徽标)

```
/admin/log → PageHeader + MonitorCenter
   └─ Segmented (3 sub-tab):
       ├─ 告警 (AlarmLogTab)         loguartterminaldatatransfinites (默认 10d 时间窗)
       ├─ 设备通信 (LogTerminal)     logterminals (按 mac, 实时详情 Modal)
       └─ 时间线 (TerminalTimelineTab) logTerminalTimeline (17 事件 kinds 多选)
   顶部徽标: 未确认告警数 (24h 内, 调 logAlarmTimeBucket)
```

### 2. admin 用户操作请求 (RequestLogTab 双轨)

```
/admin/node/user/info/:user → 操作 Tab
   └─ Segmented 「操作 (journey 新) | 操作请求 (legacy 旧)」:
       ├─ journey 新 (默认): UserJourney list
       │   └─ loguserjourneys (filters + search + sort + pagination)
       │   └─ 详情弹 JourneyDetail Modal (Timeline 步骤渲染)
       └─ legacy 旧: 跟老 logUserRequst 一样
           └─ loguserrequsts (保留作 API 调用审计 fallback, 30d 双轨)
```

### 3. admin 登录日志 (LoginLogTab)

```
/admin/node/user/info/:user → 登录 Tab
   └─ loguserlogins (90d 时间窗, 按 user 过滤)
```

### 4. admin 终端 timeline (TerminalTimelineTab)

```
admin 终端详情页 Timeline tab
   └─ logTerminalTimeline (mac, 24h 默认, kinds Select 多选)
       ├─ 17 事件 kind 颜色映射 (uart-server worker 建议)
       ├─ invalidPayload 折叠面板 (dev 排查用)
       └─ legacyCollection 角落 📜 legacy 链接跳老 log.terminals (双写 6 个月)
```

### 5. user 行为日志 (UserLog)

```
/main/user/info/:user (user 端) 或 /admin/node/user/info/:user
   └─ UserLog:
       ├─ getAlarm (user 端 24h 默认) — 告警聚合
       ├─ logUserAggs (admin 端) — 设备通信事件聚合
       └─ ResultDataParse (client result 解析数据)
```

## 目录

```
components/log/
├── AGENTS.md                              (本文件)
├── AlarmLogTab.tsx                        admin 告警日志 Tab (默认 10d)
├── LogTerminal.tsx                        admin 设备通信日志 Tab (按 mac 详情 Modal)
├── LoginLogTab.tsx                        admin 登录日志 Tab (90d)
├── MonitorCenter.tsx                      admin 监控中心 (3 sub-tab + 徽标容器)
├── RequestLogTab.tsx                      admin 用户操作请求 Tab (双轨 journey/legacy)
├── TerminalTimelineTab.tsx                 admin 终端 timeline (17 事件 + kinds 多选)
├── UserLog.tsx                            user 行为日志聚合 (getAlarm + logUserAggs)
└── log.tsx                                log 通用列表组件 (DatePicker + Table + 详情 Modal)
```

> detail modal 提到 page 级 `_components/`（参考 `app/(admin)/admin/log/alarm/_components/AlarmDetailModal.tsx`）。

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/logs/nodes` | 节点日志 (start/end) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/terminals` | 设备通信日志 (mac) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/sms` | 短信发送日志 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/sms/count-info` | 短信按 tel 分组 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/sms/count-by-bucket` | 短信时间分桶 (total/month/week/day) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/mail` | 邮件发送日志 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/mail/count-by-bucket` | 邮件时间分桶 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/transfinite` | 告警日志 (start/end) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/transfinite/count-by-bucket` | 告警时间分桶 + tags 分布 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/user-logins` | 登录日志 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/user-requests` | 旧操作请求日志 (legacy 30d) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/wx-subscribes` | 微信订阅消息 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/terminal-aggs` | 设备事件聚合 (mac) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/user-aggs` | user 事件聚合 | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/terminal/timeline` | 终端 timeline 17 事件 (kinds + includeNodeEvents) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/server-errors/list` | 5xx server error 列表 (PR #28) | ADMIN/ROOT |
| GET | `/api/v2/admin/logs/server-errors/:id` | server error 详情 (404 → 500) | ADMIN/ROOT |
| POST | `/api/v2/admin/logs/user-journeys/list` | UserJourney 业务事件 (PR #24) | ADMIN/ROOT |
| GET | `/api/v2/admin/logs/user-journeys/:id` | journey 详情 (steps 一次返, limit 1000) | ADMIN/ROOT |
| GET | `/api/v2/admin/users/:user/online-stat` | user 在线状态 | ADMIN/ROOT |
| POST | `/api/v2/admin/users/:user/terminal-alarms/list` | user 告警列表 (start/end) | ADMIN/ROOT |
| GET | `/api/v2/user/alarms/history` | user 端告警 (start/end) | USER+ |

> ⚠️ **路径是 `/logs/` (带 s 复数)**，对应 `admin-log.controller.ts` 装饰器 `@Controller('/api/v2/admin/logs')`；老 `logUserRequst` 单数 path 不在 v2 admin 范围（memory 2026-07-11 教训）。

## 关键设计

| 维度 | 决策 |
|---|---|---|
| **4 维日志 + 监控中心** | 告警 / 设备通信 / 终端 timeline / 用户操作请求 + 登录 + server-error + user-journey；MonitorCenter 合并前 3 维（cairui 反馈「告警页 + 设备通信页 + 时间线页 3 tab 视觉过重」） |
| **detail modal 提到 page 级 `_components/`** | 避免 modal 状态污染 module（参考 `log/alarm/_components/AlarmDetailModal`），每个 page 持有自己的 detail modal，本 module 只暴露 list / 容器 |
| **时间分桶 (PR mail-sms-filter)** | server 端走 `countDocuments` 算 `total/month/week/day + tags 分布`；之前 client 端用 `items (≤200)` 算「月/周/日」偏低 |
| **UserJourney 双轨 (PR #24)** | `loguserrequsts` (per-request legacy) + `loguserjourneys` (journey new) 双轨 30d；顶部 Segmented 切换；详情弹 JourneyDetail Modal (Timeline 步骤渲染) |
| **17 事件 timeline** | `Uart.TerminalEventKind` discriminated union，字段名权威源 `midwayuartserver/src/common/types/log-event.schema.ts`；TS 镜像 server zod schema |
| **kinds Select 多选** | 空数组 = 全部 (server 端判断)；多选叠加筛选 + search |
| **time bucket 跟 PageSummary 联动** | 告警 tags 分布 + 4 时间桶（total/month/week/day）展示；自然周 = 周一 → endTs，自然月 = 1 号 → endTs（cairui 13:48 拍） |
| **filter exact $in + search regex 分轨** | `buildMongoFilter` filters branch 走 `$in` exact，search branch 走 `$regex`（dropdown 跟 text search 语义分离，PR #109 修法） |
| **5xx server error 列表 (PR #28)** | `logservererrors` POST 风格 + `logservererrorById` GET；404 抛 500 前端按 500 处理 |
| **legacy 双写 6 个月** | terminal timeline 角落 `📜 legacy` 链接跳老 `log.terminals` endpoint；过渡期兼容老查询 |
| **getUseBtyes / getDtuBusy / logDevUseTime / logInstructQuery** | DEPRECATED（无 server 实现），前端 import 返 0 数据；2026-07-23 清理时统一移除 |
| **MonitorCenter Segmented 视觉** | 比 antd Tabs 视觉轻；跟 DebugCenter 一致（cairui 反馈） |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | 列表数据 + 自动 refetch |
| `logterminals / loguartterminaldatatransfinites / loguserlogins / loguserrequsts / loguserjourneys / logTerminalTimeline` | `lib/api/fetchRoot` (老 barrel) + `lib/api/endpoints/admin/logs` (新) | 各类型日志查询 |
| `getColumnSearchProp / getColumnFilterProp / tableConfig` | `lib/utils/tableCommon` | Table 列搜索 + 过滤 + 分页 |
| `MyDatePickerRange` | `components/common` | v2 视觉日期范围 |
| `StatusTag` | `components/common` | detail modal 状态徽标（v2 视觉） |
| `KVList` (替代 Descriptions) | `components/common` | detail modal 描述列表 |
| `PageHeader / PageSummary` | `components/common` | log 详情页头 + 汇总 |
| `Modal wrapper` | `lib/utils/modal` | detail modal 替换 antd `Modal.info` |
| `dayjs + relativeTime` | 第三方 | 时间格式化 + 相对时间 |
| `RepeatFilter` | `lib/utils/util` | user log 重复事件过滤 |
| `Timeline (antd)` | antd | UserJourney 步骤渲染 |

## 验证 (dev mode)

1. **MonitorCenter 3 sub-tab**：进 `/admin/log`，告警 10d / 设备通信按 mac 详情 / 时间线 kinds 多选；顶部未确认告警徽标数对得上
2. **告警分桶**：进告警 tab，PageSummary 4 个 tile (total/month/week/day) + tags 分布卡联动
3. **journey 双轨**：进 `/admin/node/user/info/<user>` → 操作 Tab → Segmented 切「操作 (新)」/「操作请求 (旧)」，journey 详情弹 Modal
4. **terminal timeline**：admin 终端详情页 → timeline tab，kinds 多选切换，invalidPayload 折叠面板展开看完整 payload
5. **server error**：进 server error 列表，POST 风格 filters (level/status) + search (url/regex) + sort 切换
6. **legacy 链接**：timeline 角落点 `📜 legacy` 跳老 `log.terminals`
7. **tsc 0 错**：`node node_modules/.bin/tsc --noEmit --project tsconfig.json`
8. **dev server 启动**：`bun run dev` → curl `localhost:3000/admin/log` 应 200

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| **路径错位 (单数 log / 复数 logs)** | 必加 `/logs/` (复数)；sibling 跟我 4 Q sync 时给的 URL 也二次验证，sibling 也会抄错（memory 2026-07-11 教训） |
| 时间分桶 client 端用 `items` 算偏 | server 端走 `countDocuments` 算 `total/month/week/day`；前端直接用 server 返回值（PR mail-sms-filter 改造） |
| server error 404 抛 500 | `logservererrorById` 404 case server 端抛 Error → middleware 返 500，前端按 500 处理（统一 5xx toast） |
| 17 事件 TS 类型漂移 | 字段名权威源 `midwayuartserver/src/common/types/log-event.schema.ts`（commit 5ab6f10）；TS discriminated union 镜像 server zod schema，前端不引 zod runtime |
| 列表大表性能 | pageSize 默认 20，server 端有索引；client 端用 `useMemo` 缓存列定义 |
| `getUseBtyes / getDtuBusy / logDevUseTime / logInstructQuery` DEPRECATED | 返 fake success `{code:0, data: [], msg:'DEPRECATED'}`；2026-07-23 清理统一移除（避免误用） |
| 跨端 detail modal 复用 | 提到 page 级 `_components/AlarmDetailModal` 等，避免 modal 状态污染 module；本 module 不持有 modal |
| 路径写错 `s` 漏写 | 5xx → 404 → silent 5min；验证方式：deploy 后 curl `/logs/server-errors/list` 应 403（auth）/ 404（路径错） |
| loguserjourneys journeyId 索引失效 | server 端 `@index` 但时序表不生效，走 timeStamp 30d 范围扫描；前端不分页 (limit 1000 兜底) |
| 时间格式 timezone | dayjs + 服务端返回 timestamp (ms)，前端转 dayjs 不做 timezone 转换（统一 CST 显示） |

## 不在本次范围

- 日志导出（CSV / Excel） — server 端有，前端未做 UI
- 日志实时推送（WebSocket 增量） — 走轮询
- 日志全文搜索（MongoDB text index） — 当前 search field 是 regex 子串
- 日志归档 / 压缩（30d+ 数据不展示）
- user 端 self-service 日志（user 只能看自己的告警，user log 是 admin 排查用）
- 设备通信日志 retention 配置 UI
- log 跟监控告警联动（severity 升级触发实时通知）
- UserJourney funnel 分析（决策 v2）
