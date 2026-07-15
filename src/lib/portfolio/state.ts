import type {
  PeriodGranularity,
  PortfolioProject,
  PortfolioState,
  ProjectStatusEntry,
  StatusSnapshot,
} from '../../types/portfolio'
import { convertFundingAmounts, parseUtc } from './periods'
import { sortedHistory } from './history'

export type PortfolioAction =
  | { type: 'set-name'; name: string }
  | { type: 'add-project' }
  | { type: 'upsert-project'; project: PortfolioProject }
  | { type: 'update-project'; id: string; patch: Partial<Omit<PortfolioProject, 'id'>> }
  | { type: 'delete-project'; id: string }
  | { type: 'set-funding-granularity'; granularity: PeriodGranularity }
  | { type: 'set-funding-amount'; periodKey: string; amount: number }
  | { type: 'set-funding-amounts'; amounts: Record<string, number> }
  | { type: 'upsert-snapshot'; dataDate: string }
  | {
      type: 'update-snapshot-entry'
      dataDate: string
      projectId: string
      patch: Partial<ProjectStatusEntry>
    }
  | { type: 'change-snapshot-date'; from: string; to: string }
  | { type: 'delete-snapshot'; dataDate: string }
  | { type: 'replace-state'; state: PortfolioState }

export function createProject(overrides: Partial<PortfolioProject> = {}): PortfolioProject {
  const today = new Date().toISOString().slice(0, 10)
  const inAYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
  return {
    id: crypto.randomUUID(),
    name: 'New Project',
    bac: 100,
    planStart: today,
    planFinish: inAYear,
    curve: 'S-Curve',
    alpha: 2,
    beta: 2,
    ...overrides,
  }
}

/** Blank portfolio for the "New Portfolio" action. */
export function createEmptyPortfolio(): PortfolioState {
  return {
    name: 'New Portfolio',
    projects: [],
    funding: { granularity: 'Quarterly', amounts: {} },
    statusHistory: [],
  }
}

/** Small staggered sample so the tool demos itself, like the WBS default state. */
export function createDefaultPortfolio(): PortfolioState {
  const projects = [
    createProject({
      name: 'Highway Upgrade',
      bac: 120,
      planStart: '2026-01-01',
      planFinish: '2027-06-30',
      curve: 'S-Curve',
    }),
    createProject({
      name: 'IT Modernization',
      bac: 60,
      planStart: '2026-04-01',
      planFinish: '2027-03-31',
      curve: 'Linear',
    }),
    createProject({
      name: 'New Campus',
      bac: 200,
      planStart: '2026-07-01',
      planFinish: '2028-06-30',
      curve: 'S-Curve',
    }),
  ]
  const amounts: Record<string, number> = {}
  for (const year of [2026, 2027, 2028]) {
    for (let q = 1; q <= 4; q++) amounts[`${year}-Q${q}`] = 40
  }
  return {
    name: 'Sample Portfolio',
    projects,
    funding: { granularity: 'Quarterly', amounts },
    statusHistory: [],
  }
}

function scrubProjectFromHistory(
  history: StatusSnapshot[],
  projectId: string,
): StatusSnapshot[] {
  return history.map((snap) => {
    if (!(projectId in snap.entries)) return snap
    const entries = { ...snap.entries }
    delete entries[projectId]
    return { ...snap, entries }
  })
}

export function portfolioReducer(
  state: PortfolioState,
  action: PortfolioAction,
): PortfolioState {
  switch (action.type) {
    case 'set-name':
      return { ...state, name: action.name }

    case 'add-project': {
      const project = createProject({ name: `Project ${state.projects.length + 1}` })
      return { ...state, projects: [...state.projects, project] }
    }

    case 'upsert-project': {
      const exists = state.projects.some((p) => p.id === action.project.id)
      return {
        ...state,
        projects: exists
          ? state.projects.map((p) => (p.id === action.project.id ? action.project : p))
          : [...state.projects, action.project],
      }
    }

    case 'update-project':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }

    case 'delete-project':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        statusHistory: scrubProjectFromHistory(state.statusHistory, action.id),
      }

    case 'set-funding-granularity': {
      if (action.granularity === state.funding.granularity) return state
      return {
        ...state,
        funding: {
          granularity: action.granularity,
          amounts: convertFundingAmounts(
            state.funding.amounts,
            state.funding.granularity,
            action.granularity,
          ),
        },
      }
    }

    case 'set-funding-amount': {
      const amounts = { ...state.funding.amounts }
      if (Number.isFinite(action.amount) && action.amount > 0) {
        amounts[action.periodKey] = action.amount
      } else {
        delete amounts[action.periodKey]
      }
      return { ...state, funding: { ...state.funding, amounts } }
    }

    case 'set-funding-amounts': {
      const amounts: Record<string, number> = {}
      for (const [key, amount] of Object.entries(action.amounts)) {
        if (Number.isFinite(amount) && amount > 0) amounts[key] = amount
      }
      return { ...state, funding: { ...state.funding, amounts } }
    }

    case 'upsert-snapshot': {
      if (!Number.isFinite(parseUtc(action.dataDate))) return state
      if (state.statusHistory.some((s) => s.dataDate === action.dataDate)) return state
      // carry the most recent earlier snapshot forward so the user starts from known values
      const earlier = sortedHistory(state.statusHistory).filter(
        (s) => s.dataDate < action.dataDate,
      )
      const seed = earlier.length > 0 ? earlier[earlier.length - 1].entries : {}
      const entries: Record<string, ProjectStatusEntry> = {}
      for (const [id, entry] of Object.entries(seed)) entries[id] = { ...entry }
      return {
        ...state,
        statusHistory: sortedHistory([
          ...state.statusHistory,
          { dataDate: action.dataDate, entries },
        ]),
      }
    }

    case 'update-snapshot-entry':
      return {
        ...state,
        statusHistory: state.statusHistory.map((snap) => {
          if (snap.dataDate !== action.dataDate) return snap
          const current = snap.entries[action.projectId] ?? { ac: 0, pctComplete: 0 }
          return {
            ...snap,
            entries: { ...snap.entries, [action.projectId]: { ...current, ...action.patch } },
          }
        }),
      }

    case 'change-snapshot-date': {
      if (action.from === action.to) return state
      if (!Number.isFinite(parseUtc(action.to))) return state
      if (state.statusHistory.some((s) => s.dataDate === action.to)) return state
      return {
        ...state,
        statusHistory: sortedHistory(
          state.statusHistory.map((snap) =>
            snap.dataDate === action.from ? { ...snap, dataDate: action.to } : snap,
          ),
        ),
      }
    }

    case 'delete-snapshot':
      return {
        ...state,
        statusHistory: state.statusHistory.filter((s) => s.dataDate !== action.dataDate),
      }

    case 'replace-state':
      return action.state
  }
}
