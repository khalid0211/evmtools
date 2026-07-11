import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth/AuthContext'

type Step = 'email' | 'code'

export default function AuthGate({ children }: { children: ReactNode }) {
  const { auth, busy, error, requestCode, verifyCode } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  if (auth) return <>{children}</>

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await requestCode(email.trim().toLowerCase())
      setStep('code')
    } catch {
      // error message already set in context state
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await verifyCode(email.trim().toLowerCase(), code, name.trim(), organization.trim())
    } catch {
      // error message already set in context state
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl">📊</div>
          <h1 className="text-lg font-semibold text-ink-900 mt-1">Project Management Tools</h1>
          <p className="text-xs text-ink-400">EVM, Cash Flow &amp; WBS Tools</p>
        </div>

        <div className="card">
          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900 mb-1">Verify your email</h2>
                <p className="text-sm text-ink-400">
                  We&rsquo;ll send a 6-digit code to confirm it&rsquo;s you. You won&rsquo;t be
                  asked again on this device.
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor="auth-name">
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoFocus
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="auth-organization">
                  Organization <span className="font-normal text-ink-400">(optional)</span>
                </label>
                <input
                  id="auth-organization"
                  type="text"
                  className="input"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="auth-email">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && <div className="text-sm text-danger">{error}</div>}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={busy || !email.trim() || !name.trim()}
              >
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900 mb-1">Enter your code</h2>
                <p className="text-sm text-ink-400">
                  We sent a 6-digit code to <strong className="text-ink-700">{email}</strong>. It
                  expires in 10 minutes.
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor="auth-code">
                  Verification code
                </label>
                <input
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  className="input text-center text-lg font-semibold tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </div>
              {error && <div className="text-sm text-danger">{error}</div>}
              <button type="submit" className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                className="w-full text-center text-sm text-ink-400 underline hover:text-ink-700"
                onClick={() => {
                  setStep('email')
                  setCode('')
                }}
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
