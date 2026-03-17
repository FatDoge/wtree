import type { ApiResult } from '../../shared/wtui-types'

const apiBase = import.meta.env.VITE_WTUI_API_URL as string | undefined

function withBase(path: string) {
  if (!apiBase) return path
  return new URL(path, apiBase).toString()
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(withBase(path))
  return (await res.json()) as ApiResult<T>
}

export async function apiPost<T, B>(path: string, body: B): Promise<ApiResult<T>> {
  const res = await fetch(withBase(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await res.json()) as ApiResult<T>
}

export async function apiPut<T, B>(path: string, body: B): Promise<ApiResult<T>> {
  const res = await fetch(withBase(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await res.json()) as ApiResult<T>
}

export async function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(withBase(path), { method: 'DELETE' })
  return (await res.json()) as ApiResult<T>
}
