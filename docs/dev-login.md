# Dev 登录 (本地一键管理员登录)

> **本地开发**专用 — 减少每次手敲 root 密码的麻烦，**任何代码 / bundle / git 都不含真实凭据**。

## 用法

1. 在项目根目录的 `.env.local`（**已经 `.gitignore` 保护**）里加：
   ```bash
   DEV_ADMIN_USER=<管理员账号>
   DEV_ADMIN_PASSWORD=<你的实际密码, 问 cairui 或查自己密码管理器>
   NEXT_PUBLIC_HAS_DEV_CREDS=1
   BACKEND_URL=https://uart.ladishb.com   # 或 http://localhost:9010 (本地后端)
   ```
2. `bun run dev`，打开 `http://localhost:3000/login`
3. 切到「账号登录」tab，**会多出一个紫色虚线框的「开发登录」按钮**（其他 tab 没有）
4. 点一下 → 后端走真 hash+login 流程 → setCookie → 跳 `/admin`

> 没有设 `NEXT_PUBLIC_HAS_DEV_CREDS=1` 就跟普通登录一样，只显示「登录 / 我要试用?」。

## 安全保证（5 层防护）

| 层 | 措施 | 实现 |
|---|---|---|
| 1. **git 不进** | `.env.local` 已被 `.gitignore` line 35 保护 | 历史 commit 无任何管理员凭据 |
| 2. **bundle 不进** | `DEV_ADMIN_*` **无** `NEXT_PUBLIC_` 前缀 | Next.js 不会编入 client bundle |
| 3. **prod 不进** | `app/api/dev-login/route.ts` 内 `NODE_ENV === 'production'` 硬 guard | prod 永远 404 |
| 4. **build artifact 不进** | `dynamic = 'force-dynamic'`, 每次读 runtime env | `next build` 不会固化凭据 |
| 5. **nginx 兜底** | prod 端 `/api/dev-login` 走 nginx → midwayuartserver → 没这 endpoint → 404 | 即便意外部署也安全 |

> 即便不小心 `git add -f .env.local`，跑 `git log -p --all -S '<你的密码>'` 应该能秒发现（前提是你用了唯一字符串作密码 — 不然用 `git log -p --all -- .env.local` 直接定位文件）。

## 跟现有按钮的区别

| 按钮 | 凭据来源 | 适用场景 | 限制 |
|---|---|---|---|
| **登录** | 用户手动输入 | 任何环境 | 每次敲密码 |
| **我要试用?** | hardcode `test/123456` | 任何环境 | 试用账号，无 admin 权限 |
| **开发登录** | `DEV_ADMIN_*` env | **仅本地 dev** | prod 隐藏 / 失败 |

## 切换 / 关闭

- **临时关闭**：注释掉 `.env.local` 里 `NEXT_PUBLIC_HAS_DEV_CREDS=1`，重启 dev
- **永久关闭**：把 `NEXT_PUBLIC_HAS_DEV_CREDS=1` 删掉，dev 按钮自动消失
- **换账号**：改 `DEV_ADMIN_USER` / `DEV_ADMIN_PASSWORD`，无需改代码

## 故障排查

| 现象 | 原因 | 修法 |
|---|---|---|
| 看不到「开发登录」按钮 | `NEXT_PUBLIC_HAS_DEV_CREDS=1` 没设 | 加上 + 重启 dev |
| 点了按钮 → 503 dev creds not configured | `DEV_ADMIN_USER/PASSWORD` 缺 | 检查 `.env.local` |
| 点了按钮 → 502 login-hash upstream | 后端不通 / `BACKEND_URL` 错 | 检查 `BACKEND_URL` 和后端服务 |
| 点了按钮 → 401 login failed | 密码错 / 账号不存在 | 检查 env 值 |
| 点了按钮 → 404 Not Found | 跑 prod build 了 | 用 `bun run dev`（不是 `next start`） |
| 按钮点了没反应 (loading 一直转) | 网络断 / 后端没起 | 看 Network 标签 fetch `/api/dev-login` |

## 反例（不要这样做）

```ts
// ❌ 绝对不要 — 密码进 client bundle, 任何 DevTools 都能看到
const pwd = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD  // 用了 NEXT_PUBLIC_ 前缀
```

```ts
// ❌ 绝对不要 — 密码进 git history, 永久泄露
const DEV_PWD = '<你的实际密码>'  // hardcode 进源代码
```

```bash
# ❌ 绝对不要 — env 文件会进 commit (虽然 .gitignore 已拦, 但 -f 强加就 GG)
git add -f .env.local
```

## 实施历史

- 2026-07-13：feat/dev-login-from-env 分支首次实施，配 PR #28
