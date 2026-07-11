export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'request_failed')
  }
  return data as T
}

function post<T>(path: string, body: unknown): Promise<T> {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function requestCode(email: string): Promise<{ ok: true }> {
  return post('/api/auth/request-code', { email })
}

export interface VerifyResult {
  token: string
  email: string
  name: string | null
  organization: string | null
}

export function verifyCode(
  email: string,
  code: string,
  name: string,
  organization: string
): Promise<VerifyResult> {
  return post('/api/auth/verify', { email, code, name, organization })
}

export type ToolSlug = 'evm-calculator' | 'cash-flow-simulator' | 'wbs-maker'

export function logToolUsage(tool: ToolSlug, token: string): void {
  fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tool }),
  }).catch(() => {
    // best-effort — activity logging failures shouldn't affect the user
  })
}

export type Period = 'day' | 'week' | 'month'

export interface TopUser {
  email: string
  displayName: string | null
  organization: string | null
  count: number
}

export interface ToolCount {
  bucket: string
  tool: string
  opens: number
  uniqueUsers: number
}

export interface AdminSummary {
  topUsers: TopUser[]
  toolCounts: ToolCount[]
  period: Period
}

export function fetchAdminSummary(period: Period, adminKey: string): Promise<AdminSummary> {
  return requestJson(`/api/admin/summary?period=${period}`, {
    headers: { 'X-Admin-Key': adminKey },
  })
}

export async function exportAdminCsv(adminKey: string): Promise<Blob> {
  const res = await fetch('/api/admin/export.csv', {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.error ?? 'request_failed')
  }
  return res.blob()
}
