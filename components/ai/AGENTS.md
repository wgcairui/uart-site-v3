# ai 前端模块 (AI 协议生成 workspace 共享组件)

> 职责: 提供 AI 协议生成的**共享组件库**（workspace 骨架 + chat 消息 + 预览表单 + 实时统计 + 源信息卡 + 4 态上传 hook）；本 module 不直接挂页面，2026-07-17 整合（PR #44）后由 `components/protocol/ProtocolAi{Chat,DryRun,Inferred}Tab` 嵌入协议详情页。
> 跟谁对接: server 端 `module/ai`（admin AI 协议生成）+ `module/ai-ops`（AI Token 签发 / 一站式诊断）；兄弟 module `protocol`（AI 域 3 tab 整合）；shared util `lib/api/endpoints/admin/ai`（5 JSON 端点 + 2 SSE 走 `useAiStream`）。
> 最近 ship PR: PR #44 feat/ai-tabs-into-protocol（5 redirect + 2 tab 整合）· PR #45 fix/ai-sender-noop（Sender 清空 no-op 修）· PR #48 fix/ai-sender-clear（forwardRef + .clear() 必走）。

## 触发模型

### 1. AI Workspace 布局骨架

```
/admin/node/protocols/info/:name → AI tab
   └─ AiWorkspace (本 module)
       ├─ 顶部: StatsPane (紧凑横排 4 项: API 类型 / 时长 / 步骤 / token)
       ├─ 中左: SourceUploadTab / SourceUrlTab + 表单字段 (Form)
       ├─ 中右: ChatPane (Bubble 消息列表 + Sender 输入框)
       └─ 底部: ProtocolPreviewForm (整行, protocol 非空才渲染, 含跳转协议详情按钮)
```

### 2. AI 协议生成 5 阶段流程

```
阶段 1: 选 source (text/file/url)
   ├─ text: textarea 1s debounce → aiPreAnalyze
   ├─ file: useSourceUpload 上传 (4 态机) → aiPreAnalyze
   └─ url:  aiFetchUrl → aiPreAnalyze

阶段 2: 预分析 (可选)
   └─ aiPreAnalyze 推断 deviceModel + suggestedProtocolName
       失败 console.warn 不阻断, 失败不抢用户输入

阶段 3: chat / generate
   └─ useAiStream SSE → /api/v2/admin/ai/generate-stream
       ├─ text delta 累积 assistant message
       ├─ tool_start / tool_delta 流式渲染 tool bubble
       └─ saved 事件触发 aiCommit (OSS tmp → 永久区)

阶段 4: 预览
   └─ ProtocolPreviewForm 默认隐藏, 协议非空时整行出现
       admin 可手动编辑字段 (v1 不写回后端)

阶段 5: 提交 / dry-run
   ├─ 提交新建协议 (调 protocol CRUD 端点)
   └─ dry-run (调 aiDryRun) 一次性验证 (不持久化)
```

### 3. Sender 提交后清空 (PR #48)

```
用户输入文本 → 点「发送」按钮
   ├─ Sender onSubmit(v) callback
   │   ├─ onSubmit(v) → 父组件业务逻辑 (useAiStream.send)
   │   └─ senderRef.current?.clear?.() → 清空 Sender 内部 state
   │
   └─ ❌ 反例: onSubmit={() => undefined} 看似无害, 实际 input 永远卡住
```

## 目录

```
components/ai/
├── AGENTS.md                              (本文件)
├── AiWorkspace.tsx                        workspace 布局骨架 (3 区段)
├── ChatPane.tsx                           对话栏 (Bubble + Sender + 6 角色)
├── ProtocolPreviewForm.tsx                协议预览表单 (LLM tool_done 后出现)
├── SourceUploadTab.tsx                    file 模式 Upload 子 tab
├── SourceUrlTab.tsx                       url 模式 Input + aiFetchUrl
├── StatsPane.tsx                          实时仪表 (紧凑横排 4 项)
├── AiSourceInfoCard.tsx                   解析 protocol.remark AI marker
└── useSourceUpload.ts                     4 态上传 hook (idle/uploading/done/error)
```

## API 端点

| Method | Path | 用途 | 权限 |
|---|---|---|---|
| POST | `/api/v2/admin/ai/dry-run` | dry-run 验证 (一次性) | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/upload` | 源文档上传 (multipart, 后端中转 OSS) | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/upload-token` | (deprecated) 浏览器直传 OSS 预签名 | — |
| POST | `/api/v2/admin/ai/fetch-url` | 抓 URL 落 OSS tmp | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/commit` | OSS tmp → 永久区 promote | ADMIN/ROOT |
| POST | `/api/v2/admin/ai/pre-analyze` | 预分析（推断 deviceModel） | ADMIN/ROOT |
| GET | `/api/v2/admin/ai/generate-stream` | SSE 流式生成协议 | ADMIN/ROOT |
| GET | `/api/v2/admin/ai/chat-stream` | SSE 流式 chat | ADMIN/ROOT |
| POST | `/api/v2/admin/auth/issue-ai-token` | AI 专用 long-lived JWT 签发 | ADMIN/ROOT |
| POST | `/api/v2/admin/ai-ops/diagnose` | 一站式设备诊断（5 维） | ADMIN/ROOT |
| GET | `/api/v2/admin/ai-ops/system/health` | 系统健康 (uptime/mongo/redis/5xx) | ADMIN/ROOT |

> SSE 端点（`generate-stream` / `chat-stream`）**不要**用 `lib/api/endpoints/admin/ai` 的 wrapper（强制 JSON.stringify），直接走 `lib/hooks/useAiStream`。

## 关键设计

| 维度 | 决策 |
|---|---|
| **AI 域整合 (PR #44)** | 原 `/admin/ai/{chat,dry-run,generate}` 3 独立页 → 整合成 `ProtocolAiChatTab` / `ProtocolAiDryRunTab` / `ProtocolAiInferred` 3 Tab 嵌入协议详情页；5 redirect 兼容老链接；本 module 只提供共享组件 |
| **3 区段布局** | 顶部 StatsPane 紧凑横条 + 中部 Form/Chat 左右 + 底部 ProtocolPreviewForm 整行（cairui 2026-06-27 拍板） |
| **6 角色消息** | user / assistant (text delta) / tool (tool_start + tool_delta) / saved (version+provider) / error / system |
| **Sender forwardRef** | `useRef<SenderRef>` + `senderRef.current?.clear?.()`；`onSubmit` 只传业务 callback（memory 2026-07-18 教训） |
| **预分析失败不阻断** | `aiPreAnalyze` 失败 console.warn；不抢用户输入：用户手动改过 deviceModel/hintProtocolName 不再 prefilled |
| **AbortSignal** | text debounce 触发新一轮时 abort 上一次 in-flight，避免 20s LLM 累积多个并发；20s server-side timeout 兜底 |
| **4 态上传机** | idle / uploading / done / error；不引真进度条（单次请求 + 后端中转不带 progress 事件） |
| **OSS 后端中转** | 2026-06-26 改：原 `/upload-token` 浏览器直传踩 mixed-content（CORS 漏配）+ HTTPS/HTTP 混；改回后端中转跟 `/admin/data/oss` 一致；`upload-token` 保留仅作 schema 兼容 |
| **AiSourceInfoCard 解析 marker** | 解析 `protocol.remark` 字段里 `<!-- AI-GENERATED ... -->` marker（后端 `commitSource` 写入）；marker 解析失败 → null 不渲染 |
| **AI token 不可在 web 端用** | `issue-ai-token` 返回的 token 是给 AI/Mavis 命令行用的；web 端 admin 调一次拿 token 字符串展示 + 复制即可，**不要**用它调 web 端任何端点（会让 admin 当前 session 失效） |
| **一站式诊断 (PR #106 配套)** | `aiOpsDiagnose` 5 维数据 (terminal/heartbeat/instructHistory/alarms/transitions) Promise.all 并行；单维度失败不影响其他，失败维度 fallback null |
| **3 模式 source** | text (textarea) / file (Upload, MIME 白名单 pdf/xls/xlsx/doc/docx/txt/md, ≤20MB) / url (后端 fetch, 10s timeout, SSRF 防护禁内网) |

## 复用既有工具

| 工具 | 来源 | 用法 |
|---|---|---|
| `useAiStream` | `lib/hooks/useAiStream` | SSE 消费（generate-stream / chat-stream） |
| `aiDryRun / aiUpload / aiFetchUrl / aiCommit / aiPreAnalyze` | `lib/api/endpoints/admin/ai` | 5 JSON 端点 wrapper |
| `issueAiToken / aiOpsDiagnose / aiOpsSystemHealth` | `lib/api/endpoints/admin/aiOps` | AI ops 端点（PR #106 配套） |
| `getAuthToken` | `lib/utils/token` | `aiUpload` 手动塞 Authorization header（FormData 必走） |
| `EMPTY_AI_STATS / AiRunStats` | `types/ai` | StatsPane 共享类型 |
| `useSourceUpload` | 本 module | 4 态上传 hook |
| `BentoCard / GlassCard` | `components/common` | workspace 视觉容器 |
| `Bubble / Sender / Prompts` | `@ant-design/x` | ChatPane 消息 + 输入框 |
| `useCallback / useEffect / useState / useRef` | React | ChatPane 消息累积 + Sender 清理 |
| `dayjs` | 第三方 | 消息时间戳 |
| `Modal wrapper` | `lib/utils/modal` | 错误提示（替代 antd `Modal.error`） |

## 验证 (dev mode)

1. **workspace 3 区段渲染**：进 `/admin/node/protocols/info/<name>` → AI tab，确认 StatsPane 顶部 + Form/Chat 左右 + Preview 隐藏
2. **3 模式 source**：
   - text：textarea 1s debounce 触发 `aiPreAnalyze`
   - file：选 PDF/Excel/Word/TXT/MD（≤20MB）→ 4 态机（idle → uploading Spin → done ✓ → 触发 generate）
   - url：填 URL → `aiFetchUrl` 200 → 走 file 路径
3. **Sender 提交后清空**：chat 发送一段，input 框不留文字（PR #48 修法）
4. **SSE 流式生成**：generate → 看到 token delta 累积 + tool_start/tool_delta 流式 + saved 事件触发 `aiCommit` → ProtocolPreviewForm 出现
5. **dry-run**：dry-run tab 填 devModel + protocolName → 一次性 DryRunResult
6. **预分析失败不阻断**：故意填空 source → console.warn 但 UI 不报错
7. **AI token 签发**：进 AI ops tab，issue token 拿到字符串展示（不要在 web 端用）
8. **一站式诊断**：调 `aiOpsDiagnose(mac)`，5 维数据并行返回

## 风险与权衡

| 风险 | 缓解 |
|---|---|
| Sender 提交后 input 卡住 | **必须** `useRef<SenderRef>` + `.clear()`；`onSubmit` 只传业务 callback，**不要**传 `() => undefined` no-op（memory 2026-07-18 PR #48 教训） |
| AI chat 5min 累积并发 | `useAiStream` 内置 AbortSignal；text debounce 触发新一轮时 abort 上一次 |
| OSS mixed-content 跨域 | 后端中转 `aiUpload`（**不要**用 `aiUploadToken` 直传）；2026-06-26 改造（PR #44 整合） |
| 预分析失败阻断 UI | 失败 console.warn 不 throw；用户手动改过的字段不 prefilled |
| MIME 漏校验导致后端 400 | 前端 beforeUpload 拦截：MIME 白名单 + 大小上限；后端 ai-upload 再校验一次（400/413） |
| URL 抓取 SSRF | 后端禁内网（10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8）；前端提示「仅支持公网 URL」 |
| AI token web 端误用 | UI 标记「仅供 AI/Mavis 命令行使用，勿在 web 端粘贴」；后端 admin 鉴权有 audit log |
| SSE 长连接断 | `useAiStream` 内部重连（max 3 次）；error 事件渲染红 bubble + 重试按钮 |
| `aiPreAnalyze` LLM 504 | 20s server-side timeout；前端 AbortSignal 取消 + UI 允许重试 |
| `AiSourceInfoCard` 解析失败 | marker 缺失/损坏 → null（不渲染，保留 MyInput 编辑行为） |
| LLM 输出无 JSON | 502 后端返；前端 error 事件 + 提示「LLM 未输出有效 JSON」 |

## 不在本次范围

- 协议版本管理 / chat 历史持久化
- 协议市场（公开协议模板）
- AI 协议二次编辑流（`/edit-stream` 决策 v2）
- 模型选择（当前 server 端固定 provider）
- 多语言 chat（i18n）
- AI token 自动 rotate（仅手动 issue + revoke）
- prompt 模板管理
