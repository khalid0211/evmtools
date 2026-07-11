export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'request_failed')
  }
  return data as T
}

export function requestCode(email: string): Promise<{ ok: true }> {
  return post('/api/auth/request-code', { email })
}

export function verifyCode(email: string, code: string): Promise<{ token: string; email: string }> {
  return post('/api/auth/verify', { email, code })
}
