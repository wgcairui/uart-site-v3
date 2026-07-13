import { NextRequest, NextResponse } from 'next/server'
import CryptoJS from 'crypto-js'

/**
 * 开发环境一键管理员登录 endpoint (dev-only)
 *
 * 安全设计 (5 层防护, 见 docs/dev-login.md):
 *  1. NODE_ENV === 'production' 硬 guard → 永远 404
 *  2. DEV_ADMIN_USER / DEV_ADMIN_PASSWORD **无** NEXT_PUBLIC_ 前缀 → 永不进 client bundle
 *  3. .env.local 已在 .gitignore (line 35) → 永不 commit
 *  4. 调真后端走 hash + AES 加密 → 拿真实 token, 跟手工登录一模一样
 *  5. 路由路径在 prod nginx 拦截下落到 midwayuartserver, 那边也没这 endpoint → 404 兜底
 *
 * 使用 (本地 .env.local, 不 commit):
 *   DEV_ADMIN_USER=root
 *   DEV_ADMIN_PASSWORD=xxx
 *   NEXT_PUBLIC_HAS_DEV_CREDS=1
 *
 * 前端点击「开发登录」按钮 → POST /api/dev-login → setCookie + redirect
 */

export const dynamic = 'force-dynamic' // 每次读最新 env
export const runtime = 'nodejs' // crypto-js 需要 node runtime

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ code: 404, message: 'Not Found' }, { status: 404 })
  }

  const user = process.env.DEV_ADMIN_USER
  const pwd = process.env.DEV_ADMIN_PASSWORD
  if (!user || !pwd) {
    return NextResponse.json(
      {
        code: 503,
        message:
          'dev creds not configured (set DEV_ADMIN_USER / DEV_ADMIN_PASSWORD in .env.local, then set NEXT_PUBLIC_HAS_DEV_CREDS=1 to enable the button)',
      },
      { status: 503 },
    )
  }

  const backend = (process.env.BACKEND_URL || 'http://localhost:9010').replace(/\/+$/, '')

  try {
    // 1) 拿 server 端 hash
    const hashRes = await fetch(
      `${backend}/api/v2/auth/login-hash?user=${encodeURIComponent(user)}`,
    )
    if (!hashRes.ok) {
      return NextResponse.json(
        { code: 502, message: `login-hash upstream HTTP ${hashRes.status}` },
        { status: 502 },
      )
    }
    const hashJson: any = await hashRes.json()
    if (hashJson?.code !== 200 || !hashJson?.data) {
      return NextResponse.json(
        { code: 502, message: `login-hash failed: ${hashJson?.message || 'no hash'}` },
        { status: 502 },
      )
    }
    const hash: string = hashJson.data

    // 2) AES 加密密码 (跟 login page 一样的算法)
    const encrypted = CryptoJS.AES.encrypt(pwd, hash).toString()

    // 3) 真实登录
    const loginRes = await fetch(`${backend}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, passwd: encrypted }),
    })
    if (!loginRes.ok) {
      return NextResponse.json(
        { code: 502, message: `login upstream HTTP ${loginRes.status}` },
        { status: 502 },
      )
    }
    const loginJson: any = await loginRes.json()
    if (loginJson?.code !== 200 || !loginJson?.data) {
      return NextResponse.json(
        {
          code: 401,
          message: `login failed: ${loginJson?.message || 'no token returned'}`,
        },
        { status: 401 },
      )
    }
    const token: string = loginJson.data

    // 4) Set token cookie (跟 lib/utils/token.ts setToken 同格式)
    const expiresAt = new Date(Date.now() + 7 * 864e5) // 7 days
    const res = NextResponse.json({
      code: 200,
      data: { user, redirect: '/admin' },
    })
    res.cookies.set('token', encodeURIComponent(token), {
      path: '/',
      sameSite: 'lax',
      expires: expiresAt,
    })
    return res
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: `dev-login internal: ${e?.message || String(e)}` },
      { status: 500 },
    )
  }
}
