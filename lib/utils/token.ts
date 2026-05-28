// 在浏览器中读取 cookie token
export const getToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/)
  return match && match[1] ? decodeURIComponent(match[1]) : null
}

// 设置 cookie token
export const setToken = (token: string, days = 7): void => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`
}

// 清除 cookie token
export const clearToken = (): void => {
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

// 获取格式化的 Authorization header 值
export const getAuthToken = (): string | null => {
  const token = getToken()
  return token ? `bearer%20${token}` : null
}
