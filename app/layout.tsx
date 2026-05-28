import type { Metadata } from 'next'
import AntdProvider from '@/providers/AntdProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'UART 管理平台',
  description: 'IoT 设备管理平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  )
}
