import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './env.js'

fs.mkdirSync(path.dirname(config.SQLITE_PATH), { recursive: true })

export const db = new DatabaseSync(config.SQLITE_PATH)

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email        TEXT PRIMARY KEY,
    display_name TEXT,
    created_at   TEXT NOT NULL,
    verified_at  TEXT
  )
`)

// Migration: add organization to users created before this column existed.
try {
  db.exec('ALTER TABLE users ADD COLUMN organization TEXT')
} catch (e) {
  if (!/duplicate column name/i.test(e.message)) throw e
}

db.exec(`
  CREATE TABLE IF NOT EXISTS email_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    consumed_at TEXT,
    created_at  TEXT NOT NULL
  )
`)

db.exec('CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email)')

db.exec(`
  CREATE TABLE IF NOT EXISTS tool_usage (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    tool       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)

db.exec('CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_created ON tool_usage(tool, created_at)')
db.exec('CREATE INDEX IF NOT EXISTS idx_tool_usage_email ON tool_usage(email)')

const nowIso = () => new Date().toISOString()

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
}

export function insertOrTouchUser(email) {
  const existing = getUserByEmail(email)
  if (existing) {
    db.prepare('UPDATE users SET verified_at = ? WHERE email = ?').run(nowIso(), email)
  } else {
    db.prepare(
      'INSERT INTO users (email, created_at, verified_at) VALUES (?, ?, ?)'
    ).run(email, nowIso(), nowIso())
  }
}

export function updateUserProfile(email, displayName, organization) {
  insertOrTouchUser(email)
  db.prepare('UPDATE users SET display_name = ?, organization = ? WHERE email = ?').run(
    displayName || null,
    organization || null,
    email
  )
  return getUserByEmail(email)
}

export function insertCode(email, codeHash, expiresAt) {
  db.prepare(
    'INSERT INTO email_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(email, codeHash, expiresAt, nowIso())
}

export function getLatestCodeForEmail(email) {
  return db
    .prepare(
      'SELECT * FROM email_codes WHERE email = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1'
    )
    .get(email)
}

export function countRecentCodesForEmail(email, sinceIso) {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM email_codes WHERE email = ? AND created_at > ?')
    .get(email, sinceIso)
  return row.c
}

export function markCodeConsumed(id) {
  db.prepare('UPDATE email_codes SET consumed_at = ? WHERE id = ?').run(nowIso(), id)
}

export function incrementAttempts(id) {
  db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').run(id)
}

export function insertToolUsage(email, tool) {
  db.prepare('INSERT INTO tool_usage (email, tool, created_at) VALUES (?, ?, ?)').run(
    email,
    tool,
    nowIso()
  )
}

const PERIOD_BUCKETS = {
  day: '%Y-%m-%d',
  week: '%Y-%W',
  month: '%Y-%m',
}

export function getTopUsers(limit) {
  return db
    .prepare(
      `SELECT u.email AS email, u.display_name AS displayName, u.organization AS organization,
              COUNT(t.id) AS count
       FROM tool_usage t
       JOIN users u ON u.email = t.email
       GROUP BY t.email
       ORDER BY count DESC
       LIMIT ?`
    )
    .all(limit)
}

export function getToolCounts(period) {
  const bucketFormat = PERIOD_BUCKETS[period] || PERIOD_BUCKETS.day
  return db
    .prepare(
      `SELECT strftime('${bucketFormat}', created_at) AS bucket, tool,
              COUNT(*) AS opens, COUNT(DISTINCT email) AS uniqueUsers
       FROM tool_usage
       GROUP BY bucket, tool
       ORDER BY bucket DESC, tool ASC`
    )
    .all()
}

export function getAllToolUsage() {
  return db
    .prepare(
      `SELECT t.email AS email, u.display_name AS displayName, u.organization AS organization,
              t.tool AS tool, t.created_at AS createdAt
       FROM tool_usage t
       LEFT JOIN users u ON u.email = t.email
       ORDER BY t.created_at DESC`
    )
    .all()
}
