---
name: api-migration
description: V1 → V2 API 路由迁移参考手册。当用户提到迁移 API、替换接口路径、查找 V2 等价端点、清理旧 controller、核对 V1/V2 映射时触发。包含用户域（/api → /api/v2/user）和后台域（/api/root → /api/v2/admin）完整对照表，以及 /api/v2/admin/** 列表接口的分页规范。不做任何代码修改，仅提供查询和参考。
---

# API V1 → V2 迁移参考手册

**项目路径**: `/Users/cairui/Code/uart-site-v3`
**服务端路径**: `/Users/cairui/Code/midwayuartserver`

---

## 一、用户域 `/api/*` → `/api/v2/user/*`

| V1 路径 | V2 路径 | 服务端文件 |
|---|---|---|
| POST /api/BindDev | GET /api/v2/user/devices | module/terminal/controller/user-device.controller.ts |
| POST /api/loguartterminaldatatransfinites | POST /api/v2/user/alarms/history | module/alarm/controller/user-alarm.controller.ts |
| POST /api/userInfo | GET /api/v2/user/profile | module/user/controller/user-profile.controller.ts |
| POST /api/confrimAlarm | POST /api/v2/user/alarms/:id/confirm | module/alarm/controller/user-alarm.controller.ts |
| POST /api/getTerminalOnline | GET /api/v2/user/devices/:mac/online | module/terminal/controller/user-device.controller.ts |
| POST /api/modifyTerminal | PATCH /api/v2/user/devices/:mac | module/terminal/controller/user-device.controller.ts |
| POST /api/addUserTerminal | POST /api/v2/user/devices | module/terminal/controller/user-device.controller.ts |
| POST /api/delUserTerminal | DELETE /api/v2/user/devices/:mac | module/terminal/controller/user-device.controller.ts |
| POST /api/getDevTypes | POST /api/v2/user/protocols/dev-types | module/protocol/controller/user-protocol.controller.ts |
| POST /api/delTerminalMountDev | DELETE /api/v2/user/devices/:mac/mount/:pid | module/terminal/controller/user-device.controller.ts |
| POST /api/addTerminalMountDev | POST /api/v2/user/devices/:mac/mount | module/terminal/controller/user-device.controller.ts |
| POST /api/smsValidation | POST /api/v2/user/profile/sms-code | module/user/controller/user-profile.controller.ts |
| POST /api/smsCodeValidation | POST /api/v2/user/profile/sms-verify | module/user/controller/user-profile.controller.ts |
| POST /api/getUserAlarmSetup | GET /api/v2/user/alarms/setup | module/alarm/controller/user-alarm.controller.ts |
| POST /api/modifyUserAlarmSetupTel | PATCH /api/v2/user/alarms/setup | module/alarm/controller/user-alarm.controller.ts |
| POST /api/modifyUserInfo | PATCH /api/v2/user/profile | module/user/controller/user-profile.controller.ts |
| POST /api/mpTicket | GET /api/v2/user/profile/mp-ticket | module/user/controller/user-profile.controller.ts |
| POST /api/wpTicket | GET /api/v2/user/profile/wp-ticket | module/user/controller/user-profile.controller.ts |
| POST /api/getUserAlarmProtocol | GET /api/v2/user/alarms/setup/protocols/:name | module/alarm/controller/user-alarm.controller.ts |
| POST /api/getAlarmProtocol | GET /api/v2/user/alarms/protocols/:name/thresholds | module/alarm/controller/user-alarm.controller.ts |
| POST /api/getTerminalData | GET /api/v2/user/devices/:mac/mount/:pid/data | module/terminal/controller/user-device.controller.ts |
| POST /api/getTerminalDatasV2 | POST /api/v2/user/devices/:mac/mount/:pid/data/history | module/terminal/controller/user-device.controller.ts |
| POST /api/refreshDevTimeOut | POST /api/v2/user/devices/:mac/mount/:pid/refresh | module/terminal/controller/user-device.controller.ts |
| POST /api/SendProcotolInstructSet | POST /api/v2/user/devices/:mac/mount/:pid/instruct | module/terminal/controller/user-device.controller.ts |
| POST /api/getProtocol | GET /api/v2/user/protocols/:name | module/protocol/controller/user-protocol.controller.ts |
| POST /api/setUserSetupProtocol | POST /api/v2/user/protocols/setup | module/protocol/controller/user-protocol.controller.ts |
| POST /api/getTerminal | GET /api/v2/user/devices/:mac | module/terminal/controller/user-device.controller.ts |
| POST /api/Nodes | GET /api/v2/user/nodes | module/realtime/controller/user-node.controller.ts |
| POST /api/getUserLayout | GET /api/v2/user/layouts/:id | module/user/controller/user-layout.controller.ts |
| POST /api/getAggregation | GET /api/v2/user/aggregations/:id | module/user/controller/user-aggregation.controller.ts |
| POST /api/setUserLayout | POST /api/v2/user/layouts | module/user/controller/user-layout.controller.ts |
| POST /api/addAggregation | POST /api/v2/user/aggregations | module/user/controller/user-aggregation.controller.ts |
| POST /api/deleteAggregation | DELETE /api/v2/user/aggregations/:id | module/user/controller/user-aggregation.controller.ts |
| POST /api/updateAvanter | POST /api/v2/user/profile/avatar | module/user/controller/user-profile.controller.ts |
| POST /api/unbindwx | POST /api/v2/user/profile/unbind-wx | module/user/controller/user-profile.controller.ts |
| POST /api/getAlarmunconfirmed | GET /api/v2/user/alarms/unconfirmed-count | module/alarm/controller/user-alarm.controller.ts |
| POST /api/getGPSaddress | GET /api/v2/user/devices/gps-address | module/terminal/controller/user-device.controller.ts |
| POST /api/updateGps | PATCH /api/v2/user/devices/:mac/gps | module/terminal/controller/user-device.controller.ts |
| POST /api/getRegisterDev | GET /api/v2/user/devices/register/:id | module/terminal/controller/user-device.controller.ts |
| POST /api/qr | POST /api/v2/user/profile/qr | module/user/controller/user-profile.controller.ts |
| POST /api/getTerminalPidProtocol | GET /api/v2/user/protocols/device/:mac/mount/:pid | module/protocol/controller/user-protocol.controller.ts |
| POST /api/getProtocolSetup | POST /api/v2/user/protocols/setup/details | module/protocol/controller/user-protocol.controller.ts |

---

## 二、后台域 `/api/root/*` → `/api/v2/admin/*`

| V1 路径 | V2 路径 | 服务端文件 |
|---|---|---|
| POST /api/root/set-wx-menu | POST /api/v2/admin/wx/menu | module/wechat/controller/admin-wx.controller.ts |
| POST /api/root/runingState | GET /api/v2/admin/dashboard/stats | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/NodeInfo | GET /api/v2/admin/dashboard/nodes/stats | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/getTerminal | GET /api/v2/admin/terminals/:mac | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/Nodes | GET /api/v2/admin/dashboard/nodes | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/Node | GET /api/v2/admin/dashboard/nodes/:name | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/getTerminals | POST /api/v2/admin/terminals/list | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/materials_list | GET /api/v2/admin/wx/materials | module/wechat/controller/admin-wx.controller.ts |
| POST /api/root/wx_users | POST /api/v2/admin/wx/users/list | module/wechat/controller/admin-wx.controller.ts |
| POST /api/root/update_wx_users_all | POST /api/v2/admin/wx/users/sync | module/wechat/controller/admin-wx.controller.ts |
| POST /api/root/wx_send_info | POST /api/v2/admin/wx/send | module/wechat/controller/admin-wx.controller.ts |
| POST /api/root/getProtocols | POST /api/v2/admin/protocols/list | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/addDevConstant | POST /api/v2/admin/protocols/dev-constant | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/deleteProtocol | DELETE /api/v2/admin/protocols/:name | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/updateProtocol | PUT /api/v2/admin/protocols | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/setProtocol | POST /api/v2/admin/protocols | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/TestScriptStart | POST /api/v2/admin/protocols/test-script | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/DevTypes | GET /api/v2/admin/device-types | module/protocol/controller/admin-device-type.controller.ts |
| POST /api/root/DevType | GET /api/v2/admin/device-types/:devModel | module/protocol/controller/admin-device-type.controller.ts |
| POST /api/root/addDevType | POST /api/v2/admin/device-types | module/protocol/controller/admin-device-type.controller.ts |
| POST /api/root/deleteDevModel | DELETE /api/v2/admin/device-types/:devModel | module/protocol/controller/admin-device-type.controller.ts |
| POST /api/root/addRegisterTerminal | POST /api/v2/admin/register-devs/terminal | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/deleteRegisterTerminal | DELETE /api/v2/admin/register-devs/terminal/:mac | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/setNode | POST /api/v2/admin/dashboard/nodes | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/deleteNode | DELETE /api/v2/admin/dashboard/nodes/:name | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/sendATInstruct | POST /api/v2/admin/terminals/:mac/at-instruct | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/RegisterTerminal | GET /api/v2/admin/register-devs/terminal/:mac | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/RegisterTerminals | POST /api/v2/admin/register-devs/list | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/users | POST /api/v2/admin/users/list | module/user/controller/admin-user.controller.ts |
| POST /api/root/deleteUser | DELETE /api/v2/admin/users/:user | module/user/controller/admin-user.controller.ts |
| POST /api/root/getUserAlarmSetup | GET /api/v2/admin/users/:user/alarm-setup | module/user/controller/admin-user.controller.ts |
| POST /api/root/getUserAlarmSetups | POST /api/v2/admin/users/alarm-setups | module/user/controller/admin-user.controller.ts |
| POST /api/root/initUserAlarmSetup | POST /api/v2/admin/users/alarm-setup/init | module/user/controller/admin-user.controller.ts |
| POST /api/root/BindDev | GET /api/v2/admin/users/:user/bind-devs | module/user/controller/admin-user.controller.ts |
| POST /api/root/getNodeInstructQuery | GET /api/v2/admin/dashboard/instruct/stats | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/getNodeInstructQueryMac | GET /api/v2/admin/dashboard/instruct/stats/:mac | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/getUsersOnline | POST /api/v2/admin/users/online | module/user/controller/admin-user.controller.ts |
| POST /api/root/getUserOnlineStat | GET /api/v2/admin/users/:user/online-stat | module/user/controller/admin-user.controller.ts |
| POST /api/root/sendUserSocketInfo | POST /api/v2/admin/users/socket-msg | module/user/controller/admin-user.controller.ts |
| POST /api/root/addRegisterDev | POST /api/v2/admin/register-devs | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/delRegisterDev | DELETE /api/v2/admin/register-devs/:id | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/getRegisterDevs | POST /api/v2/admin/register-devs/list | module/terminal/controller/admin-register-device.controller.ts |
| POST /api/root/initTerminal | POST /api/v2/admin/terminals/init | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/toggleUserGroup | POST /api/v2/admin/users/toggle-group | module/user/controller/admin-user.controller.ts |
| POST /api/root/DataClean | POST /api/v2/admin/dashboard/clean | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/SendProcotolInstructSet | POST /api/v2/admin/terminals/:mac/instruct | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/delUserTerminal | DELETE /api/v2/admin/users/:user/devices/:mac | module/user/controller/admin-user.controller.ts |
| POST /api/root/modifyTerminalRemark | POST /api/v2/admin/terminals/remark | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/setTerminalOnline | POST /api/v2/admin/terminals/online | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/modifyUserRemark | POST /api/v2/admin/users/remark | module/user/controller/admin-user.controller.ts |
| POST /api/root/modifyProtocolRemark | POST /api/v2/admin/protocols/remark | module/protocol/controller/admin-protocol.controller.ts |
| POST /api/root/getUser | POST /api/v2/admin/users/detail | module/user/controller/admin-user.controller.ts |
| POST /api/root/userLoguartterminaldatatransfinites | POST /api/v2/admin/users/:user/terminal-alarms/list | module/user/controller/admin-user.controller.ts |
| POST /api/root/getTerminalUser | GET /api/v2/admin/terminals/:mac/user | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/nodeRestart | POST /api/v2/admin/dashboard/nodes/:node/restart | module/system/controller/admin-dashboard.controller.ts |
| POST /api/root/addListenMac | POST /api/v2/admin/terminals/:mac/listen | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/delListenMac | DELETE /api/v2/admin/terminals/:mac/listen | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/cleanListenMac | DELETE /api/v2/admin/terminals/listen/all | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/setTerminalToShare | POST /api/v2/admin/terminals/share | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/setTerminalOwner | POST /api/v2/admin/terminals/owner | module/terminal/controller/admin-terminal.controller.ts |
| POST /api/root/getTerminalBindUser | GET /api/v2/admin/terminals/:mac/bind-users/list | module/terminal/controller/admin-terminal.controller.ts |

---

## 三、列表分页规范

定义文件：
- `src/common/util/pagination.helper.ts`
- `src/common/dto/pagination.dto.ts`
- `src/common/types/pagination.types.ts`

### 约定

- 路径：统一 `POST /<resource>/list`（search/filters 为嵌套对象，用 POST 更优雅）
- 请求体：`PaginationReqDto` 或时间序列的 `TimeRangePaginationReqDto`
- 响应：`PaginatedResult<T> = { items, pagination }`

### 请求字段

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| page | int | 1 | ≥ 1 |
| pageSize | int | 20 | 1 ≤ x ≤ 200，硬上限 |
| sortBy | string | 第一个 allowedSortFields | 必须在白名单内，否则静默回退 |
| sortOrder | 'asc' \| 'desc' | 'desc' | 仅这两个值 |
| needTotal | boolean | true | false 时跳过 countDocuments，大表优化 |
| search | { field: keyword } | — | 单字段模糊匹配，转 `$regex`，特殊字符已转义 |
| filters | { field: [v1, v2] } | — | 多值过滤；'true'/'false' 转 boolean，ICCID/MAC 等数字字符串不转 |

时间序列变体 `TimeRangePaginationReqDto` 额外字段：
- `startTs` / `endTs`：毫秒时间戳，必填；服务端强制 ≤ 31 天窗口，超出自动截断；颠倒会自动 swap

### 响应结构

```json
{
  "items": [],
  "pagination": {
    "page", "pageSize",
    "total?",       // 仅 needTotal=true
    "totalPages?",  // 仅 needTotal=true
    "hasNext": "boolean",
    "hasPrev": "boolean"
  }
}
```

### 安全护栏

1. **sortBy 白名单**：每个接口列出 `allowedSortFields`，未列字段静默替换为默认值——防止用未建索引字段拖死数据库
2. **search/filters 字段白名单**：`buildMongoFilter(search, filters, allowedFields)` 第三参数是白名单，未列字段被忽略
3. **regex 转义**：search 关键字与 filters 字符串值均转义，防止 ReDoS 或意外匹配
4. **pageSize 钳制**：上限 200，下限 1
5. **legacy 兼容**：`limit` + `offset` 自动换算为 `pageSize` + `page`

### 标准用法模板

```typescript
@Post('/list')
@Validate()
@Role(RoleType.ADMIN, RoleType.ROOT)
async listX(@Body() dto: PaginationReqDto) {
  const query = buildPaginationQuery({
    ...dto,
    allowedSortFields: ['createdAt', 'name', 'status'],
  });
  const mongoFilter = buildMongoFilter(
    dto.search, dto.filters,
    ['name', 'status']
  );
  const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    this.xModel.find(mongoFilter)
      .sort(sort).skip(query.skip).limit(query.pageSize).lean(),
    query.needTotal
      ? this.xModel.countDocuments(mongoFilter)
      : Promise.resolve(undefined),
  ]);

  return buildPaginatedResult(items, query, total);
}
```

### 当前使用此模式的接口

7 个 admin controller 共 15+ 个 `/list` 端点：admin-log（10 个，含时间序列）、admin-user、admin-terminal、admin-protocol、admin-device-type、admin-register-devs、admin-wx（user list、event list）。

### 不走此规则的特例

| 路径 | 原因 |
|---|---|
| GET /api/v2/admin/device-types/ | 设备类型很少，扁平列表更实用 |
| GET /api/v2/admin/dashboard/nodes | 节点是少量运维数据，全量返回 |
| GET /api/v2/admin/dashboard/current/all | 设有 5000 条 HARD_LIMIT 防爆，但不分页 |
| GET /api/v2/admin/dashboard/nodes/stats 等 stats 系列 | 聚合统计不是列表 |

---

## 四、已废弃的 controller 目录（待删除）

迁移完成后删除：
```
src/controller/
├── api.controller.ts        → 已迁移至 module/ 各 controller
├── root.controller.ts       → 已迁移至 module/ 各 controller
└── v2/
    ├── health.controller.ts → module/system/controller/system.controller.ts
    ├── guest.controller.ts  → module/user/controller/guest.controller.ts
    ├── open.controller.ts   → module/system/controller/open.controller.ts
    └── admin/
        ├── admin-data.controller.ts    → module/system/controller/admin-dashboard.controller.ts
        ├── admin-system.controller.ts  → module/system/controller/admin-system.controller.ts
        └── admin-wx.controller.ts      → module/wechat/controller/admin-wx.controller.ts

src/dto/
├── open.ts
└── root.ts
```

---

## 五、迁移规则

1. **HTTP 动词映射**：POST（写）→ POST/PUT/PATCH，GET（读）→ GET，DELETE → DELETE
2. **路径风格**：camelCase → kebab-case
3. **路径参数**：原在 request body 中的 mac/pid/id 改为 URL 路径参数
4. **角色守卫**：所有端点保留原 `@Role()` 装饰器
5. **行为等价**：业务逻辑直接复用 module 层 service，不改变语义