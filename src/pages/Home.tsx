import { Link } from 'react-router-dom'

const tools = [
  {
    to: '/evm-calculator',
    icon: '🎯',
    title: 'EVM Calculator',
    desc: 'Earned Value Management calculations with PV curves, performance indices, and project forecasting.',
    bullets: ['Cost & schedule variance', 'CPI / SPI / SPIe', 'EAC, ETC, VAC, TCPI', 'Interactive curve analysis'],
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    to: '/cash-flow-simulator',
    icon: '💸',
    title: 'Cash Flow Simulator',
    desc: 'Model cash flow under different scenarios with delays, inflation, and multiple distribution patterns.',
    bullets: ['Linear / Highway / Building / S-Curve', 'Delay & inflation modeling', 'Baseline comparison', 'CSV export'],
    gradient: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
  },
  {
    to: '/wbs-maker',
    icon: '🗂️',
    title: 'WBS Maker',
    desc: 'Build a Work Breakdown Structure with budgets, dates, and risk ratings that roll up to the project.',
    bullets: ['Visual & outline WBS', 'Budget / date roll-up', 'Risk matrix', 'PERT & Monte Carlo'],
    gradient: 'linear-gradient(135deg, #f5576c 0%, #b83280 100%)',
  },
]

export default function Home() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-8 text-center shadow-card-lg"
        style={{
          background:
            'linear-gradient(135deg, rgba(52, 152, 219, 0.12) 0%, rgba(155, 89, 182, 0.12) 100%)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
      >
        <h1 className="text-3xl font-semibold text-ink-900">📊 Project Management Tools</h1>
        <h2 className="text-lg text-ink-500 mt-1">Productivity Suite for Project Managers</h2>
        <p className="mt-3 text-ink-400 italic max-w-2xl mx-auto">
          Smarter Projects and Portfolios with Earned Value Analysis and AI-Powered Executive Reporting
          <br />
          <strong className="text-ink-500">New Tools v1.0</strong> — Developed by Dr. Khalid Ahmad Khan
        </p>
      </div>

      <h2 className="text-xl font-semibold text-ink-700">Choose Your Tool</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((t) => (
          <div key={t.to} className="card flex flex-col">
            <h3 className="text-lg font-semibold text-ink-700 mb-1">
              {t.icon} {t.title}
            </h3>
            <p className="text-sm text-ink-400 mb-3">{t.desc}</p>
            <ul className="text-sm text-ink-500 list-disc pl-5 space-y-1 mb-4 flex-1">
              {t.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <Link
              to={t.to}
              className="text-white font-semibold text-center px-4 py-2 rounded-md no-underline transition hover:-translate-y-0.5"
              style={{ background: t.gradient }}
            >
              Open {t.title}
            </Link>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink-700 mb-2">ℹ️ How to Use These Tools</h3>
        <p className="text-sm text-ink-500">
          All three tools run entirely in your browser — no data upload required. In the
          EVM Calculator and Cash Flow Simulator, results update instantly as you adjust
          parameters; use the Cash Flow Simulator's <strong>Set Baseline</strong> and{' '}
          <strong>Compare</strong> buttons to build a scenario comparison, then export to CSV. The
          WBS Maker saves your work in this browser automatically and can export JSON, CSV, and
          Mermaid files or a printable report.
        </p>
      </div>
    </div>
  )
}
