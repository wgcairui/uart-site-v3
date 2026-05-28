import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  // 未登录时重定向到 /login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // 保护用户端和管理员端路由
  matcher: [
    '/main/:path*',
    '/main',
    '/admin/:path*',
    '/admin',
  ],
}
