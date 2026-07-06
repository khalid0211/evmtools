import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import MetricCard from '../components/layout/MetricCard'
import WbsToolbar from '../components/wbs/WbsToolbar'
import WbsTreeView from '../components/wbs/WbsTreeView'
import WbsOutline from '../components/wbs/WbsOutline'
import WbsNodeEditor from '../components/wbs/WbsNodeEditor'
import RiskMatrix from '../components/wbs/RiskMatrix'
import MonteCarloSection from '../components/wbs/MonteCarloSection'
import { createDefaultState, descendants, wbsReducer } from '../lib/wbs/tree'
import { computeWbs } from '../lib/wbs/calculations'
import { pertProjectDuration, runMonteCarlo } from '../lib/wbs/montecarlo'
import {
  exportJson,
  loadFromStorage,
  parseImportedJson,
  saveToStorage,
} from '../lib/wbs/persistence'
import { exportOutlineCsv } from '../lib/wbs/export'
import type { MonteCarloResult, WbsDictionary, WbsSettings } from '../types/wbs'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function WbsMaker() {
  const [state, dispatch] = useReducer(
    wbsReducer,
    undefined,
    () => loadFromStorage() ?? createDefaultState(),
  )
  const [selectedId, setSelectedId] = useState(state.rootId)
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null)
  const [mcStale, setMcStale] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const storageWarned = useRef(false)

  const computed = useMemo(() => computeWbs(state), [state])
  const pertDuration = useMemo(() => pertProjectDuration(state), [state])

  // keep selection valid after deletes/imports
  const selected = state.nodes[selectedId] ? selectedId : state.rootId

  // debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      const ok = saveToStorage(state)
      if (!ok && !storageWarned.current) {
        storageWarned.current = true
        showToast('⚠ Could not save to browser storage — changes are kept in memory only')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [state])

  // invalidate MC results when tree data changes
  useEffect(() => {
    setMcStale(true)
  }, [state.nodes])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function handleUpdateSettings(patch: Partial<WbsSettings>) {
    dispatch({ type: 'update-settings', patch })
  }

  function handleUpdateDict(id: string, patch: Partial<WbsDictionary>) {
    dispatch({ type: 'update-dict', id, patch })
  }

  function handleAddChild(parentId: string) {
    dispatch({ type: 'add-child', parentId })
  }

  function handleDelete(id: string) {
    const node = state.nodes[id]
    if (!node) return
    const kids = descendants(state.nodes, id).length
    const label = kids > 0 ? `Delete "${node.name}" and its ${kids} descendant item(s)?` : `Delete "${node.name}"?`
    if (!window.confirm(label)) return
    if (selected === id || descendants(state.nodes, id).includes(selected)) {
      setSelectedId(node.parentId ?? state.rootId)
    }
    dispatch({ type: 'delete', id })
  }

  function handleReset() {
    if (!window.confirm('Reset the WBS to the default sample project? This cannot be undone.')) {
      return
    }
    const fresh = createDefaultState()
    dispatch({ type: 'replace-state', state: fresh })
    setSelectedId(fresh.rootId)
    setMcResult(null)
    setImportErrors([])
    showToast('WBS reset')
  }

  function handleImportJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImportedJson(String(reader.result))
      if (result.ok) {
        dispatch({ type: 'replace-state', state: result.state })
        setSelectedId(result.state.rootId)
        setMcResult(null)
        setImportErrors([])
        showToast('WBS imported')
      } else {
        setImportErrors(result.errors)
      }
    }
    reader.onerror = () => setImportErrors(['Could not read the selected file'])
    reader.readAsText(file)
  }

  function handleRunMc() {
    const result = runMonteCarlo(state, {
      iterations: state.settings.mcIterations,
      seed: state.settings.mcSeed,
    })
    setMcResult(result)
    setMcStale(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-kicker">Work Breakdown Structure</div>
        <h1 className="page-header">🗂️ WBS Maker</h1>
        <p className="page-subtitle">
          Decompose your project into work packages with budgets, dates, and risk ratings — values
          roll up automatically. Your WBS is saved in this browser.
        </p>
      </div>

      <WbsToolbar
        settings={state.settings}
        onUpdateSettings={handleUpdateSettings}
        onExportJson={() => {
          exportJson(state)
          showToast('WBS exported as JSON')
        }}
        onImportJson={handleImportJson}
        onExportCsv={() => {
          exportOutlineCsv(state, computed)
          showToast('Outline exported as CSV')
        }}
        onReset={handleReset}
        importErrors={importErrors}
      />

      {toast && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          {toast}
        </div>
      )}

      {!computed.valid && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs font-semibold text-danger">
          Some work packages have end dates before their start dates — check the warnings below.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label={state.settings.advanced && state.settings.usePert ? 'Total Cost (PERT)' : 'Total Budget'}
          value={fmt(computed.totalCost)}
          featured
        />
        <MetricCard label="Project Start" value={computed.projectStart ?? '—'} />
        <MetricCard label="Project Finish" value={computed.projectEnd ?? '—'} />
        <MetricCard label="Work Packages" value={String(computed.leafCount)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="section-header">
            <span>{state.settings.viewMode === 'Chart' ? 'WBS Chart' : 'WBS Outline'}</span>
          </div>
          {state.settings.viewMode === 'Chart' ? (
            <WbsTreeView
              state={state}
              computed={computed}
              selectedId={selected}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
            />
          ) : (
            <WbsOutline
              state={state}
              computed={computed}
              selectedId={selected}
              onSelect={setSelectedId}
              onMove={(id, direction) => dispatch({ type: 'move', id, direction })}
            />
          )}
        </div>
        <div>
          <WbsNodeEditor
            state={state}
            computed={computed}
            selectedId={selected}
            onRename={(id, name) => dispatch({ type: 'rename', id, name })}
            onUpdateDict={handleUpdateDict}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span>🎯 Risk Matrix</span>
        </div>
        <RiskMatrix cells={computed.riskMatrix} />
      </div>

      <MonteCarloSection
        settings={state.settings}
        result={mcResult}
        stale={mcStale}
        pertCost={computed.perNode[state.rootId].pertCost}
        pertDuration={pertDuration}
        onUpdateSettings={handleUpdateSettings}
        onRun={handleRunMc}
      />

      {computed.warnings.length > 0 && (
        <div className="card-muted">
          <div className="subsection-title">Warnings</div>
          <ul className="space-y-1 text-xs text-ink-500">
            {computed.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
