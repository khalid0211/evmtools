import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import { logToolUsage, type ToolSlug } from './api'

export function useLogToolUsage(tool: ToolSlug) {
  const { auth } = useAuth()
  const token = auth?.token

  useEffect(() => {
    if (token) logToolUsage(tool, token)
  }, [tool, token])
}
