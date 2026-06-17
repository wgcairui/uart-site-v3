// 用户端 Auth / Guest / Open 公共 API
import { Get, Post } from '@/lib/api/fetch'
import { universalResult } from '@/types'

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * 获取当前用户 (从token)
 * v2: GET /api/v2/auth/current-user
 */
export const getAuthUser = () => {
  return Get<universalResult<{ user: string; userGroup: string }>>('/api/v2/auth/current-user')
}

/**
 * 获取登录 Hash
 * v2: GET /api/v2/auth/login-hash
 */
export const getLoginHash = (user: string) => {
  return Get<universalResult<string>>('/api/v2/auth/login-hash', { user })
}

/**
 * 账号密码登录
 * v2: POST /api/v2/auth/login
 */
export const login = (user: string, passwd: string) => {
  return Post<universalResult<string>>('/api/v2/auth/login', { user, passwd })
}

/**
 * 微信登录
 * v2: POST /api/v2/auth/wechat-web/login
 */
export const wxlogin = (code: string, state: string) => {
  return Post<universalResult<{ token: string }>>('/api/v2/auth/wechat-web/login', { code, state })
}

// ─── Guest ───────────────────────────────────────────────────────────────────

/**
 * 添加用户
 * v2: POST /api/v2/guest/register
 */
export const addUser = (name: string, user: string, passwd: string, tel: string, mail: string, company: string) => {
  return Post<universalResult<any>>('/api/v2/guest/register', { name, user, passwd, tel, mail, company })
}

/**
 * 重置密码到发送验证码
 * v2: POST /api/v2/guest/password-reset/code
 */
export const resetPasswdValidation = (user: string) => {
  return Post<universalResult<any>>('/api/v2/guest/password-reset/code', { user })
}

/**
 * 重置用户密码
 * v2: POST /api/v2/guest/password-reset
 */
export const resetUserPasswd = (user: string, passwd: string, code: string) => {
  return Post<universalResult<any>>('/api/v2/guest/password-reset', { user, passwd, code })
}

// ─── Open / Utils ────────────────────────────────────────────────────────────

export const crc = (data: any) => {
  return Post<string>('/api/v2/open/utils/crc', { ...data })
}

/** V2 gps转高德gps */
export const V2_API_Aamp_gps2autoanvi = (
  locations: string | string[],
  coordsys: 'gps' | 'mapbar' | 'baidu' = 'gps'
) => {
  return Post<string | string[]>('/api/v2/open/utils/amap/gps-to-autonavi', {
    coordsys,
    locations: Array.isArray(locations) ? locations.join('|') : locations,
  })
}

/** 获取crc16 */
export const Crc = (data: any) => {
  return Post<string>('/api/v2/open/utils/crc', { ...data })
}