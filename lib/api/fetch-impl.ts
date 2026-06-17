// 底层 HTTP 封装：headers / Get / Post / Put / Patch / Del
// 不依赖具体业务，纯 fetch + token 处理
import { message } from 'antd'
import { universalResult } from '@/types'
import { getAuthToken } from '@/lib/utils/token'

export { getToken } from '@/lib/utils/token'

export const header = (): Headers => {
  const h = new Headers({ 'content-type': 'application/json' })
  const token = getAuthToken()
  if (token) h.append('authorization', token)
  return h
}

function validationStatus(res: universalResult<any>) {
  if (res?.status === 403) {
    message.error('操作没有权限')
  }
}

async function parseJson(res: Response) {
  const text = await res.text()
  if (!text) return { code: 0, data: null, msg: 'No Content' }
  try {
    return JSON.parse(text)
  } catch {
    // 非 JSON 响应（HTML 错误页等）
    const trimmed = text.trim()
    const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed
    return { code: res.status, data: null, msg: `响应非 JSON: ${preview}` }
  }
}

export const Post = async <T>(
  path: string,
  data?: { [x: string]: any }
): Promise<T> => {
  const init: RequestInit = { method: 'POST', headers: header() }
  if (data !== undefined) init.body = JSON.stringify(data)
  const res = await fetch(path, init)
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Get = async <T>(
  path: string,
  data?: { [x: string]: string }
): Promise<T> => {
  const qs = data ? new URLSearchParams(data).toString() : ''
  const res = await fetch(qs ? `${path}?${qs}` : path, { method: 'GET', headers: header() })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Put = async <T>(
  path: string,
  data: { [x: string]: any }
): Promise<T> => {
  const body = JSON.stringify(data)
  const res = await fetch(path, { method: 'PUT', headers: header(), body })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Patch = async <T>(
  path: string,
  data: { [x: string]: any }
): Promise<T> => {
  const body = JSON.stringify(data)
  const res = await fetch(path, { method: 'PATCH', headers: header(), body })
  const json = await parseJson(res)
  validationStatus(json)
  return json
}

export const Del = async <T>(
  path: string,
  data?: { [x: string]: any }
): Promise<T> => {
  const init: RequestInit = { method: 'DELETE', headers: header() }
  if (data) init.body = JSON.stringify(data)
  const res = await fetch(path, init)
  const json = await parseJson(res)
  validationStatus(json)
  return json
}