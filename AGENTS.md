<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Next.js 16.2 迁移关键规则

### params 是 Promise

**所有动态路由页面**必须用 `useParams()` 获取路由参数，不再从 props 解构：

```tsx
// ❌ 旧写法（Next.js 16.2 已不支持）
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ 正确写法
import { useParams } from 'next/navigation'
export default function Page() {
  const params = useParams()
  const id = params.id as string
}
```

受影响的页面（已知）：
- `app/(user)/main/dev/[id]/page.tsx`
- `app/(user)/main/terminal/[id]/page.tsx`
- `app/(admin)/admin/node/user/info/[user]/page.tsx`
- 以及所有 `[param]` 动态路由页面

## Ant Design v5 → v6 迁移（deprecation warnings）

antd v6 已废弃大量 v5 API，修复规律：

| 废弃写法 | 正确写法 |
|---|---|
| `<Spin tip="...">` | `<Spin description="...">` |
| `<Alert message="...">` | `<Alert title="...">` |
| `<Breadcrumb.Item>` + `<Breadcrumb.Separator>` | `<Breadcrumb items={[...]}>` |
| `<Input.Group compact>` | `<Space.Compact>` |

受影响的已知页面：
- `app/simulate-login/page.tsx` — Spin tip
- `app/(user)/layout.tsx` — Alert message
- `app/(user)/main/dev/[id]/page.tsx` — Breadcrumb.Item
- `app/(user)/main/terminal/[id]/page.tsx` — Breadcrumb.Item + params
- `app/(user)/main/addterminal/page.tsx` — Input.Group

后续可能还有 Tabs.items、Table.items、Form.items 等全面迁移，参考 antd 官方迁移文档。

## AI Ops 协作约定（feat/web-ai-ops · 2026-07-23）

配合 server 端 PR #106 (`feat/ai-ops`) 实现的 admin 后台 AI 工具页面。**字段名 / 端点 / 鉴权约定**跟 server 端 SKILL.md (`midwayuartserver/.agents/skills/uart-server-ops/SKILL.md`) 严格对齐。

### 4 个端点要熟

| 端点 | 方法 | 鉴权 | 用途 |
|---|---|---|---|
| `/api/v2/admin/auth/issue-ai-token` | POST | ADMIN/ROOT | 签发 long-lived stateless JWT (30d 默认, payload `user: 'ai:<name>', userGroup: 'ai'`) |
| `/api/v2/admin/ai-ops/diagnose` | POST | ADMIN/ROOT/AI | 设备一站式诊断 (5 维: terminal / heartbeat / instructHistory / alarms / transitions) |
| `/api/v2/admin/ai-ops/system/health` | GET | ADMIN/ROOT/AI | 系统健康: mongo/redis/5xx 错误数, 返 `overall: healthy\|degraded\|down` |
| 25 个 admin GET 端点 | GET | AI 也可 | admin-terminal (5) + admin-dashboard (19) + admin-alert-approval (2) — 全部支持 AI 角色 |

**写端点全不给 AI** — instruct / share / owner / online / clean / approve / reject 等, AI 调会返 403 (`{ code: 0, message: 'Forbidden' }`)。**不要试图绕过**。

### 关键约束

- **AI token 不要在 web 端调任何 endpoint** — 拿 admin 签出来的 token 后, web 端只展示 + 复制, 给 Mavis / 外部工具用. web 端继续走当前 admin session 调业务.
- **token 一次性展示, 关闭后无法再查** — 跟现有 user token 一样, server 端不持久化明文.
- **撤销 token 靠改 server `Secret_JwtSign` secret** (`midwayuartserver/src/common/util/util.ts:15 'ladisWebSite'`) — 副作用大, 同时让所有 user token 失效, 短期接受.
- **审计走 `log.userRequests` filter `{ userGroup: 'ai' }`** — server 端 `/api/v2/admin/logs/user-requests` **当前不支持 server-side userGroup filter**, web 端 `/admin/ai/audit` 走 client-side 过滤 + 默认 7d 时间窗 + pageSize 200. 后续 server 端加 filter 后再切.

### admin 端 4 类 AI 工具页面

| 页面 | 路径 | 状态 | 备注 |
|---|---|---|---|
| AI Token 签发 | `/admin/ai/token` | ✅ 已实现 (feat/web-ai-ops) | 表单 + token 展示 + 复制 Mavis 配置 |
| AI 调用审计 | `/admin/ai/audit` | ✅ 已实现 (feat/web-ai-ops) | 走 loguserrequsts + client filter |
| AI 诊断按钮 (terminal 详情页) | `/admin/node/terminal/[id]` | ⏳ TODO | 调 aiOpsDiagnose 一站式聚合 |
| 系统健康 dashboard (admin 首页) | `/admin` | ⏳ TODO | 调 aiOpsSystemHealth 加 5xx 计数 + mongo/redis 状态 |

### TypeScript 约定 (跟 server DTO 严格对齐)

所有 AI ops 类型定义在 `types/uart.d.ts` 末尾的 `Uart` namespace:
- `Uart.AiTokenIssueDto` / `Uart.AiTokenIssueResult`
- `Uart.AiDiagnoseReq` / `Uart.AiDiagnoseResult` (5 维, 失败维度 fallback null)
- `Uart.AiSystemHealthResult` (overall: 'healthy' | 'degraded' | 'down')

API wrappers 在 `lib/api/endpoints/admin/aiOps.ts`, 通过 `lib/api/fetchRoot.ts` barrel re-export 出来.

**改完 .ts 后必须手动跑 tsc** 让 dist 重新生成, 这是项目惯例.

### UI 约定

- 走 antd v6 + BentoCard + PageHeader + PageSummary, 跟现有 admin 页面 (feature-flags / oss / redis) 一致
- 不用 Vant / 不用 antd v5 API
- 关键文案 (权限 / 审计 / 撤销) 必须显眼展示 — 这是 admin 配 token 时的安全教育窗口
- token 展示用深色 monospace 块 (跟 server 端登录 token 一致视觉)

### 通则 (跟 server 端协作任何新 ops 模块)

1. server 加新端点 → web 端加对应 API wrapper + type + 页面
2. 类型定义以 server DTO 为权威源, 在 `types/uart.d.ts` 末尾加, 跟现有命名一致
3. 走 worktree + 1 个 PR, 中文 commit message
4. 改完跑 `tsc` 验证编译, 部署到 cc@uart.ladishb.com 上
5. server 端 `AGENTS.md` 跟 web 端 `AGENTS.md` 互相对齐, 一边加新东西另一边要 sync
