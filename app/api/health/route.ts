import { NextResponse } from 'next/server'

/**
 * Local health endpoint — 2026-07-09 新增
 *
 * 背景：next.config.ts 把 `/api/:path*` 全 proxy 到 midwayuartserver:9010，
 * 但 midwayuartserver 没有 `/api/health`（只有 `/api/v2/open/health`），
 * 外部 monitor (k8s liveness, ELB health probe) 打 `/api/health` 时
 * rewrite → backend 404；backend 重启期间还可能 ECONNREFUSED。
 *
 * 这里用 Next.js route handler 优先于 rewrite，让 `/api/health` 走本地，
 * 不再被 rewrite 转发到 backend，外部 monitor 拿 200 即可。
 *
 * 选 Option A（local route）而不是 Option B（narrow rewrite 到 `/api/v2/:path*`）
 * 是因为 lib/api/endpoints/user.ts:106 `getDevTypes` 用了 v1 fallback
 * `/api/getDevTypes`（components/protocol/DevTypesCascader.tsx:37 还在用），
 * narrow rewrite 会把它打 404。
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'uart-web',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // health probe 不缓存，每次拿新鲜状态
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}

// HEAD probe (k8s liveness 常用) 也直接走本地
export const HEAD = GET