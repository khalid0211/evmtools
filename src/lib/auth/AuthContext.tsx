import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { ApiError, requestCode as apiRequestCode, verifyCode as apiVerifyCode } from './api'

const STORAGE_KEY = 'evmtools_auth'

interface AuthState {
  token: string
  email: string
  name: string | null
  organization: string | null
}

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthState) : null
  } catch {
    return null
  }
}

function saveAuth(auth: AuthState | null) {
  try {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — auth won't persist across reloads
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'invalid_email':
        return 'Enter a valid email address.'
      case 'too_many_requests':
        return 'Too many codes requested for this email — try again later.'
      case 'email_failed':
        return "Couldn't send the email — try again in a moment."
      case 'invalid_input':
        return 'Enter the 6-digit code.'
      case 'no_code':
        return 'Request a new code.'
      case 'expired':
        return 'That code expired — request a new one.'
      case 'wrong_code':
        return "That code isn't right."
      case 'too_many_attempts':
        return 'Too many attempts — request a new code.'
      default:
        return 'Something went wrong — please try again.'
    }
  }
  return 'Something went wrong — please try again.'
}

interface AuthContextValue {
  auth: AuthState | null
  busy: boolean
  error: string | null
  requestCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string, name: string, organization: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestCode = useCallback(async (email: string) => {
    setBusy(true)
    setError(null)
    try {
      await apiRequestCode(email)
    } catch (e) {
      setError(errorMessage(e))
      throw e
    } finally {
      setBusy(false)
    }
  }, [])

  const verifyCode = useCallback(async (email: string, code: string, name: string, organization: string) => {
    setBusy(true)
    setError(null)
    try {
      const result = await apiVerifyCode(email, code, name, organization)
      const next = {
        token: result.token,
        email: result.email,
        name: result.name,
        organization: result.organization,
      }
      saveAuth(next)
      setAuth(next)
    } catch (e) {
      setError(errorMessage(e))
      throw e
    } finally {
      setBusy(false)
    }
  }, [])

  const logout = useCallback(() => {
    saveAuth(null)
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, busy, error, requestCode, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
