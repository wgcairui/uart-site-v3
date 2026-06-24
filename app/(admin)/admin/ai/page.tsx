'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /admin/ai 索引页 → 重定向到 /admin/ai/generate
 *
 * 「AI 工具」菜单分组有 3 个子项（generate / chat / dry-run），
 * 默认进 generate 页（最高频路径）。用户可在子页面间自由切换。
 */
export default function AiIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/ai/generate')
  }, [router])
  return null
}