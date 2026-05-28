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
}

export default nextConfig
