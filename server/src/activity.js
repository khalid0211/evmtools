import express from 'express'
import { z } from 'zod'
import { requireAuth } from './auth.js'
import { insertToolUsage } from './db.js'

export const activityRouter = express.Router()

const activitySchema = z.object({
  tool: z.enum(['evm-calculator', 'cash-flow-simulator', 'wbs-maker', 'portfolio-planner']),
})

activityRouter.post('/', requireAuth, (req, res) => {
  const parsed = activitySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_tool' })

  insertToolUsage(req.user.email, parsed.data.tool)
  res.json({ ok: true })
})
