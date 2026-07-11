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
