'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { setToken, getToken } from '@/lib/utils/token'

export const useToken = (token?: string) => {
  const search = useSearchParams()

  useEffect(() => {
    const token2 = token || search.get('token')
    if (token2) {
      setToken(token2)
    }
  }, [token, search])

  return getToken()
}
