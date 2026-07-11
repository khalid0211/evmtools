import express from 'express'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { config } from './env.js'
import {
  getLatestCodeForEmail,
  countRecentCodesForEmail,
  insertCode,
  insertOrTouchUser,
  markCodeConsumed,
  incrementAttempts,
} from './db.js'
import { sendVerificationCode } from './email.js'

export const authRouter = express.Router()

const emailField = z
  .string()
  .email()
  .max(200)
  .transform((s) => s.trim().toLowerCase())
const emailSchema = z.object({ email: emailField })
const verifySchema = z.object({ email: emailField, code: z.string().regex(/^\d{6}$/) })

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex')

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.IP_RATE_LIMIT_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
})

authRouter.post('/request-code', requestLimiter, async (req, res) => {
  const parsed = emailSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_email' })
  const { email } = parsed.data

  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recent = countRecentCodesForEmail(email, sinceIso)
  if (recent >= config.EMAIL_THROTTLE_PER_HOUR) {
    return res.status(429).json({ error: 'too_many_requests' })
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  const expiresAt = Date.now() + config.CODE_TTL_MINUTES * 60 * 1000
  insertCode(email, hashCode(code), expiresAt)

  try {
    await sendVerificationCode(email, code)
  } catch (e) {
    console.error('[auth] sendVerificationCode failed:', e.message)
    return res.status(502).json({ error: 'email_failed' })
  }
  res.json({ ok: true })
})

authRouter.post('/verify', (req, res) => {
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' })
  const { email, code } = parsed.data

  const row = getLatestCodeForEmail(email)
  if (!row) return res.status(400).json({ error: 'no_code' })
  if (row.attempts >= config.MAX_ATTEMPTS) return res.status(429).json({ error: 'too_many_attempts' })
  if (row.expires_at < Date.now()) return res.status(400).json({ error: 'expired' })

  if (row.code_hash !== hashCode(code)) {
    incrementAttempts(row.id)
    return res.status(400).json({ error: 'wrong_code' })
  }

  markCodeConsumed(row.id)
  insertOrTouchUser(email)

  const token = jwt.sign({ email }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })
  res.json({ token, email })
})

// Use this to protect any route that requires a verified user.
export function requireAuth(req, res, next) {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/)
  if (!m) return res.status(401).json({ error: 'no_token' })
  try {
    req.user = jwt.verify(m[1], config.JWT_SECRET) // { email }
    next()
  } catch {
    return res.status(401).json({ error: 'bad_token' })
  }
}
