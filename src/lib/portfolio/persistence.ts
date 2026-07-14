import type {
  CurveType,
  PeriodGranularity,
  PortfolioFileEnvelope,
  PortfolioProject,
  PortfolioState,
  ProjectStatusEntry,
  StatusSnapshot,
} from '../../types/portfolio'
import { downloadTextFile, timestampedFilename } from '../shared/download'
import { parsePeriodKey, parseUtc } from './periods'

export const STORAGE_KEY = 'pmtools.portfolio.v1'

const CURVES: CurveType[] = ['Linear', 'S-Curve']
const GRANULARITIES: PeriodGranularity[] = ['Monthly', 'Quarterly', 'Yearly']

type ValidationResult = { ok: true; state: PortfolioState } | { ok: false; errors: string[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function positiveOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback
}

function sanitizeProject(raw: unknown, errors: string[], index: number): PortfolioProject | null {
  if (!isRecord(raw)) {
    errors.push(`Project ${index + 1}: not an object`)
    return null
  }
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    errors.push(`Project ${index + 1}: missing id`)
    return null
  }
  const bac = raw.bac
  if (typeof bac !== 'number' || !Number.isFinite(bac) || bac < 0) {
    errors.push(`Project ${index + 1}: BAC must be a non-negative number`)
    return null
  }
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    bac,
    planStart: typeof raw.planStart === 'string' ? raw.planStart : '',
    planFinish: typeof raw.planFinish === 'string' ? raw.planFinish : '',
    curve: CURVES.includes(raw.curve as CurveType) ? (raw.curve as CurveType) : 'Linear',
    alpha: positiveOr(raw.alpha, 2),
    beta: positiveOr(raw.beta, 2),
  }
}

function sanitizeFunding(raw: unknown): PortfolioState['funding'] {
  const rec = isRecord(raw) ? raw : {}
  const granularity = GRANULARITIES.includes(rec.granularity as PeriodGranularity)
    ? (rec.granularity as PeriodGranularity)
    : 'Monthly'
  const amounts: Record<string, number> = {}
  if (isRecord(rec.amounts)) {
    for (const [key, value] of Object.entries(rec.amounts)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
      const parsed = parsePeriodKey(key)
      if (!parsed || parsed.granularity !== granularity) continue
      amounts[key] = value
    }
  }
  return { granularity, amounts }
}

function sanitizeHistory(raw: unknown, projectIds: Set<string>): StatusSnapshot[] {
  if (!Array.isArray(raw)) return []
  const byDate = new Map<string, StatusSnapshot>()
  for (const item of raw) {
    if (!isRecord(item)) continue
    const dataDate = item.dataDate
    if (typeof dataDate !== 'string' || !Number.isFinite(parseUtc(dataDate))) continue
    const entries: Record<string, ProjectStatusEntry> = {}
    if (isRecord(item.entries)) {
      for (const [projectId, value] of Object.entries(item.entries)) {
        if (!projectIds.has(projectId) || !isRecord(value)) continue
        const ac =
          typeof value.ac === 'number' && Number.isFinite(value.ac) && value.ac >= 0
            ? value.ac
            : 0
        const pctRaw =
          typeof value.pctComplete === 'number' && Number.isFinite(value.pctComplete)
            ? value.pctComplete
            : 0
        entries[projectId] = { ac, pctComplete: Math.max(0, Math.min(100, pctRaw)) }
      }
    }
    byDate.set(dataDate, { dataDate, entries })
  }
  return [...byDate.values()].sort((a, b) => a.dataDate.localeCompare(b.dataDate))
}

/**
 * Structurally validate an unknown payload (imported JSON or localStorage)
 * into a PortfolioState. Recoverable problems (bad funding keys, out-of-range
 * percentages, snapshot entries for unknown projects) are sanitized away;
 * structural breakage fails with errors.
 */
export function validatePortfolioState(raw: unknown): ValidationResult {
  const errors: string[] = []
  if (!isRecord(raw)) return { ok: false, errors: ['Payload is not an object'] }
  if (!Array.isArray(raw.projects)) return { ok: false, errors: ['Missing projects list'] }

  const projects: PortfolioProject[] = []
  const seenIds = new Set<string>()
  raw.projects.forEach((p, i) => {
    const project = sanitizeProject(p, errors, i)
    if (!project) return
    if (seenIds.has(project.id)) {
      errors.push(`Project ${i + 1}: duplicate id ${project.id}`)
      return
    }
    seenIds.add(project.id)
    projects.push(project)
  })
  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    state: {
      name: typeof raw.name === 'string' ? raw.name : 'Untitled Portfolio',
      projects,
      funding: sanitizeFunding(raw.funding),
      statusHistory: sanitizeHistory(raw.statusHistory, seenIds),
    },
  }
}

export function makeEnvelope(state: PortfolioState): PortfolioFileEnvelope {
  return { app: 'pm-tools-portfolio', version: 1, savedAt: new Date().toISOString(), state }
}

export function saveToStorage(state: PortfolioState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeEnvelope(state)))
    return true
  } catch {
    return false
  }
}

export function loadFromStorage(): PortfolioState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.app !== 'pm-tools-portfolio') return null
    const result = validatePortfolioState(parsed.state)
    return result.ok ? result.state : null
  } catch {
    return null
  }
}

export function parseImportedJson(text: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['File is not valid JSON'] }
  }
  if (!isRecord(parsed)) return { ok: false, errors: ['File is not a portfolio export'] }
  if (parsed.app !== 'pm-tools-portfolio') {
    return {
      ok: false,
      errors: ['File was not exported by the Portfolio Planner (missing app marker)'],
    }
  }
  if (parsed.version !== 1) {
    return { ok: false, errors: [`Unsupported file version: ${String(parsed.version)}`] }
  }
  return validatePortfolioState(parsed.state)
}

export function exportJson(state: PortfolioState) {
  downloadTextFile(
    timestampedFilename('portfolio', 'json'),
    JSON.stringify(makeEnvelope(state), null, 2),
    'application/json',
  )
}
