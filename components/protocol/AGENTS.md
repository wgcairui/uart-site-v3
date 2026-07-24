# protocol 前端模块 (协议配置 + 指令 CRUD + 阈值 + 告警 + AI)

> 职责: 协议（485 / 232 / Modbus / 透传 / 自定义）的 5 段配置（操作指令 / 常量配置 / 显示参数 / 阈值配置 / 状态配置），admin/user 双端共享底层数据但 UI 分化；2026-07-17 整合 AI 域（chat / dry-run / AI 协议空态提示）进协议详情页。
> 跟谁对接: server 端 `module/protocol` + `module/ai`；兄弟 module `ai`（AiWorkspace / ChatPane / ProtocolPreviewForm / StatsPane）；shared util `lib/api/fetch{Root}`、`lib/hooks/useAiStream`、`lib/hooks/usePromise`。
> 最近 ship PR: PR #44 feat/ai-tabs-into-protocol（5 redirect + 2 tab 整合）· PR #45 fix/ai-sender-noop（Sender 清空）· PR #48 fix/ai-sender-clear（forwardRef + .clear()）。

## 触发模型

### 1. admin 协议详情页（5 段 + AI 子 tab）

```
/admin/node/protocols/info/:name
   └─ PageHeader + Tabs
       ├─ 操作指令 (ProtocolInstruct)         CRUD + formResize + ProtocolInstructForm
       ├─ 常量配置 (ProtocolContant)          5 段 LLM 推断 (DevConstant)
       ├─ 显示参数 (ProtocolShowTag)          Tag 列表（前端 show/hide）
       ├─ 阈值配置 (ProtocolThreshold)        ConstantThresholdType (admin 推)
       ├─ 状态配置 (ProtocolAlarmStat)        报警条件 (alarm stat)
       └─ [AI] chat / dry-run / inferred      2026-07-17 整合自 /admin/ai/*
```

### 2. user 协议详情页（5 段只读 + 个人覆盖）

```
/main/protocols/info/:name (user 端)
   └─ PageHeader + Tabs（无 AI tab）
       ├─ 操作指令 (ProtocolInstruct)        只读 + ProtocolInstructSelect 选择
       ├─ 常量配置 (ProtocolContant)          只读
       ├─ 显示参数 (ProtocolShowTagUser)      user 自定义 tag 覆盖
       ├─ 阈值配置 (ProtocolThresholdUser)    user 自定义 min/max
       └─ 状态配置 (ProtocolAlarmStatUser)    user 自定义 alarm 条件
```

### 3. 指令 CRUD 流程

```
admin ProtocolInstruct Tab
   │
   ├─ 新建/编辑: ProtocolInstructForm (Form)
   │   ├─ name (string) + formResize[] (param list)
   │   ├─ ProtocolInstructParamInput 单参数 (name/regx/bl/unit)
   │   └─ onChange 累计 → setProtocol / updateProtocol
   │
   ├─ 选中发送 (TerminalOprate / DevOprate 联动):
   │   └─ ProtocolInstructSelect 下拉，filterOptions 控制可用指令
   │
   └─ AI chat 生成（ProtocolAiChatTab）:
       └─ LLM tool_done → ProtocolPreviewForm → admin 手动编辑 → 提交新建
```

### 4. AI 协议生成 / dry-run

```
ProtocolAiChatTab (admin 协议详情)
   ├─ 左: SourceUploadTab / SourceUrlTab → aiUpload / aiFetchUrl
   ├─ 中: ChatPane (Sender + Bubble)
   │   └─ useAiStream SSE → /api/v2/admin/ai/generate-stream
   ├─ 底部: ProtocolPreviewForm (生成后才出现)
   └─ 顶部: StatsPane (token / 时长 / 步骤)

ProtocolAiDryRunTab
   └─ 输入 → aiDryRun(dto) → 一次性 DryRunResult (不持久化)
```

### 5. 5 段 AI 推断空态提示

```
AiProtocolEmpty 5 种触发场景:
   ├─ 老 AI 协议（remark 无 llmInferred JSON）   → 强提示「老 AI 协议需手动添加 / 重新生成」
   ├─ c71cbed 部署后新协议（仅 Threshold 真写入）→ 中提示
   ├─ E 方案部署后新协议（5 段真写入）           → 弱提示「LLM 未推断出」
   └─ source 非 AI                              → null (不渲染)
```

## 目录

```
components/protocol/
├── AGENTS.md                              (本文件)
├── ProtocolInstruct.tsx                   (admin 端) 指令 CRUD
├── ProtocolInstructUser.tsx               (user 端) 指令展示
├── ProtocolShowTag.tsx                    (admin) 显示参数 tag
├── ProtocolShowTagUser.tsx                (user) 自定义 tag
├── ProtocolThreshold.tsx                  (admin) 阈值 CRUD (server 推)
├── ProtocolThresholdUser.tsx              (user) 阈值自定义
├── ProtocolAlarmStat.tsx                  (admin) 状态配置 (alarm stat)
├── ProtocolAlarmStatUser.tsx              (user) 状态自定义
├── ProtocolContant.tsx                    常量配置 (5 段 LLM 推断 落点)
├── ProtocolOprate.tsx                     协议操作指令 (admin TerminalOprate 联动)
├── ProtocolSourceTag.tsx                  协议源 tag (AI/手动)
├── ProtocolsCascader.tsx                  协议级联 (选 devModel → protocol)
├── DevTypesCascader.tsx                   设备类型级联 (Type → DevModel)
├── ProtocolInstructSelect.tsx             协议指令下拉 (filterOptions 控制)
├── ProtocolInstructForm.tsx               协议指令表单 (单条)
├── ProtocolInstructParamList.tsx          指令参数列表 (formResize[])
├── ProtocolInstructParamInput.tsx         指令单参数 (name/regx/bl/unit + 删除)
├── ProtocolAiChatTab.tsx                  AI chat Tab (整合自 /admin/ai/chat)
├── ProtocolAiDryRunTab.tsx                AI dry-run Tab (整合自 /admin/ai/dry-run)
├── ProtocolAiInferred.tsx                 AI 推断展示（5 段 detail）
├── AiProtocolEmpty.tsx                    5 段空态提示组件
└── UnitStatePreview.tsx                   协议 unit 状态预览 (param input 内部)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/protocols/list` | admin 协议列表 | ADMIN/ROOT |
| POST | `/api/v2/admin/protocols` | 创建协议 | ADMIN/ROOT |
| PUT | `/api/v2/admin/protocols` | 更新协议 | ADMIN/ROOT |
| DEL | `/api/v2/admin/protocols/:name` | 删除协议 | ADMIN/ROOT |
| POST | `/api/v2/admin/protocols/remark` | 修改协议备注 | ADMIN/ROOT |
| POST | `/api/v2/admin/protocols/dev-constant` | 推常量配置（Threshold 写库） | ADMIN/ROOT |
| POST | `/api/v2/admin/protocols/test-script` | scriptStart 测试 | ADMIN/ROOT |
| POST | `/api/v2/admin/device-types/list` | 设备类型列表 | ADMIN/ROOT |
| GET | `/api/v2/admin/device-types/:model` | 设备类型详情 | ADMIN/ROOT |
| POST | `/api/v2/admin/device-types` | 添加设备类型 | ADMIN/ROOT |
| DEL | `/api/v2/admin/device-types/:model` | 删除设备类型 | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/dry-run` | AI 协议 dry-run 验证 | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/upload` | AI 源文档上传 (multipart) | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/fetch-url` | AI 抓 URL → OSS | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/commit` | AI 源文档 promote | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/pre-analyze` | 预分析（推断 deviceModel） | ADMIN/ROOT |
| GET | `/api/v2/admin/ai/generate-stream` | SSE 流式生成协议 | ADMIN/ROOT |
| GET | `/api/v2/admin/ai/chat-stream` | SSE 流式 chat | ADMIN/ROOT |
| GET | `/api/v2/user/protocols/:name` | user 协议详情 | USER+ |
| POST | `/api/v2/user/protocols/setup` | user 自定义设置 | USER+ |
| POST | `/api/v2/user/protocols/setup/details` | user + sys setup 合并查 | USER+ |
| PUT | `/api/v2/admin/users/:user/alarm-setup/protocols/:name` | admin 改 user 协议设置 | ADMIN/ROOT |

## 关键设计

| 维度 | 决策 |
|---|---|
| **admin / user 共享底层** | 5 段（操作指令 / 常量配置 / 显示参数 / 阈值 / 状态）UI 视觉按端别分化：admin 可 CRUD，user 只读 + 个人覆盖；底层调 `getProtocol` + `getProtocolSetup` 同一份数据 |
| **AI 域整合 (PR #44)** | 原 `/admin/ai/{chat,dry-run,generate}` 3 个独立页 → 整合成 `ProtocolAiChatTab` / `ProtocolAiDryRunTab` / `ProtocolAiInferred` 3 个 Tab 嵌入协议详情页；用 5 redirect 兼容老链接 |
| **ProtocolInstructForm 三层** | Form (单条) → ProtocolInstructParamList (formResize[]) → ProtocolInstructParamInput (单参 name/regx/bl/unit)；unit 状态用 `UnitStatePreview` 预览 |
| **fillInstructTemplate 行为对齐** | `lib/utils/sendInstruct.ts:fillInstructTemplate` 前端复刻 server 端 `protocol.service.ts:178`（`%i` / `%i%i` / `bl` 表达式）；scheduled-op 需要预先算 hex（详见 `scheduled-op/AGENTS.md`） |
| **AI 源文档 3 模式** | text (textarea debounce) / file (Upload → 后端中转 OSS，规避 mixed-content) / URL (fetch-url)；失败不阻断，console.warn 即可 |
| **Sender 提交后清空 (PR #48)** | `useRef<SenderRef>` + `onSubmit={(v) => { onSubmit(v); senderRef.current?.clear?.() }}`；不要传 `() => undefined` no-op（memory 2026-07-18 教训） |
| **useAiStream 走 SSE** | `/generate-stream` / `/chat-stream` 是 text/event-stream，**不要**用 `ai.ts` wrapper（强制 JSON.stringify）；走 `lib/hooks/useAiStream` |
| **AiProtocolEmpty 5 段统一** | 5 个 Tab 共享同一空态组件，按 tab 名 + source (AI/manual) + remark marker 三维判定显示强度 |
| **ConstantThresholdType 枚举** | `Threshold | DevConstant | ShowTag | AlarmStat | State`（Uart.ConstantThresholdType）；admin 推 + user 覆盖双轨 |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `usePromise` | `lib/hooks/usePromise` | 协议详情 + setup 列表 |
| `useAiStream` | `lib/hooks/useAiStream` | AI SSE 流式生成 |
| `getProtocol` | `lib/api/fetch` (user) | user 协议详情 |
| `getProtocols` | `lib/api/fetchRoot` | admin 协议列表 |
| `getProtocolSetup` | `lib/api/fetch` | 协议 + sys/user setup 合并 |
| `setProtocol / updateProtocol / deleteProtocol` | `lib/api/fetchRoot` | admin 协议 CRUD |
| `addDevConstant` | `lib/api/fetchRoot` | 推常量配置（Threshold 写库） |
| `aiDryRun / aiUpload / aiFetchUrl / aiCommit / aiPreAnalyze` | `lib/api/endpoints/admin/ai` | AI 域 5 端点 |
| `AiWorkspace / ChatPane / ProtocolPreviewForm / StatsPane` | `components/ai` | AI 域共享组件（PR #44 整合） |
| `AiSourceInfoCard` | `components/ai` | 解析 protocol.remark `<!-- AI-GENERATED -->` marker |
| `useSourceUpload` | `components/ai/useSourceUpload` | 4 态上传 hook (idle/uploading/done/error) |
| `fillInstructTemplate` | `lib/utils/sendInstruct` | 指令 hex 模板填充（复刻 server 端行为） |
| `MyInput / MySelect / MyDatePickerRange` | `components/common` | v2 视觉规范表单 |
| `PageHeader / PageSummary` | `components/common` | 协议详情页统一头 |

## 验证 (dev mode)

1. **admin 协议 CRUD**：进 `/admin/node/protocols/info/<name>`，操作指令 Tab 增删改（ProtocolInstructForm + ParamInput 三层联动），刷新后写入生效
2. **AI chat 生成**：ProtocolAiChatTab 选 source (file/text/url) → 填字段 → chat → SSE 流式 token 累积 → 生成完 ProtocolPreviewForm 出现 → 提交新建协议
3. **AI dry-run**：ProtocolAiDryRunTab 填 devModel + protocolName → aiDryRun 返回一次结果（不持久化）
4. **5 段空态提示**：新建 AI 协议（5 段未全填）→ 进 5 个 Tab 看 AiProtocolEmpty 弱/中/强提示；老 AI 协议（remark 无 llmInferred）看强提示
5. **Sender 提交后清空**：chat 发送后 input 框不残留文字（PR #48 修法）
6. **user 协议覆盖**：user 端 `/main/protocols/info/<name>`，阈值 Tab 改 user 覆盖（min/max），admin 端 setProtocol 不影响 user
7. **dev server 启动**：`bun run dev` → curl `localhost:3000/admin/node/protocols` 应 200

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| AI chat 5min 累积多个并发请求 | `useAiStream` 内置 AbortSignal；text 模式 debounce 1s 触发新一轮时 abort 上一次（memory `aiPreAnalyze` 支持 signal） |
| Sender 提交后 input 卡住 | 必须 `useRef<SenderRef>` + `senderRef.current?.clear?.()`；`onSubmit` 只传业务 callback（memory 2026-07-18 教训） |
| 协议 AI 源文档 mixed-content | 走 `aiUpload` 后端中转，**不要**用 `aiUploadToken`（OSS 直传踩 CORS，2026-06-26 改） |
| `getProtocolSetup` 协议错误 fallback | 三层防御：validation helper → API reject → UI disabled；admin AI 协议填错也走 `Promise.reject` 不 fake success（memory 2026-07-10 教训） |
| 5 段 LLM 推断遗漏 | `AiProtocolEmpty` 5 tab 统一检测；`addDevConstant` 写库后 remark 增 `llmInferred` JSON marker |
| 协议版本管理 | 不在 v1 scope；admin 手动覆盖（LLM 二次生成时冲突） |
| admin/user 协议混淆 | server 端 user.protocols 强校验 `isBindMac`；前端不要复用 admin API |
| ProtocolOprate content 字段 | `fillInstructTemplate` 前端复刻 + 后端 `scriptStart` 处理；worker 调 socketIoService.InstructQuery 内部走 cacheProtocol，前端不感知 |
| `ProtocolInstructParamList` 大列表性能 | formResize 默认 ≤ 16 项，超出分页/虚拟滚动（如有） |

## 不在本次范围

- 协议版本管理 / 灰度发布
- 协议导入 / 导出（JSON 序列化备份）
- 协议 LLM 二次编辑流 (`/edit-stream` 决策 v2)
- 协议市场（公开协议模板）
- 协议翻译（i18n） — 当前中文硬编码
- 协议 5 段动态 schema（按协议类型生成 form）
- 协议 chat 历史持久化（决策 v2 考虑）
