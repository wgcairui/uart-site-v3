import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono, Noto_Sans_SC } from 'next/font/google'
import AntdProvider from '@/providers/AntdProvider'
import './globals.css'

/**
 * UART UI v2 · 2+3 混合方案
 *
 * 字体注入 (next/font/google):
 * - Outfit (拉丁主字体)
 * - Noto Sans SC (中文)
 * - JetBrains Mono (代码 / 数字 / monospace 区)
 *
 * 通过 CSS 变量 --font-outfit / --font-noto-sc / --font-jetbrains 暴露
 * 在 globals.css / tailwind.config.ts 里引用
 */

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500'],
})

const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sc',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
    <html
      lang="zh-CN"
      className={`${outfit.variable} ${jetbrains.variable} ${notoSC.variable}`}
    >
      <body
        style={{
          fontFamily:
            "var(--font-outfit), var(--font-noto-sc), system-ui, -apple-system, sans-serif",
        }}
      >
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  )
}
