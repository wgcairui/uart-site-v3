'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  /** 过渡时长（ms，默认 200，必须 ≤ 300 符合 style guide §2.6） */
  duration?: number
}

/**
 * 页面切换过渡 — 包装在 layout 的 main 区域
 *
 * 视觉规范见 docs/style-guide.md §2.6：
 * - ≤ 300ms（这里默认 200）
 * - cubic-bezier(.4, 0, .2, 1)
 * - fade + 极小位移（4px），避免切换突兀
 *
 * 行为：
 * - pathname 变化时短暂淡出旧内容 → 淡入新内容
 * - 用 CSS animation，不依赖 framer-motion 等外部库
 * - mount 时立即淡入（无淡出）
 */
export function PageTransition({ children, duration = 200 }: PageTransitionProps) {
  const pathname = usePathname()
  const [displayPath, setDisplayPath] = useState(pathname)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('in')
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPath.current) return
    // 1) 淡出当前内容
    setPhase('out')
    const t = setTimeout(() => {
      // 2) 切到新内容
      prevPath.current = pathname
      setDisplayPath(pathname)
      setPhase('in')
    }, duration)
    return () => clearTimeout(t)
  }, [pathname, duration])

  const animState = phase === 'out' ? 'out' : 'in'

  return (
    <div
      key={displayPath}
      style={{
        animation: `page-${animState} ${duration}ms cubic-bezier(.4, 0, .2, 1)`,
        animationFillMode: 'both',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
      <style jsx global>{`
        @keyframes page-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes page-out {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

export default PageTransition
