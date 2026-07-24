# terminal 前端模块 (设备 + 挂载 + 调度 + 心跳 + 异常)

> 职责: 设备（终端 / mountDev）详情、实时数据、操作指令、调度任务、心跳监测、异常检测的**业务组件库**。本 module 是 uart-site-v3 最大 module（30 文件，~7000 行），admin / user 双端复用底层 hook，但 UI 视觉按端别分化。
> 跟谁对接: server 端 `module/terminal` + `module/scheduled-op` + `module/log`；兄弟 module `scheduled-op`（共用 ScheduleOpModal / ScheduledOpTable）；shared util `lib/socket`、`lib/hooks/useTerminalData`、`lib/hooks/usePromise`、`lib/api/fetch{Root}`。
> 最近 ship PR: PR #66 feat/anomalous-devices-card（问题设备卡）· PR #42 admin/user 资源迁移 UI（hybrid v4 样板）· PR #57 feat/terminal-heartbeat-ui（HeartbeatPanel 3 层架构）· PR #39 feat/devmodel-detail-v3（MountDevDetailDrawer）。

## 触发模型

### 1. 设备详情加载（admin / user 双端入口）

```
admin: /admin/node/terminal/[mac]
   └─ TerminalDevPage.tsx  →  TerminalInfo + TerminalMountDevs + TerminalRunData + TerminalRunLog
       + TerminalAT + TerminalIccidInfo + AdminScheduledOpTab + HeartbeatPanel
       + AutomationCenter + AnomalousDevicesCard（条件） + MountDevDetailDrawer（条件）

user: /main/dev/[id]
   └─ 父 page 提供 Tabs（详情 / 实时数据 / 调度 / 调试）
       ├─ 详情：TerminalInfo + TerminalMountDevs
       ├─ 实时：TerminalRunData + TerminalRunLog + DevRealTimeLog（Socket.IO 流）
       ├─ 调度：UserScheduledOpTab → ScheduledOpTable
       └─ 调试：DebugConsole（DeviceLiveStream + AT + 协议指令）
```

### 2. 实时数据 / Socket.IO 通道

```
客户端组件 (DevRealTimeLog)        协议层 (lib/socket)               server 端
   │ addListenMac(mac)  ──────────►│ socket '/client'                │ admin-terminals/listen
   │                                 │  push: live-packet events     │   → deviceEventBus
   │ socket.on('data', cb)          │◄──────────── push event ──────│   (mountDev/mac/pid/data)
   │ useState events[]              │                                  │
   │ JSONTree 渲染 (react-json-tree)│                                  │
   │ delListenMac 离开清理          │                                  │
```

### 3. 操作指令（立即 / 定时 / AT）

```
DevOprate (admin)  /  TerminalOprate (admin)  /  4 个 DevXxx 组件 (user)
   │
   │ 用户填协议 + 指令 + 参数
   │
   ├─ 不勾「定时」 → SendProcotolInstructSet({mac, pid, protocol, content})
   │                admin: POST /api/v2/admin/terminals/:mac/instruct
   │                user:  POST /api/v2/user/devices/:mac/mount/:pid/instruct
   │
   └─ 勾「定时」  →  ScheduleOpModal (checkbox + DatePicker)
                    → sendInstructScheduled → BullMQ delayed job
                    → POST /api/v2/.../scheduled-op

AT 指令 (TerminalAT) ──► sendATInstruct(mac, content)
                          admin: POST /api/v2/admin/terminals/:mac/at-instruct
                          4 段格式化返回 (code / ok / msg / upserted Buffer)
```

### 4. 调度任务（详见 components/scheduled-op/AGENTS.md）

```
本 module 只做容器/入口 (AdminScheduledOpTab / UserScheduledOpTab / AutomationCenter)
   │
   ├─ AdminScheduledOpTab: ScheduledOpTable + 快速新建按钮（按协议指令名）
   ├─ UserScheduledOpTab:  ScheduledOpTable (api='user', createdBy 过滤)
   └─ AutomationCenter:    AdminScheduledOpTab 套 bento-card 视觉
```

### 5. 异常检测（2026-07-23 ship）

```
admin /admin/node/terminal 顶部 PageSummary 下方
   └─ AnomalousDevicesCard  ──► getAnomalousTerminals(limit=20)
                                  server: getAnomalousTerminals() (admin-terminal.controller.ts:148)
                                  4 类根因: A 物理层 / B 间歇 / C 漏配 / D 手滑 / recovery / unknown
                                  5min 自动 refetch
```

### 6. Heartbeat 3 层（2026-07-21 ship）

```
HeartbeatPanel (admin 终端详情页)
   ├─ Layer 1: realtime  5s poll  redis `heartbeat:<mac>` SET ... EX 300 NX
   ├─ Layer 2: transitions 30s poll  log.terminalEvents TERMINAL_CONNECT/OFFLINE
   └─ Layer 3: samples 30s poll  log.heartbeats 5min 降频采样
   API: getTerminalHeartbeat(mac) → { realtime, transitions, samples }
```

## 目录

```
components/terminal/
├── AGENTS.md                              (本文件)
├── TerminalDevPage.tsx                    admin 终端详情页主容器
├── TerminalInfo.tsx                       终端基础信息（名称/MAC/ICCID/状态）
├── TerminalMountDevs.tsx                  挂载设备列表（描述 + 操作）
├── TerminalsTable.tsx                     admin 终端列表（Table + 列搜索 + 批量）
├── TerminalIccidInfo.tsx                  ICCID 信息（卡商/流量/到期）
├── TerminalDevAir.tsx                     user 设备卡片 - 空气类
├── TerminalDevIO.tsx                      user 设备卡片 - IO 开关类
├── TerminalDevTH.tsx                      user 设备卡片 - 温湿度类
├── TerminalDevUps.tsx                     user 设备卡片 - UPS 标准 6 tile
├── TerminalDevOprate.tsx                  user 设备 - 操作指令（4 DevXxx 共用模板）
├── TerminalDev.css                        user 端 DevXxx 共享样式
├── TerminalAT.tsx                         AT 指令调试（22 按钮 + 搜索 + 4 段格式化）
├── TerminalAddMountDev.tsx                admin 添加挂载设备表单
├── TerminalRunData.tsx                    实时运行数据表（mountDev 维度）
├── TerminalRunDataThresoldLine.tsx        阈值折线图（thresholds vs 实际值）
├── TerminalRunLog.tsx                     实时通信日志（TerminalRunData 展开行）
├── TerminalMountDevNameLine.tsx           挂载设备名称折线（terminal list 行内）
├── TerminalOprate.tsx                     admin 终端 - 操作指令
├── HeartbeatPanel.tsx                     heartbeat 3 层可视化（realtime/transitions/samples）
├── MountDevDetailDrawer.tsx               挂载设备快速预览 Drawer (720px)
├── MountDevicesStrip.tsx                  老版挂载设备 strip（RelatedAssetsSection 已合并）
├── AdminScheduledOpTab.tsx                admin 终端 - 定时操作 Tab
├── UserScheduledOpTab.tsx                 user 设备 - 定时操作 Tab
├── AnomalousDevicesCard.tsx               admin 终端页 - 问题设备卡片（5min refetch）
├── AutomationCenter.tsx                   admin 终端 - 自动化中心（AutomationCenter BentoCard）
├── BindUsersSection.tsx                   绑定用户 section（被 RelatedAssetsSection 合并）
├── DebugConsole.tsx                       调试中心（实时回包 + AT + 协议指令）
├── RelatedAssetsSection.tsx               关联资产（挂载设备 + 绑定用户合并 section）
├── TerminalOverview.tsx                   admin 终端概览（info + 关键 stat 网格）
├── useScheduleOpModal.ts                  user 端 4 个 DevXxx 组件共用 hook
```

## API 端点（覆盖 admin/user 两端）

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/terminals/list` | admin 终端列表 | ADMIN/ROOT |
| GET | `/api/v2/admin/terminals/:mac` | admin 终端详情 | ADMIN/ROOT |
| GET | `/api/v2/admin/terminals/:mac/user` | 终端归属用户 | ADMIN/ROOT |
| GET | `/api/v2/admin/terminals/:mac/bind-users/list` | 绑定用户列表 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/owner` | 设置归属 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/share` | 切换共享 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/remark` | 修改备注 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/online` | 强制上下线 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/init` | 初始化设备 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/:mac/at-instruct` | AT 指令发送 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/:mac/instruct` | 协议指令发送 | ADMIN/ROOT |
| POST | `/api/v2/admin/terminals/:mac/listen` | 加入 socket 监听 | ADMIN/ROOT |
| DEL | `/api/v2/admin/terminals/:mac/listen` | 退出 socket 监听 | ADMIN/ROOT |
| DEL | `/api/v2/admin/terminals/listen/all` | 清理全部监听 | ADMIN/ROOT |
| GET | `/api/v2/admin/terminals/:mac/heartbeat` | heartbeat 3 层数据 | ADMIN/ROOT |
| GET | `/api/v2/admin/terminals/anomalies` | 异常设备列表 (top N) | ADMIN/ROOT/AI |
| POST | `/api/v2/admin/register-devs/list` | 注册设备列表 | ADMIN/ROOT |
| GET | `/api/v2/admin/register-devs/terminal/:mac` | 注册设备详情 | ADMIN/ROOT |
| POST | `/api/v2/admin/register-devs/terminal` | 添加注册设备 | ADMIN/ROOT |
| DEL | `/api/v2/admin/register-devs/terminal/:mac` | 删除注册设备 | ADMIN/ROOT |
| GET | `/api/v2/user/devices` | user 绑定设备列表 | USER+ |
| GET | `/api/v2/user/devices/:mac` | user 设备详情 | USER+ |
| GET | `/api/v2/user/devices/:mac/online` | user 设备在线 | USER+ |
| PATCH | `/api/v2/user/devices/:mac` | user 修改别名 | USER+ |
| POST | `/api/v2/user/devices` | user 添加绑定 | USER+ |
| DEL | `/api/v2/user/devices/:mac` | user 删除绑定 | USER+ |
| DEL | `/api/v2/user/devices/:mac/mount/:pid` | user 删除挂载 | USER+ |
| POST | `/api/v2/user/devices/:mac/mount` | user 添加挂载 | USER+ |
| POST | `/api/v2/user/devices/:mac/mount/:pid/instruct` | user 协议指令 | USER+ |
| GET | `/api/v2/user/protocols/device/:mac/mount/:pid` | user 拿挂载设备协议 | USER+ |
| POST | `/api/v2/admin/scheduled-ops` | 创建调度（admin） | ADMIN/ROOT |
| POST | `/api/v2/user/devices/:mac/mount/:pid/scheduled-op` | 创建调度（user） | USER+ |
| 其他 scheduled-op 6 端点 (cancel/trigger/delete) | (略，详见 `components/scheduled-op/AGENTS.md`) | | |

## 关键设计

| 维度 | 决策 |
|---|---|
| **admin / user 双端入口** | 同一份 mountDev 协议指令表，但 UI 视觉按端别分化：admin 用 `TerminalOprate` + `TerminalDevPage` 多 Tab 嵌大屏；user 用 4 个 `DevXxx` 卡片 + `useScheduleOpModal` hook 收敛 |
| **MountDevDetailDrawer 720px** | 快速预览场景（不退出当前页），完整跳独立 page；跟原 3 段详情页区分 |
| **AnomalousDevicesCard 启发式** | 4 类根因 (A 物理层 / B 间歇 / C 漏配 / D 手滑) + recovery + unknown，5min 自动 refetch；不阻塞 PageSummary 渲染（独立 spin） |
| **Heartbeat 3 层架构** | realtime 5s poll（TTL 倒计时） + transitions 30s poll（翻转） + samples 30s poll（采样）；不引 recharts，用 SVG sparkline 最多 20 个点 |
| **Socket.IO 实时回包** | `addListenMac(mac)` 申请监听 → `socket.on('data', cb)` 拿 packet → `JSONTree` 渲染；离开页面 `delListenMac` 清理；防止 5min 后静默退出 |
| **AT 指令 4 段格式化** | code (HTTP) + ok (4G 模块 ok) + msg (AT 返回文本) + upserted (Buffer 原始回包)；不要把 data[].ok 当外层 code（PR #48 教训） |
| **RelatedAssetsSection 合并** | MountDevicesStrip + BindUsersSection 2 section → 1 section，6+6 col split，减重首屏 section 数 |
| **终端列表 4 维分布** | mountNode / PID / online / 协议类型，多选叠加筛选（memory「Terminal PID dropdown 数据源错位」修法：statsPids 用 `pidDistribution.label` 不是 `stats.pids.type`） |
| **失败字段映射防御** | `d.mac → d.DevMac` / `d.NodeName → d.mountNode` / `d.updateTime → d.uptime`；写 UI 前先 curl 一次确认 DTO（PR #66 教训） |
| **⚠️ page ('use client') 不允许 export instant** | Next.js 16.3 cacheComponents E1344（PR #56 注：antd v5 用了 Math.random，cacheComponents 故意关闭） |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | 列表 + 详情通用 |
| `useTerminalData` | `lib/hooks/useTerminalData` | TerminalRunData 专用（mac + pid 维度，自动 refetch） |
| `socketClient` | `lib/socket` | DevRealTimeLog Socket.IO 通道 |
| `addListenMac / delListenMac` | `lib/api/fetchRoot` | Socket.IO 监听生命周期 |
| `getProtocols / getProtocol` | `lib/api/fetch{Root}` | 拉协议 + 指令元数据 |
| `getColumnSearchProp / makeServerFilterProp` | `lib/utils/tableCommon` | TerminalsTable 列搜索/过滤 |
| `useScheduleOpModal` | 本 module 内 | user 端 4 个 DevXxx 共用调度 hook |
| `ScheduleOpModal / ScheduledOpTable` | `components/scheduled-op` | admin/user 双端调度组件 |
| `BentoCard / GlassCard / StatusTag / PageHeader / PageSummary` | `components/common` | v2 视觉规范组件 |
| `KVList` (替代 Descriptions) | `components/common` | v2 视觉规范的描述列表 |
| `Modal wrapper` | `lib/utils/modal` | `confirm() / success() / info() / error()` 替代 antd `Modal.confirm` |
| `getDeviceTiles / getDeviceTileHistory` | `lib/api/fetch` (user) | UPS 6 tile 端点 (server feat/status-enum-v2) |

## 验证 (dev mode)

1. **admin 终端列表筛选**：进 `/admin/node/terminal`，选 `pesiv` 节点 + `在线` + `PID=M100` 三选叠加，PageSummary 高亮 + 表格实时过滤
2. **admin 终端详情 3 段**：`/admin/node/terminal/<mac>` 看 TerminalInfo + MountDevicesStrip（合并到 RelatedAssetsSection）+ HeartbeatPanel 3 层 + AT 指令发送一条 AT+CGMR 看 4 段格式化
3. **user 设备卡片 + 调度**：进 `/main/dev/<id>`，DevXxx 卡片点「操作指令」→ 勾「定时」→ 选时间 → 「定时发送」，列表里出现 PENDING 状态
4. **实时回包流**：TerminalRunLog / DevRealTimeLog 看 socket 'data' 事件，DevRealTimeLog 进/出页面触发 addListenMac / delListenMac（Network 面板可见 POST `/listen`）
5. **异常设备卡**：进 admin terminal 列表，AnomalousDevicesCard 渲染（5min 自动 refetch + 右上 Reload 手动）
6. **heartbeat 3 层**：admin 终端详情 HeartbeatPanel，realtime 5s 内出现 online + TTL 倒计时，transitions 列今日 CONNECT/OFFLINE 时间，samples 24h sparkline
7. **tsc 0 错**：`node node_modules/.bin/tsc --noEmit --project tsconfig.json`
8. **dev server 启动**：`bun run dev` → curl `localhost:3000/admin/node/terminal` 应 200

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 实时 socket 性能（DevRealTimeLog 5min 静默断开） | `delListenMac` 离开清理 + 父组件 unmount 兜底；上限 5min TTL 由 server 端控制 |
| mountDev pid=0 误判为 DTU | 不要用 `pid === 0` sentinel 判定，**用后端 explicit type 字段**（`op.kind` / `op.operationType`，memory 2026-07-10 教训） |
| 字段名错位 (mac → DevMac, NodeName → mountNode) | 写 UI 前先 curl 一次 / 看 `types/uart.d.ts`；TS 编译过 ≠ runtime 数据对（memory 2026-07-20 教训） |
| AT 指令 data[].ok vs 外层 code 混淆 | destructure `const { code, message: m, data } = await sendATInstruct(...)` 三件套；显示三段都展示（memory 2026-07-18 教训） |
| 终端列表 stats pids dropdown 错位 | 喂数据源用 `getTerminalDetailedStats().pidDistribution`（按 `$PID` 分组），**不要**用 `getTerminalStats().pids`（按 `$unwind: '$mountDevs'` 分组，memory 2026-07-23 教训） |
| `addListenMac` 永久监听 | 用户量大会爆，dev 阶段观察；prod 配合 TTL 自动清理（server 端 5min） |
| 调度精度（client 端 `now + MIN_DELAY_MS` 30s） | 只做体验校验，服务端 `scheduledAt > now` 硬性校验不会被绕过 |
| `useMemo` 在 early return 之后 | 所有 hooks 必须在 `if (loading) return` 之前，否则 SSG 报错（memory 2026-07-14 教训） |
| icon 字段传 hex 字符串 | `icon?: ReactNode` 必须传 React 元素（`<ExperimentOutlined />`），不要传 `'#10b981'`（memory 2026-07-14 教训） |
| bento-card 视觉 12-col → 24-col | antd Row 默认 24-col 不是 12-col，所有 `span={X}` × 2（memory 2026-07-15 教训） |
| `isMounted` + 异步 setState 内存泄漏 | useEffect cleanup 函数清 socket subscription + cancel pending request |

## 不在本次范围

- 终端固件 OTA 升级（server 端有，前端未做 UI）
- 终端批量导入 / 导出（CSV / Excel）
- mountDev 协议字段动态渲染（LLM 推断路径走 protocol/Ai 域）
- socket 鉴权（server 端 cookie 验证，前端不感知）
- 设备报警声音/震动提示（依赖浏览器 Notification API，待开启）
- v3 hybrid 视觉的 mobile 端终极优化（PR #36 + #60 已 ship 1 列堆叠，仍有空间）
- 终端 geofence / 围栏告警（不在 server API 范围）
