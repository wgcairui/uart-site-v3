'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { setToken } from '@/lib/utils/token'
import { Spin } from 'antd'
import { useUserStore } from '@/lib/store/userStore'

export default function SimulateLoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

    useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      sessionStorage.setItem('simulated', 'true')
      useUserStore.getState().setSimulated(true)
      router.push('/main')
    } else {
      setError('缺少 token 参数')
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <p style={{ color: 'red' }}>{error}</p>
        <a href="/admin">返回管理后台</a>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: 50 }}>
      <Spin description="正在跳转用户端..." size="large" />
    </div>
  )
}