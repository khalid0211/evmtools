import './src/env.js' // must be the first import (dotenv load order)
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './src/env.js'
import { authRouter } from './src/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '256kb' }))

app.use('/api/auth', authRouter)

app.use(express.static(distDir))

// SPA fallback — must come after /api routes and static assets, and must not
// swallow unknown /api/* paths (those should 404 as JSON, not index.html).
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`[server] listening on 0.0.0.0:${config.PORT}`)
})
