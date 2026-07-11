import express from 'express'
import { config } from './env.js'
import { getTopUsers, getToolCounts, getAllToolUsage } from './db.js'

export const adminRouter = express.Router()

const PERIODS = new Set(['day', 'week', 'month'])
const TOP_USERS_LIMIT = 5

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!config.ADMIN_KEY || !key || key !== config.ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  next()
}

adminRouter.use(requireAdminKey)

adminRouter.get('/summary', (req, res) => {
  const period = PERIODS.has(req.query.period) ? req.query.period : 'day'
  res.json({
    topUsers: getTopUsers(TOP_USERS_LIMIT),
    toolCounts: getToolCounts(period),
    period,
  })
})

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

adminRouter.get('/export.csv', (req, res) => {
  const rows = getAllToolUsage()
  const headers = ['email', 'displayName', 'organization', 'tool', 'createdAt']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','))
  }
  const csv = lines.join('\n')

  const date = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="activity_export_${date}.csv"`)
  res.send(csv)
})
