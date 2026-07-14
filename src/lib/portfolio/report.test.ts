import { describe, expect, it } from 'vitest'
import type { PortfolioState } from '../../types/portfolio'
import { buildPortfolioReportHtml } from './report'
import { createProject } from './state'

function sampleState(): PortfolioState {
  return {
    name: 'Capital Program',
    projects: [
      createProject({
        id: 'a',
        name: 'Highway <Upgrade>',
        bac: 120,
        planStart: '2026-01-01',
        planFinish: '2027-06-30',
        curve: 'S-Curve',
      }),
      createProject({
        id: 'b',
        name: 'IT Modernization',
        bac: 60,
        planStart: '2026-04-01',
        planFinish: '2027-03-31',
        curve: 'Linear',
      }),
    ],
    funding: { granularity: 'Quarterly', amounts: { '2026-Q1': 10, '2026-Q2': 10 } },
    statusHistory: [
      {
        dataDate: '2026-07-01',
        entries: { a: { ac: 28, pctComplete: 22 }, b: { ac: 16, pctComplete: 25 } },
      },
    ],
  }
}

const meta = { projectName: 'Capital Program', organization: 'PMO' }

describe('buildPortfolioReportHtml', () => {
  it('includes summary, projects, funding analysis, and status sections', () => {
    const html = buildPortfolioReportHtml(sampleState(), meta, {})
    expect(html).toContain('Portfolio Report')
    expect(html).toContain('Capital Program')
    expect(html).toContain('IT Modernization')
    expect(html).toContain('S-Curve (α 2, β 2)')
    // severely underfunded sample → overload callout present
    expect(html).toContain('Funding overload detected')
    expect(html).toContain('Portfolio Status — Data Date 2026-07-01')
    expect(html).toContain('SPIe')
    expect(html).toContain('window.print()')
  })

  it('escapes HTML in user-provided names', () => {
    const html = buildPortfolioReportHtml(sampleState(), meta, {})
    expect(html).toContain('Highway &lt;Upgrade&gt;')
    expect(html).not.toContain('Highway <Upgrade>')
  })

  it('embeds provided chart images and omits missing ones', () => {
    const withImages = buildPortfolioReportHtml(sampleState(), meta, {
      gantt: 'data:image/png;base64,GANTT',
      cashflow: 'data:image/png;base64,CASH',
    })
    expect(withImages).toContain('data:image/png;base64,GANTT')
    expect(withImages).toContain('data:image/png;base64,CASH')
    const withoutImages = buildPortfolioReportHtml(sampleState(), meta, {})
    expect(withoutImages).not.toContain('data:image/png')
  })

  it('shows an empty-status note before any data date exists', () => {
    const state = { ...sampleState(), statusHistory: [] }
    const html = buildPortfolioReportHtml(state, meta, {})
    expect(html).toContain('No status updates yet')
    expect(html).not.toContain('Portfolio Status — Data Date')
  })
})
