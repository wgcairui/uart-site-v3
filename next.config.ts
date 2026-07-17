import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    browserToTerminal: true,
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:9010'
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/client/:path*',
        destination: `${backend}/client/:path*`,
      },
    ]
  },
  // PR-1 (2026-07-17) — AI 工具 tab 整合: 老 /admin/ai/chat* 和 /admin/ai/dry-run 走 301 重定向
  // - chat 列表 → 协议列表 (用户点 "AI 修改" 应先选协议)
  // - chat/:name → 协议详情 ?tab=aiChat (直接进 AI 修改 tab)
  // - dry-run → 协议列表 (用户点 "Dry-run" 应先选协议, dry-run 需要绑定具体协议)
  // PR-2 (2026-07-17) — AI 生成页搬到 /admin/node/protocols/generate
  // - /admin/ai/generate → /admin/node/protocols/generate
  // - /admin/ai (索引页) → /admin/node/protocols/generate
  async redirects() {
    return [
      {
        source: '/admin/ai/chat',
        destination: '/admin/node/protocols',
        permanent: true,
      },
      {
        source: '/admin/ai/chat/:name',
        destination: '/admin/node/protocols/info?Protocol=:name&tab=aiChat',
        permanent: true,
      },
      {
        source: '/admin/ai/dry-run',
        destination: '/admin/node/protocols',
        permanent: true,
      },
      {
        source: '/admin/ai/generate',
        destination: '/admin/node/protocols/generate',
        permanent: true,
      },
      {
        source: '/admin/ai',
        destination: '/admin/node/protocols/generate',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
