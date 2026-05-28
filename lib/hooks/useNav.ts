'use client'

import { useRouter } from 'next/navigation'

export const useNav = () => {
  const router = useRouter()
  return (path: string, query?: Record<string, string>) => {
    const url = query ? `${path}?${new URLSearchParams(query).toString()}` : path
    return router.push(url)
  }
}
