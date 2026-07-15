import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import MetricCard from '../components/layout/MetricCard'
import HelpDialog from '../components/layout/HelpDialog'
import Expander from '../components/layout/Expander'
import ReportDialog from '../components/evm/ReportDialog'
import PortfolioToolbar from '../components/portfolio/PortfolioToolbar'
import ProjectEditor from '../components/portfolio/ProjectEditor'
import ProjectsTable from '../components/portfolio/ProjectsTable'
import PortfolioGantt from '../components/portfolio/PortfolioGantt'
import CashflowFundingSection from '../components/portfolio/CashflowFundingSection'
import SnapshotBar from '../components/portfolio/SnapshotBar'
import StatusTable from '../components/portfolio/StatusTable'
import RollupMetrics from '../components/portfolio/RollupMetrics'
import ProgressChart from '../components/portfolio/ProgressChart'
import { portfolioHelp } from '../lib/help/content'
import { computePortfolioCashflow, isValidProject } from '../lib/portfolio/cashflow'
import { computePortfolioRollup } from '../lib/portfolio/evm'
import {
  buildCashflowFigure,
  buildNetFundingFigure,
  buildPortfolioGanttFigure,
  buildProgressFigure,
  type PortfolioFigure,
} from '../lib/portfolio/figures'
import { computeFundingAnalysis } from '../lib/portfolio/funding'
import {
  buildActualCurves,
  latestSnapshot,
  samplePortfolioPvCurve,
} from '../lib/portfolio/history'
import { parseUtc } from '../lib/portfolio/periods'
import {
  exportJson,
  loadFromStorage,
  parseImportedJson,
  saveToStorage,
} from '../lib/portfolio/persistence'
import {
  createDefaultPortfolio,
  createEmptyPortfolio,
  portfolioReducer,
} from '../lib/portfolio/state'
import {
  buildPortfolioReportHtml,
  type PortfolioReportImages,
  type PortfolioReportMeta,
} from '../lib/portfolio/report'
import { useLogToolUsage } from '../lib/auth/useLogToolUsage'
import type { PortfolioProject } from '../types/portfolio'

type Tab = 'projects' | 'cashflow' | 'progress'

const TABS: { id: Tab; label: string }[] = [
  { id: 'projects', label: '📋 Projects & Gantt' },
  { id: 'cashflow', label: '💰 Cash Flow & Funding' },
  { id: 'progress', label: '📈 Progress' },
]

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export default function PortfolioPlanner() {
  useLogToolUsage('portfolio-planner')
  const [state, dispatch] = useReducer(
    portfolioReducer,
    undefined,
    () => loadFromStorage() ?? createDefaultPortfolio(),
  )
  const [tab, setTab] = useState<Tab>('projects')
  const [toast, setToast] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectedDateRaw, setSelectedDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const storageWarned = useRef(false)

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

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDirtyChange = useCallback((dirty: boolean) => setEditorDirty(dirty), [])

  const validProjects = useMemo(() => state.projects.filter(isValidProject), [state.projects])
  const summary = useMemo(() => {
    if (validProjects.length === 0) return null
    const startMs = Math.min(...validProjects.map((p) => parseUtc(p.planStart)))
    const finishMs = Math.max(...validProjects.map((p) => parseUtc(p.planFinish)))
    return {
      totalBac: validProjects.reduce((s, p) => s + p.bac, 0),
      start: new Date(startMs).toISOString().slice(0, 10),
      finish: new Date(finishMs).toISOString().slice(0, 10),
    }
  }, [validProjects])

  const latest = useMemo(() => latestSnapshot(state.statusHistory), [state.statusHistory])
  // the edited snapshot falls back to the latest one after deletes/imports
  const selectedSnapshot = useMemo(() => {
    const bySelection = state.statusHistory.find((s) => s.dataDate === selectedDateRaw)
    return bySelection ?? latest
  }, [state.statusHistory, selectedDateRaw, latest])

  const rollup = useMemo(
    () =>
      latest ? computePortfolioRollup(state.projects, latest.dataDate, latest) : null,
    [state.projects, latest],
  )

  const editingProject = useMemo(
    () => state.projects.find((p) => p.id === editingId) ?? null,
    [state.projects, editingId],
  )

  function confirmDiscardDraft(): boolean {
    if (!editorDirty) return true
    return window.confirm('Discard unsaved changes in the project form?')
  }

  function handleSelectProject(id: string) {
    if (id === editingId) return
    if (!confirmDiscardDraft()) return
    setEditorDirty(false)
    setEditingId(id)
  }

  function handleSaveProject(project: PortfolioProject) {
    dispatch({ type: 'upsert-project', project })
    setEditingId(null)
    showToast(editingId ? 'Project updated' : 'Project added')
  }

  function handleDeleteProject(id: string) {
    const project = state.projects.find((p) => p.id === id)
    if (
      !window.confirm(
        `Delete "${project?.name ?? 'this project'}" and its status history entries?`,
      )
    ) {
      return
    }
    if (editingId === id) setEditingId(null)
    dispatch({ type: 'delete-project', id })
  }

  function handleNew() {
    if (!window.confirm('Start a new empty portfolio? Unsaved changes will be lost.')) return
    dispatch({ type: 'replace-state', state: createEmptyPortfolio() })
    setSelectedDate(null)
    setEditingId(null)
    setImportErrors([])
    showToast('New portfolio started')
  }

  function handleImportJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImportedJson(String(reader.result))
      if (result.ok) {
        dispatch({ type: 'replace-state', state: result.state })
        setSelectedDate(null)
        setEditingId(null)
        setImportErrors([])
        showToast('Portfolio imported')
      } else {
        setImportErrors(result.errors)
      }
    }
    reader.onerror = () => setImportErrors(['Could not read the selected file'])
    reader.readAsText(file)
  }

  async function generateReport(meta: PortfolioReportMeta) {
    setReportBusy(true)
    try {
      const toPng = (figure: PortfolioFigure, height = 420) =>
        Plotly.toImage(
          { data: figure.data, layout: figure.layout },
          {
            format: 'png',
            width: 1000,
            height: (figure.layout.height as number) || height,
            scale: 2,
          },
        )

      const images: Partial<PortfolioReportImages> = {}
      const gantt = buildPortfolioGanttFigure(state.projects, latest?.dataDate ?? null)
      if (gantt) images.gantt = await toPng(gantt)

      const fundedKeys = Object.keys(state.funding.amounts).filter(
        (k) => state.funding.amounts[k] > 0,
      )
      const series = computePortfolioCashflow(
        state.projects,
        state.funding.granularity,
        fundedKeys,
      )
      if (series) {
        const analysis = computeFundingAnalysis(series, state.funding)
        images.cashflow = await toPng(buildCashflowFigure(series, analysis))
        images.net = await toPng(buildNetFundingFigure(analysis))
      }

      const pvCurve = samplePortfolioPvCurve(state.projects)
      if (pvCurve && latest) {
        images.progress = await toPng(
          buildProgressFigure(
            pvCurve,
            buildActualCurves(state.projects, state.statusHistory),
            latest.dataDate,
          ),
        )
      }

      const html = buildPortfolioReportHtml(state, meta, images)
      const win = window.open('', '_blank')
      if (!win) {
        window.alert('Please allow pop-ups for this site to generate the report.')
        return
      }
      win.document.open()
      win.document.write(html)
      win.document.close()
      setDialogOpen(false)
    } catch (err) {
      console.error('Failed to generate portfolio report', err)
      window.alert('Something went wrong while generating the report.')
    } finally {
      setReportBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/80 px-6 py-7 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="page-kicker !text-left">Portfolio Planning</div>
          <h1 className="page-header !text-left">📁 Portfolio Planner</h1>
          <p className="page-subtitle !mx-0 !text-left">
            Plan a portfolio of projects on a shared timeline, balance cash flow against a
            time-phased funding schedule, and progress it with earned-value metrics. Your
            portfolio is saved in this browser.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setHelpOpen(true)}
            title="How to use the Portfolio Planner"
          >
            ❓ Help
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setDialogOpen(true)}
            title="Generate a printable A4 report of the portfolio, funding analysis, and status"
          >
            Print Report
          </button>
        </div>
      </div>

      <PortfolioToolbar
        name={state.name}
        onSetName={(name) => dispatch({ type: 'set-name', name })}
        onNew={handleNew}
        onExportJson={() => {
          exportJson(state)
          showToast('Portfolio exported as JSON')
        }}
        onImportJson={handleImportJson}
        importErrors={importErrors}
      />

      {toast && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Projects"
          value={
            validProjects.length === state.projects.length
              ? String(state.projects.length)
              : `${validProjects.length} of ${state.projects.length}`
          }
          formula={validProjects.length < state.projects.length ? 'valid of total' : undefined}
        />
        <MetricCard label="Total BAC" value={summary ? fmt(summary.totalBac) : '—'} featured />
        <MetricCard label="Portfolio Start" value={summary?.start ?? '—'} />
        <MetricCard label="Portfolio Finish" value={summary?.finish ?? '—'} />
      </div>

      <div
        className="inline-flex rounded-xl border border-ink-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Portfolio Planner sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-brand-100 ${
              tab === t.id ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'projects' && (
        <>
          <Expander storageKey="portfolio.projects" title="📋 Projects">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <ProjectsTable
                projects={state.projects}
                editingId={editingId}
                onEdit={handleSelectProject}
                onDelete={handleDeleteProject}
              />
              <ProjectEditor
                key={editingId ?? 'new'}
                editing={editingProject}
                onSave={handleSaveProject}
                onCancel={() => {
                  if (confirmDiscardDraft()) {
                    setEditorDirty(false)
                    setEditingId(null)
                  }
                }}
                onDirtyChange={handleDirtyChange}
              />
            </div>
          </Expander>

          <Expander storageKey="portfolio.gantt" title="📅 Portfolio Gantt">
            <PortfolioGantt projects={state.projects} dataDate={latest?.dataDate ?? null} />
          </Expander>
        </>
      )}

      {tab === 'cashflow' && (
        <CashflowFundingSection
          projects={state.projects}
          funding={state.funding}
          onSetGranularity={(granularity) =>
            dispatch({ type: 'set-funding-granularity', granularity })
          }
          onSetAmount={(periodKey, amount) =>
            dispatch({ type: 'set-funding-amount', periodKey, amount })
          }
          onSetAmounts={(amounts) => dispatch({ type: 'set-funding-amounts', amounts })}
          onUpdateProject={(id, patch) => dispatch({ type: 'update-project', id, patch })}
        />
      )}

      {tab === 'progress' && (
        <>
          <Expander storageKey="portfolio.snapshots" title="📆 Status Updates">
            <p className="mb-3 text-xs text-ink-500">
              Add a data date, then enter each project's Actual Cost and % Complete as of that
              date. New updates start from the previous update's values.
            </p>
            <SnapshotBar
              history={state.statusHistory}
              selectedDate={selectedSnapshot?.dataDate ?? null}
              onSelect={setSelectedDate}
              onAdd={(dataDate) => {
                dispatch({ type: 'upsert-snapshot', dataDate })
                setSelectedDate(dataDate)
              }}
              onChangeDate={(from, to) => {
                dispatch({ type: 'change-snapshot-date', from, to })
                setSelectedDate(to)
              }}
              onDelete={(dataDate) => {
                dispatch({ type: 'delete-snapshot', dataDate })
                setSelectedDate(null)
              }}
            />
          </Expander>

          {selectedSnapshot ? (
            <>
              <Expander
                storageKey="portfolio.status"
                title={`📊 Project Status — ${selectedSnapshot.dataDate}`}
              >
                <StatusTable
                  projects={state.projects}
                  snapshot={selectedSnapshot}
                  onUpdateEntry={(projectId, patch) =>
                    dispatch({
                      type: 'update-snapshot-entry',
                      dataDate: selectedSnapshot.dataDate,
                      projectId,
                      patch,
                    })
                  }
                />
              </Expander>

              {rollup && (
                <Expander storageKey="portfolio.rollup" title="🎯 Portfolio Roll-up">
                  <RollupMetrics
                    rollup={rollup}
                    editingOtherDate={
                      selectedSnapshot.dataDate !== rollup.dataDate
                        ? selectedSnapshot.dataDate
                        : null
                    }
                  />
                </Expander>
              )}

              <Expander storageKey="portfolio.progress-chart" title="📈 PV / EV / AC over time">
                <ProgressChart
                  projects={state.projects}
                  history={state.statusHistory}
                  dataDate={latest?.dataDate ?? null}
                />
              </Expander>
            </>
          ) : (
            <div className="card-muted text-sm text-ink-400">
              Add a data date above to start progressing the portfolio: the system computes each
              project's Planned Value at that date, and you enter Actual Cost and % Complete to
              get SPI, SPIe, CPI and the portfolio roll-up.
            </div>
          )}
        </>
      )}

      <ReportDialog
        open={dialogOpen}
        busy={reportBusy}
        title="Generate Portfolio Report"
        initialProjectName={state.name || 'Portfolio'}
        onCancel={() => setDialogOpen(false)}
        onSubmit={generateReport}
      />
      <HelpDialog open={helpOpen} content={portfolioHelp} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
