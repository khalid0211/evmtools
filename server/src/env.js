import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SQLITE_PATH: z.string().default(path.join(__dirname, '..', 'data', 'app.db')),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('365d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Project Management Tools <no-reply@projectadvisor.cloud>'),
  CODE_TTL_MINUTES: z.coerce.number().default(10),
  MAX_ATTEMPTS: z.coerce.number().default(5),
  EMAIL_THROTTLE_PER_HOUR: z.coerce.number().default(5),
  IP_RATE_LIMIT_PER_HOUR: z.coerce.number().default(30),
  NODE_ENV: z.string().default('development'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[env] invalid configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
