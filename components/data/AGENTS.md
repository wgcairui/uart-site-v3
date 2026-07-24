# data 前端模块 (客户端 result + 时间线 + 设备卡 + 实时 log)

> 职责: user 端**设备运行数据 / 客户端 result 解析 / 设备卡 / 实时回包 / 时间线 / user alarm 个人配置**展示；admin 端 **user 描述 / user stat / user alarm 个人配置（admin 视角）**。本 module 是 user 端详情页主要消费侧，11 文件 + 1 实时 socket 组件。
> 跟谁对接: server 端 `module/data` + `module/user` + `module/socket`（Socket.IO 实时数据）；兄弟 module `protocol`（ProtocolAlarmStatUser / ProtocolShowTagUser / ProtocolThresholdUser 跨 module 引用）；shared util `lib/socket`、`lib/api/fetch{Root}`、`lib/hooks/usePromise`。
> 最近 ship PR: PR #42 admin/user 资源迁移 UI（hybrid v4 样板）· PR #66 feat/anomalous-devices-card（设备卡）· PR #39 feat/devmodel-detail-v3（devUseTime + devCard）。

## 触发模型

### 1. 客户端 result 展示链路

```
用户点设备 → ResultDataParse (主列表)
   └─ usePromise 拉 ClientResult(start, end, id) (server log.clientResults)
       ├─ Table: 参数 / 值 / 解析值 / 告警 (Tag red/green)
       └─ 展开行: ClientResultExpandable
           ├─ ResultDataOriginal (原始 + 解析)
           └─ DesList (kv 描述)
```

### 2. 时间线 + 设备卡

```
设备详情页 (Tabs)
   ├─ 时间线 (TimeLine)
   │   └─ usePromise 拉时序数据 → antd Timeline 渲染
   └─ 设备卡 (devCard)
       ├─ img / avatar / actions (操作按钮组)
       └─ devUseTime (使用时间柱状图, MyDatePickerRange)
```

### 3. 实时 socket 流 (DevRealTimeLog)

```
设备详情页 → 实时 Tab → DevRealTimeLog
   │
   ├─ addListenMac(mac) 申请监听 (POST /listen)
   ├─ socketClient.on('data', cb) 拿 live packet events
   ├─ Affix 置顶 + Collapse 折叠历史 + JSONTree 渲染
   ├─ InputNumber 控制监听时长 (默认 5min)
   └─ 离开 / unmount 触发 delListenMac 清理
```

### 4. user 端 / admin 端 user 详情

```
user 端 /main/user/info/:user
   ├─ UserDes (用户描述 + 编辑 + 联系方式)
   │   └─ 可选 editable 模式 (admin 视角)
   ├─ UserStat (用户在线状态 Meh/Frown 表情)
   └─ UserAlarmPage (user 告警个人配置)
       ├─ EditableContact (tel/mail/wx)
       └─ ProtocolAlarmStatUser + ProtocolShowTagUser + ProtocolThresholdUser (5 段)

admin 端 /admin/node/user/info/:user
   └─ UserDes (admin 视角, 无 editable)
       + UserStat + UserAlarmPage (admin 视角, 调 admin 端 API)
```

## 目录

```
components/data/
├── AGENTS.md                              (本文件)
├── DesList.tsx                            通用 kv 描述列表 (Object.entries + MyCopy)
├── UserDes.tsx                            user 描述 + 联系方式 + admin 视角编辑
├── UserStat.tsx                           user 在线状态 (Meh/Frown)
├── UserAlarmPage.tsx                      user 告警个人配置 (5 段 + EditableContact)
├── ClientResultExpandable.tsx             客户端 result 展开行 (嵌套 Original + DesList)
├── ResultDataOriginal.tsx                 客户端 result 原始数据 (Table)
├── ResultDataParse.tsx                    客户端 result 解析数据 (主列表, 展开嵌套)
├── TimeLine.tsx                           时间线 (usePromise + antd Timeline)
├── devCard.tsx                            设备卡 (img + avatar + actions)
├── devRealTimeLog.tsx                     设备实时回包 (Socket.IO + JSONTree)
├── devRealTimeLog.css                     实时 log 样式 (本地 CSS)
└── devUseTime.tsx                         设备使用时间柱状图 (DatePickerRange)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/dashboard/results` | 客户端 result 列表 (ClientResults) | ADMIN/ROOT |
| POST | `/api/v2/admin/dashboard/result` | 客户端 result 单条 (ClientResult) | ADMIN/ROOT |
| GET | `/api/v2/user/devices/:mac/online` | user 设备在线 | USER+ |
| GET | `/api/v2/user/devices/:mac/mount/:pid/data` | user 设备运行数据 (raw register array) | USER+ |
| POST | `/api/v2/user/devices/:mac/mount/:pid/data/history` | user 历史数据 (按 name + start/end) | USER+ |
| POST | `/api/v2/user/devices/:mac/mount/:pid/data/chart` | user 折线图 (≤2000 点, dedup) | USER+ |
| GET | `/api/v2/user/devices/:mac/mount/:pid/tiles` | UPS 6 tile 快照 (server feat/status-enum-v2) | USER+ |
| GET | `/api/v2/user/devices/:mac/mount/:pid/tiles/:name/history` | tile 24h 历史 | USER+ |
| GET | `/api/v2/admin/users/:user/online-stat` | admin 查 user 在线状态 | ADMIN/ROOT |
| GET | `/api/v2/admin/users/:user/alarm-setup` | admin 查 user 告警配置 | ADMIN/ROOT |
| POST | `/api/v2/admin/users/:user/alarm-setup/init` | admin 初始化 user 告警配置 | ADMIN/ROOT |
| PATCH | `/api/v2/admin/users/:user/alarm-setup` | admin 改 user 联系方式 | ADMIN/ROOT |
| PUT | `/api/v2/admin/users/:user/alarm-setup/protocols/:name` | admin 推 user 协议设置 | ADMIN/ROOT |
| GET | `/api/v2/user/alarms/setup` | user 自己告警配置 | USER+ |
| PATCH | `/api/v2/user/alarms/setup` | user 自己改联系方式 | USER+ |
| GET | `/api/v2/user/alarms/setup/protocols/:name` | user 协议配置 | USER+ |
| POST | `/api/v2/admin/terminals/:mac/listen` | Socket.IO 加入监听 (POST) | ADMIN/ROOT |
| DEL | `/api/v2/admin/terminals/:mac/listen` | Socket.IO 退出监听 | ADMIN/ROOT |
| DEL | `/api/v2/admin/terminals/listen/all` | 清理全部监听 | ADMIN/ROOT |
| GET | `/api/v2/admin/users/:user/socket-msg` | admin 发 socket 消息给 user | ADMIN/ROOT |

## 关键设计

| 维度 | 决策 |
|---|---|
| **client result 嵌套结构** | ResultDataParse (主表) → 展开行 ClientResultExpandable → 嵌套 ResultDataOriginal + DesList；usePromise 缓存主数据，避免展开时重新拉取 |
| **devRealTimeLog 4 态 Socket.IO** | idle (idle 提示) → uploading (addListenMac POST) → done (socket 'data' events) → error (cleanup)；Affix 置顶 + Collapse 折叠历史 + JSONTree 渲染 |
| **6 tile UPS (server feat/status-enum-v2)** | `getDeviceTiles(mac, pid)` 返 6 块固定 UPS 标准 modbus 寄存器 (Ua/Ia/P/Q/PF/E)；跟 `docs/components.md §3.4 ctrl-tile` 对齐；旧 `/data` 端点 raw register array 兼容保留 |
| **折线图 dedup + maxPoints** | `getDeviceChartData` 单次最多 2000 点，server 端可选 dedup；`maxPoints` 客户端默认 500 采样；避免前端 OOM |
| **UserAlarmPage 5 段统一** | `ProtocolAlarmStatUser + ProtocolShowTagUser + ProtocolThresholdUser` 3 个跨 module 组件 + `EditableContact`；admin / user 视觉一致但 API 路由不同 |
| **UserStat Meh/Frown** | 在线 `MehFilled` (中性), 离线 `FrownFilled` (皱眉)；基于 `getUserOnlineStat` 布尔值；admin / user 端共用 |
| **DesList kv + MyCopy** | Object.entries + Descriptions (column 1) + MyCopy (key/value 可点击复制)；通用描述组件，**注意**: v3 视觉改造时替换为 `<KVList>` 不用 Descriptions |
| **devCard img/avatar/actions** | img 支持 string URL 或 ReactNode (e.g. devTypeIcon); avatar 可选; actions 数组渲染; 跟 `docs/components.md §2.x` 卡片视觉一致 |
| **devUseTime 柱状图** | `MyDatePickerRange` + `dayjs` 时间窗 + server 端 `logDevUseTime` (DEPRECATED) 兜底 fake 0 数据；2026-07-23 cleanup 时确认 |
| **UserDes 双视角** | 同一组件支持 admin 视角 (read-only 描述) 和 user 视角 (editable 表单); Props `user: string | Uart.UserInfo` |
| **socket 5min TTL** | server 端 5min 后自动清理；前端 InputNumber 让 admin 控制监听时长（默认 5min） |
| **devRealTimeLog 清理** | useEffect cleanup 函数 delListenMac + cancel pending request；防止内存泄漏 + 5min 后静默 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `socketClient` | `lib/socket` | DevRealTimeLog Socket.IO 通道 |
| `usePromise` | `lib/hooks/usePromise` | 列表 + 详情通用 |
| `addListenMac / delListenMac` | `lib/api/fetchRoot` | Socket.IO 监听生命周期 |
| `ClientResult / ClientResults` | `lib/api/fetchRoot` (admin dashboard) | 客户端 result |
| `getDeviceChartData / getDeviceTiles / getDeviceTileHistory / getTerminalData / getTerminalDatasV2 / refreshDevTimeOut` | `lib/api/fetch` (user) | user 设备数据 + tile + chart |
| `getUser / getUserOnlineStat / getUserAlarmSetup / modifyAdminUserAlarmSetupContacts` | `lib/api/fetchRoot` (admin) | admin 视角 user |
| `ProtocolAlarmStatUser / ProtocolShowTagUser / ProtocolThresholdUser` | `components/protocol` | 跨 module 引用 (5 段) |
| `getColumnSearchProp / tableConfig / generateTableKey` | `lib/utils/tableCommon` | Table 列搜索 + 键生成 |
| `MyCopy / MyInput / MyDatePickerRange` | `components/common` | v2 视觉规范组件 |
| `BentoCard / GlassCard / StatusTag / PageHeader / PageSummary` | `components/common` | v2 视觉规范 |
| `devTypeIcon` | `components/common/IconFont` | 设备卡 icon |
| `JSONTree` | `react-json-tree` | 实时 log 渲染 |
| `dayjs` | 第三方 | 时间格式化 + 相对时间 |
| `Affix / Collapse / InputNumber` | antd | 实时 log UI |
| `Modal wrapper` | `lib/utils/modal` | 错误提示（替代 antd `Modal.error`） |

## 验证 (dev mode)

1. **client result 嵌套展开**：进设备详情 → ResultDataParse → 点展开行 → 嵌套 ResultDataOriginal + DesList 渲染
2. **折线图 2000 点采样**：选大时间窗（如 30d）→ chart 自动 dedup + maxPoints 500；Network 面板看 POST `/data/chart` 入参 `dedup=true, maxPoints=500`
3. **6 tile UPS 渲染**：UPS 设备详情页 → 6 tile (Ua/Ia/P/Q/PF/E) 渲染 + 24h tile history
4. **DevRealTimeLog socket**：进设备详情实时 Tab → `addListenMac` POST 200 → socket 'data' 事件 → JSONTree 渲染；离开页面触发 `delListenMac` (Network 面板可见)
5. **UserAlarmPage 5 段**：进 user 详情 → 5 段 (tel/mail + 3 协议设置) 渲染；admin 端 PUT 推送后 user 端看到生效
6. **UserStat 表情**：user 在线时 `MehFilled` 灰；离线时 `FrownFilled` 红
7. **devCard actions**：设备卡右侧 actions 按钮点击触发回调
8. **tsc 0 错**：`node node_modules/.bin/tsc --noEmit --project tsconfig.json`
9. **dev server 启动**：`bun run dev` → curl `localhost:3000/main/dev/<id>` 应 200

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| DevRealTimeLog socket 5min 后静默断开 | server 端 5min TTL；客户端 InputNumber 控制时长；cleanup 函数 delListenMac 兜底 |
| 折线图大时间窗 OOM | server 端 `getDeviceChartData` 强制 `maxPoints ≤ 2000` + 可选 `dedup`；客户端默认 500 |
| 跨 module 引用（protocol） | ProtocolAlarmStatUser / ProtocolShowTagUser / ProtocolThresholdUser 在 `components/protocol`，data module 仅做 user 视角组合 |
| 字段名错位 (mac → DevMac, etc.) | 写 UI 前先 curl 一次确认 DTO；TS 编译过 ≠ runtime 数据对（memory 2026-07-20 教训） |
| Descriptions 残留 v2 改造 | `DesList` 内部仍用 antd `Descriptions`；**改造时替换为 `<KVList>`**（CLAUDE.md 0.2 强约束 #8） |
| `logDevUseTime` DEPRECATED | 返 fake success；2026-07-23 清理时统一移除，避免误用 |
| `isMounted` + 异步 setState 内存泄漏 | useEffect cleanup 函数清 socket subscription + cancel pending request |
| 6 tile UPS 仅 modbus 标准寄存器 | 非 modbus / 非 UPS 设备返回空 → UI 降级到 4 状态卡 |
| UserDes admin 视角 vs user 视角 Props | 同一组件通过 `user: string | Uart.UserInfo` + 内部 `typeof u === 'string' ? getUser(u) : { data: u }` 兼容 |
| socket 鉴权依赖 cookie | `addListenMac` POST 走 cookie auth；当前会话失效时 403 立即触发 cleanup |

## 不在本次范围

- 设备使用时长统计（`logDevUseTime` server 端无实现）
- 设备 OTA 升级日志 / 固件版本
- 设备报警声音/震动提示（依赖浏览器 Notification API）
- 客户端 result CSV / Excel 导出
- 6 tile 历史图多 tile 联动
- 设备地理围栏（不在 server API 范围）
- 设备 batch 操作 UI（admin 端 TerminalsTable 有，user 端没有）
- 客户端 result 跨设备 funnel（单 mac 维度，不跨设备）
- user 端 self-service 设备名批量改
