// 正常登录 token（admin / user / loginwx 共用）
export const getToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/)
  return match && match[1] ? decodeURIComponent(match[1]) : null
}

export const setToken = (token: string, days = 7): void => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`
}

export const clearToken = (): void => {
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

// 模拟登录 token：admin 在 user 端借用用户身份时使用
// 单独 cookie 名，避免覆盖 admin 的 `token`，退出模拟或退出登录时各自清自己的
export const SIMULATE_COOKIE = 'user_token'

export const getSimulateToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)user_token=([^;]*)/)
  return match && match[1] ? decodeURIComponent(match[1]) : null
}

export const setSimulateToken = (token: string, hours = 12): void => {
  const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString()
  document.cookie = `${SIMULATE_COOKIE}=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`
}

export const clearSimulateToken = (): void => {
  document.cookie = `${SIMULATE_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

// 退出登录：admin 和 user 端共用，一次清两个（admin 端没有 user_token = noop）
export const clearAllTokens = (): void => {
  clearToken()
  clearSimulateToken()
}

// 在 user 端路径下，模拟登录 token（user_token）优先于正常 token。
// 模拟登录 cookie 不会覆盖 admin 的 `token`，所以 admin 端始终读到的是自己的 token。
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    if (path === '/simulate-login' || path.startsWith('/main')) {
      const sim = getSimulateToken()
      if (sim) return `bearer%20${sim}`
    }
  }
  const token = getToken()
  return token ? `bearer%20${token}` : null
}