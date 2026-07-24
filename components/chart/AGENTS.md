# chart 前端模块 (2026-07-24 PR-13 文档化)

> 后端 API: `lib/api/endpoints/admin/users.ts` (midwayuartserver)
> 前端职责: admin 端 user 详情页的邮件/短信统计图表 (recharts)

## 触发模型

```
admin user 详情 page → 嵌入 MailStatsChart / SmsStatsChart
   ↓
[DatePicker RangePicker] 默认 90 天
   ↓
拉数据 → 聚合日期 → 渲染 recharts LineChart + 列表 Table + 详情 Modal
   ↓
点表格行 → 弹 Modal 详情 (收件/状态/内容)
```

## 目录

```
components/chart/
├── AGENTS.md                              (本文件)
├── MailStatsChart.tsx                     邮件消耗趋势 + 发送记录
└── SmsStatsChart.tsx                      短信消耗趋势 + 发送记录

调用方:
app/(admin)/admin/node/user/info/[user]/page.tsx    admin user 详情 (mail/sms tab)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| GET | `/api/v2/admin/users/:user/mail-records` | 邮件记录 (按日期范围) | ADMIN+ROOT |
| GET | `/api/v2/admin/users/:user/sms-records` | 短信记录 (按日期范围) | ADMIN+ROOT |
| GET | `/api/v2/admin/users/:user/sms-stats?days=N` | 短信按日聚合 (N 天) | ADMIN+ROOT |
| GET | `/api/v2/admin/users/:user/alarm-setup` | 告警配置 (查 tels 决定是否渲染 sms tab) | ADMIN+ROOT |

## 关键设计

| 维度 | 决策 |
|---|---|
| **chart 库** | recharts 2.x — ResponsiveContainer 100% 宽, height=300 固定 |
| **配色** | 邮件 `stroke="#7c3aed"` (紫) / 短信 `stroke="#06b6d4"` (青) |
| **空状态** | 无记录 → `<Alert type="info">`; sms 无 tels → `<Alert type="warning">` |
| **详情 modal** | 表格行 onClick → 弹 Modal (footer=null), 字段: 时间/收件/状态/设备/节点/内容 |
| **状态 tag** | success=绿 / 失败=红 (当前 antd `<Tag color>`, v3 待替换 StatusTag) |
| **日期范围** | 默认 [今天-90天, 今天], `allowClear={false}` 防误清空 |
| **聚合** | 邮件客户端聚合 (按 createdAt); 短信走 server aggregate (`sms-stats` 端点) |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `recharts` | `^2.x` | LineChart / ResponsiveContainer / CartesianGrid / Tooltip |
| `Card` / `RangePicker` / `Table` | antd v6 | 卡片容器 / 时间范围 / 列表 |
| `bento-card` class | `globals.css` | (待迁移) 卡片容器替换 |

## 验证 (dev mode)

1. admin 登录 → user 详情 → mail/sms tab → 默认 90 天看到趋势 + 列表
2. 改范围 → 重新拉数据
3. 点列表行 → 弹详情 modal
4. sms tab: user 没配 tels → warning alert, 不显示图表

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| 90 天大范围 → 接口慢 | server aggregate 加索引 (createdAt); UI 限制最大范围 |
| 邮件图表客户端聚合 (每行 1 次 add) | 90 天 ≈ 几千条, < 50ms, OK |
| 状态 tag 仍用 antd `<Tag color>` (非 v2) | 留后续 PR 迁 StatusTag |
| 详情 modal footer=null | 走 antd 默认 close 按钮, 跟 v2 modal 规范一致 |

## 不在本次范围

- 邮件日聚合端点 (server 只有 records, 当前客户端聚合) / 多曲线 / 导出 CSV / 实时刷新
