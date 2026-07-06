import type { MonteCarloResult, WbsState } from '../../types/wbs'
import { costTriple, durationTriple } from './calculations'
import { isLeaf } from './tree'
import { mulberry32, sampleBetaPert, summarize } from '../shared/random'

const MS_DAY = 86_400_000

interface LeafModel {
  costO: number
  costML: number
  costP: number
  durO: number
  durML: number
  durP: number
  /** UTC ms of the start date; null when dates are unset/invalid. */
  startMs: number | null
}

export interface MonteCarloOptions {
  iterations: number
  seed: number
}

export function runMonteCarlo(state: WbsState, opts: MonteCarloOptions): MonteCarloResult {
  const leaves: LeafModel[] = []
  for (const node of Object.values(state.nodes)) {
    if (!isLeaf(node)) continue
    const cost = costTriple(node.dict)
    const dur = durationTriple(node.dict)
    const { startDate, endDate } = node.dict
    const datesValid = Boolean(startDate && endDate && endDate >= startDate)
    const startMs = datesValid ? Date.parse(`${startDate}T00:00:00Z`) : NaN
    leaves.push({
      costO: cost.o,
      costML: cost.ml,
      costP: cost.p,
      durO: dur.o,
      durML: dur.ml,
      durP: dur.p,
      startMs: Number.isFinite(startMs) ? startMs : null,
    })
  }

  const datedLeaves = leaves.filter((l) => l.startMs !== null)
  const excludedFromDuration = leaves.length - datedLeaves.length
  const minStartMs =
    datedLeaves.length > 0 ? Math.min(...datedLeaves.map((l) => l.startMs as number)) : 0

  const rng = mulberry32(opts.seed)
  const costs = new Array<number>(opts.iterations)
  const durations = new Array<number>(opts.iterations)

  for (let i = 0; i < opts.iterations; i++) {
    let cost = 0
    for (const leaf of leaves) {
      cost += sampleBetaPert(leaf.costO, leaf.costML, leaf.costP, rng)
    }
    costs[i] = cost

    let maxEndMs = minStartMs
    for (const leaf of datedLeaves) {
      const durDays = sampleBetaPert(leaf.durO, leaf.durML, leaf.durP, rng)
      const endMs = (leaf.startMs as number) + durDays * MS_DAY
      if (endMs > maxEndMs) maxEndMs = endMs
    }
    durations[i] = datedLeaves.length > 0 ? (maxEndMs - minStartMs) / MS_DAY : 0
  }

  return {
    iterations: opts.iterations,
    seed: opts.seed,
    costs,
    durations,
    costStats: summarize(costs),
    durationStats: summarize(durations),
    excludedFromDuration,
  }
}
