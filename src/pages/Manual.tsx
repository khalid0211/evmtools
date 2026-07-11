import type { ReactNode } from 'react'

function Section({ id, kicker, title, dek, children }: { id: string; kicker: string; title: string; dek: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-6">
      <div>
        <div className="page-kicker !text-left">{kicker}</div>
        <h2 className="mt-1 text-2xl font-bold text-ink-900">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">{dek}</p>
      </div>
      {children}
    </section>
  )
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="section-header !mb-3 !border-ink-100">{children}</h3>
}

function SubSub({ children }: { children: ReactNode }) {
  return <div className="subsection-title !mt-6">{children}</div>
}

function OptionsTable({ rows, termWidth = 'w-52' }: { rows: { term: ReactNode; desc: ReactNode }[]; termWidth?: string }) {
  return (
    <div className="card-muted overflow-x-auto !p-0">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ink-100 last:border-0">
              <td className={`${termWidth} shrink-0 whitespace-nowrap px-4 py-3 align-top font-semibold text-ink-700`}>{row.term}</td>
              <td className="px-4 py-3 align-top text-ink-500">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Formula({ name, expr, note }: { name: string; expr: ReactNode; note: ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-100 border-l-4 border-l-brand-500 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-500">{name}</div>
      <div className="mt-1 font-mono text-[15px] text-brand-700">{expr}</div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  )
}

function FormulaGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function Aside({ tone, title, children }: { tone: 'info' | 'caution' | 'worked'; title: string; children: ReactNode }) {
  const toneClasses = {
    info: 'bg-brand-50 border-transparent',
    caution: 'bg-warn/15 border-transparent',
    worked: 'bg-white border-ink-100 shadow-sm',
  }[tone]
  const titleClasses = {
    info: 'text-brand-700',
    caution: 'text-[#9c6b14]',
    worked: 'text-ink-500',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 text-sm ${toneClasses}`}>
      <div className={`mb-2 text-xs font-bold uppercase tracking-wide ${titleClasses}`}>{title}</div>
      <div className="space-y-2 text-ink-700">{children}</div>
    </div>
  )
}

function Chip({ tone, children }: { tone: 'good' | 'warn' | 'danger' | 'neutral'; children: ReactNode }) {
  const toneClasses = {
    good: 'bg-good/10 text-good',
    warn: 'bg-warn/20 text-ink-700',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-ink-100 text-ink-500',
  }[tone]
  return <span className={`status-badge ${toneClasses}`}>{children}</span>
}

export default function Manual() {
  return (
    <div className="space-y-12 pb-12">
      <div className="text-center">
        <div className="page-kicker">User Manual</div>
        <h1 className="page-header mt-1">Project Management Tools</h1>
        <p className="page-subtitle mt-2">
          Three independent, browser-based tools for tracking earned value, stress-testing cash
          flow, and planning a work breakdown structure with three-point estimates and Monte
          Carlo simulation. Nothing is uploaded — every calculation runs on your device and
          updates the instant you change an input.
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Jump to</span>
        <a href="#evm" className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-700 hover:bg-brand-50">EVM Calculator</a>
        <a href="#cashflow" className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-700 hover:bg-brand-50">Cash Flow Simulator</a>
        <a href="#wbs" className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-700 hover:bg-brand-50">WBS Maker</a>
      </div>

      <p className="mx-auto max-w-2xl text-center text-xs text-ink-400">
        A note on units: every currency field is unit-agnostic — enter thousands, millions, or
        whatever consistent unit your project uses, and read every result in that same unit.
        Dates use 30.44 days per month for EVM duration conversions (the average calendar
        month), noted below wherever it matters.
      </p>

      {/* ================= EVM CALCULATOR ================= */}
      <Section
        id="evm"
        kicker="Tool"
        title="🎯 EVM Calculator"
        dek="Earned Value Management applied to a single status snapshot. You describe the budget, the timeline, and how much work is actually done; the calculator returns variance, performance indices, and a forecast to completion."
      >
        <Sub>Key inputs</Sub>
        <OptionsTable
          rows={[
            { term: 'Budget at Completion (BAC)', desc: 'The total approved project budget. Every percentage and forecast is measured against this number.' },
            { term: 'Actual Cost (AC)', desc: 'What has actually been spent on the work completed so far.' },
            { term: 'Enter Duration', desc: 'Type Original Duration (planned, months) and Used Duration (elapsed, months) directly.' },
            { term: 'Enter Dates', desc: 'Give Plan Start, Plan Finish, and Status Date instead — durations are derived at 30.44 days per month.' },
          ]}
        />

        <Sub>Planned Value method</Sub>
        <p className="text-sm text-ink-500">Planned Value (PV) is what the schedule says <em>should</em> have been spent by now. Three methods:</p>
        <OptionsTable
          rows={[
            { term: 'Linear', desc: <><code className="mono">PV = BAC × (elapsed ÷ original duration)</code> — budget accrues at a constant rate.</> },
            { term: 'S-Curve', desc: <>PV follows a slow–fast–slow curve shaped by <code className="mono">Alpha (α)</code> and <code className="mono">Beta (β)</code> — the default 2/2 gives the classic symmetric S, <code className="mono">3t² − 2t³</code>. Closer to how real projects actually spend.</> },
            { term: 'Enter Value', desc: 'Type PV directly. Trade-off: Earned Schedule, SPIe, and the curve chart all go away, since there’s no curve shape to evaluate them against.' },
          ]}
        />

        <Sub>Earned Value method</Sub>
        <p className="text-sm text-ink-500">Earned Value (EV) is the budgeted value of the work actually completed — the number every performance index is built from.</p>
        <OptionsTable
          rows={[
            { term: '% Complete', desc: <><code className="mono">EV = BAC × % Complete</code> — the most direct method, if you trust the percentage.</> },
            { term: 'Enter Value', desc: 'Type EV directly, if it’s already been computed elsewhere.' },
            { term: 'Estimate', desc: 'Derives EV from spend alone: takes Actual Cost, treats it as an annuity spread evenly across the elapsed duration, and discounts it back to a present value at the monthly-equivalent of your annual Inflation Rate. Useful when you have cost data but no reliable progress percentage.' },
          ]}
        />
        <Aside tone="info" title="Estimate method, in formula form">
          <div className="font-mono text-[13px]">monthly rate = (1 + annual inflation)^(1/12) − 1</div>
          <div className="font-mono text-[13px]">EV ≈ (AC ÷ elapsed months) × [1 − (1 + monthly rate)^(−elapsed months)] ÷ monthly rate</div>
          <p className="!mt-3">This is the present value of an annuity — the same math a loan payment schedule uses, run in reverse. A higher inflation rate discounts recent-looking spend more aggressively.</p>
        </Aside>

        <Sub>Reading the results</Sub>
        <SubSub>Performance metrics</SubSub>
        <FormulaGrid>
          <Formula name="Cost Variance" expr="CV = EV − AC" note={<>Positive = under budget <Chip tone="good">favorable</Chip>. Negative = over budget <Chip tone="danger">unfavorable</Chip>.</>} />
          <Formula name="Schedule Variance" expr="SV = EV − PV" note={<>Positive = ahead of schedule <Chip tone="good">favorable</Chip>. Negative = behind <Chip tone="danger">unfavorable</Chip>.</>} />
          <Formula name="Cost Performance Index" expr="CPI = EV ÷ AC" note="Value above 1.0 means you're getting more than a dollar of work for every dollar spent." />
          <Formula name="Schedule Performance Index" expr="SPI = EV ÷ PV" note="Value above 1.0 means work is being earned faster than planned." />
        </FormulaGrid>

        <SubSub>Earned Schedule (time-based, not just $-based)</SubSub>
        <p className="text-sm text-ink-500">
          SPI is a cost ratio, so as a project nears completion it drifts back toward 1.0
          regardless of how late it actually finished — a well-known blind spot of $-based
          schedule performance. Earned Schedule fixes this by asking a different question: at
          what point on the planned-value curve would today's EV have been earned on time?
        </p>
        <FormulaGrid>
          <Formula name="Earned Schedule (ES)" expr="ES = time t where PV(t) = EV" note="Solved directly for Linear PV; found by binary search over the S-Curve for S-Curve PV. Unavailable when PV is manually entered." />
          <Formula name="SPI(t)" expr="SPIe = ES ÷ Actual Duration" note="Stays meaningful all the way to project close, unlike $-based SPI." />
        </FormulaGrid>

        <SubSub>Forecasting</SubSub>
        <FormulaGrid>
          <Formula name="Estimate to Complete" expr="ETC = (BAC − EV) ÷ CPI" note="Assumes the remaining work will be done at the same cost efficiency observed so far — the standard, and most conservative-by-default, ETC formula." />
          <Formula name="Estimate at Completion" expr="EAC = AC + ETC" note="Total projected cost if current performance holds for the rest of the project." />
          <Formula name="Variance at Completion" expr="VAC = BAC − EAC" note="Projected surplus (positive) or overrun (negative) at the end." />
          <Formula name="To-Complete Performance Index" expr="TCPI = (BAC − EV) ÷ (BAC − AC)" note="The cost efficiency required on every remaining dollar to still land exactly on BAC. Above 1.0 means the rest of the project has to run leaner than it has so far — the higher above 1.0, the less realistic that recovery becomes." />
        </FormulaGrid>
        <Aside tone="caution" title="One EAC formula, on purpose">
          <p>PMBOK lists several EAC variants (one that assumes the original budget still holds, one that blends cost and schedule performance, and this one). The calculator always uses the CPI-based formula above — the standard choice when there's no reason to believe the drivers of current performance are about to change. If CPI is undefined (AC is zero) the forecast fields show as unavailable rather than a misleading number.</p>
        </Aside>

        <SubSub>Project health</SubSub>
        <p className="text-sm text-ink-500">The status summary classifies overall health from CPI and SPI <em>individually</em> — not a blended average, so one strong index can't paper over a genuinely weak one:</p>
        <OptionsTable
          rows={[
            { term: <Chip tone="good">Excellent</Chip>, desc: 'Both CPI and SPI are at or above 1.0.' },
            { term: <Chip tone="warn">At Risk</Chip>, desc: 'Everything in between — one index is strong while the other lags, or both sit in the 0.9–1.0 band.' },
            { term: <Chip tone="danger">Critical</Chip>, desc: 'Both CPI and SPI are below 0.9.' },
          ]}
          termWidth="w-40"
        />

        <SubSub>Chart and report</SubSub>
        <p className="text-sm text-ink-500">The EVM Curve Analysis chart plots PV, EV, and AC across the project timeline with markers at the status date — available whenever PV isn't manually entered. <strong>Print Report</strong> generates an A4-ready summary of every input, metric, and the chart (use your browser's print dialog to save it as a PDF).</p>
      </Section>

      {/* ================= CASH FLOW SIMULATOR ================= */}
      <Section
        id="cashflow"
        kicker="Tool"
        title="💸 Cash Flow Simulator"
        dek="Spreads a budget over the project timeline under a chosen spend profile, then answers a planning question: what does a late start, a schedule slip, or inflation actually do to the money?"
      >
        <Sub>Key inputs</Sub>
        <OptionsTable
          rows={[
            { term: 'Budget', desc: 'Total project budget to distribute across the timeline.' },
            { term: 'Duration', desc: 'Planned project duration, in months.' },
            { term: 'Start Delay', desc: 'Months before the project actually begins. Shifts the entire cash flow later in calendar time — every dollar spent picks up extra inflation before work even starts.' },
            { term: 'Project Delay', desc: 'Extra months added to the duration itself — the same budget gets stretched across a longer schedule.' },
            { term: 'Inflation', desc: 'Annual rate, applied month by month to the simulated cash flow (never to the baseline).' },
          ]}
        />

        <Sub>Spend patterns</Sub>
        <p className="text-sm text-ink-500">Each pattern is a shape, not a total — whichever one you pick, the monthly weights are always rescaled so the full-duration sum equals the Budget exactly.</p>
        <OptionsTable
          termWidth="w-32"
          rows={[
            { term: 'Linear', desc: 'Flat — the same amount every month.' },
            { term: 'Highway', desc: <>Road-construction profile: <code className="mono">Design (0–12.5%)</code> → <code className="mono">Mobilization (12.5–33.3%)</code> → <code className="mono">Construction peak (33.3–75%)</code> → <code className="mono">Closeout (75–100%)</code>.</> },
            { term: 'Building', desc: <>Vertical-construction profile: <code className="mono">Design (0–16.7%)</code> → <code className="mono">Foundation / Structure (16.7–55.6%)</code> → <code className="mono">MEP / Finishing (55.6–83.3%)</code> → <code className="mono">Tail-off (83.3–100%)</code>.</> },
            { term: 'S-Curve', desc: 'Symmetric ramp-up → peak activity at mid-project → wind-down, shaped by a Beta(2,2) distribution.' },
          ]}
        />
        <p className="text-xs text-ink-400">The Project Timeline bar (shown for Highway, Building, and S-Curve) draws these phases to scale above the chart, so you can see exactly where each month sits in the profile.</p>

        <Sub>How the simulation works</Sub>
        <FormulaGrid>
          <Formula name="Baseline" expr="pattern(Budget, Duration)" note="No delay, no inflation — the reference case." />
          <Formula
            name="Simulated"
            expr="pattern(Budget, Duration + Project Delay), shifted by Start Delay, inflated"
            note={<>Same budget, redrawn over the longer schedule, then every month multiplied by <code className="mono">(1 + monthly rate)^(months since t=0)</code> — where "months since t=0" already includes the Start Delay.</>}
          />
        </FormulaGrid>
        <Aside tone="info" title="Why Start Delay and Project Delay feel different">
          <p>Both make the simulated total climb, but for different reasons. <strong>Start Delay</strong> is a pure time-shift: every dollar in the plan is pushed later, so every dollar picks up the same extra inflation before spending even begins. <strong>Project Delay</strong> instead stretches the spend curve itself across more months — the budget doesn't move later on average as uniformly, but more of it now lands in later, more-inflated months, especially under a back-loaded pattern like Highway or Building.</p>
        </Aside>
        <Formula name="Budget Variance" expr="(Simulated Budget ÷ Baseline Budget − 1) × 100%" note="The single number in the Financial Impact panel — how much more (or, with zero delay/inflation, the same) the simulated scenario costs versus the clean baseline." />

        <Sub>Other options</Sub>
        <OptionsTable
          rows={[
            { term: 'View', desc: 'Chart time scale only — Monthly, Quarterly, or Yearly buckets. Doesn’t change the underlying calculation, just how it’s grouped for reading.' },
            { term: 'Set Baseline', desc: 'Snapshots the current scenario as the fixed reference point for comparison.' },
            { term: 'Compare to Baseline', desc: 'Adds the current scenario (after you’ve changed inputs) to a running comparison table alongside its budget delta from the baseline.' },
            { term: 'CSV exports', desc: <><strong>Export Comparisons</strong> downloads the full scenario table; <strong>Export Current Cashflow</strong> downloads the period-by-period baseline and simulated series.</> },
          ]}
        />
      </Section>

      {/* ================= WBS MAKER ================= */}
      <Section
        id="wbs"
        kicker="Tool"
        title="🗂️ WBS Maker"
        dek="Decomposes a project into a Work Breakdown Structure up to four levels deep, rolls up budgets and dates automatically, and — when you're ready to reason about uncertainty — runs a Monte Carlo simulation over three-point cost and duration ranges."
      >
        <Sub>Basic functioning</Sub>
        <OptionsTable
          rows={[
            { term: 'Structure', desc: <>Up to four levels: <code className="mono">1</code>, <code className="mono">1.n</code>, <code className="mono">1.n.n</code>, <code className="mono">1.n.n.n</code>. Codes renumber automatically whenever you add, delete, or reorder items.</> },
            { term: 'Work packages vs. summary elements', desc: <>An item with no children is a <strong>work package</strong> — you enter its budget, dates, and risk directly. An item <em>with</em> children is a <strong>summary element</strong> — its budget and dates always roll up from below; you never enter them by hand.</> },
            { term: 'Chart / Outline views', desc: 'Chart is the classic WBS box diagram; Outline is an indented table with reorder arrows — same data, two ways to work with it.' },
            { term: 'Draft / Save / Revert', desc: <>Edits to a work package are a draft until you press <strong>Save</strong> — totals and charts only update then. <strong>Revert</strong> restores the last saved values; navigating away with unsaved changes asks for confirmation.</> },
            { term: 'Autosave', desc: 'The whole WBS persists in this browser automatically — no explicit save step for the structure itself, only for individual work-package edits.' },
          ]}
        />

        <SubSub>Work package fields</SubSub>
        <OptionsTable
          rows={[
            { term: 'Budget (Most Likely)', desc: 'The work package’s single-point cost estimate.' },
            { term: 'Start / End Date', desc: 'Drives roll-up dates, the Gantt chart, cash flow timing, and Monte Carlo duration.' },
            { term: 'Risk Likelihood / Impact', desc: 'Low / Medium / High — places the item in the risk matrix.' },
            { term: 'Cash Flow Curve', desc: 'How this work package’s own budget spreads across its own dates: Linear (even) or S-Curve (Alpha/Beta, default 2/2).' },
          ]}
        />

        <SubSub>Roll-up mechanics</SubSub>
        <p className="text-sm text-ink-500">A summary element's budget is the sum of its children's active cost (Budget, or PERT — see below — depending on the roll-up toggle); its start date is the earliest child start, and its end date is the latest child end. This cascades all the way to the project root.</p>

        <SubSub>Risk Matrix</SubSub>
        <p className="text-sm text-ink-500">A 3×3 grid of Likelihood × Impact. Each work package lands in exactly one cell, and the cell sums the active cost of everything in it — so the matrix shows where the <em>money</em> at risk sits, not just the count of risky items.</p>
        <Formula
          name="Cell score & zoning"
          expr="score = likelihood(1–3) × impact(1–3)"
          note={<>
            <Chip tone="good">score ≤ 2</Chip>{' '}
            <Chip tone="warn">3–4</Chip>{' '}
            <Chip tone="danger">≥ 6</Chip>
          </>}
        />

        <Sub>Three-Point Estimates</Sub>
        <p className="text-sm text-ink-500">
          Turn on <strong>Advanced (3-point)</strong> and every work package gains Optimistic and
          Pessimistic values alongside its normal Most-Likely cost and duration — the range a
          PERT estimate and a Monte Carlo simulation both need. Left untouched, Optimistic and
          Pessimistic default <em>to</em> the most-likely value, i.e. zero spread, until you
          widen them.
        </p>
        <OptionsTable
          rows={[
            { term: 'Cost O / ML / P', desc: 'Optimistic and Pessimistic cost, either side of Budget (Most Likely).' },
            { term: 'Duration O / P (days)', desc: 'Optimistic and Pessimistic duration; Most Likely duration is always derived from Start/End Date, not entered directly.' },
          ]}
        />
        <Formula
          name="PERT mean"
          expr="PERT = (Optimistic + 4 × Most Likely + Pessimistic) ÷ 6"
          note='A weighted average that leans heavily on the most-likely case while still respecting the tails. Turning on "PERT roll-up" makes every summary total (and the Gantt/cash-flow basis) use this figure per work package instead of the plain Most-Likely budget.'
        />

        <Sub>Monte Carlo Analysis</Sub>
        <p className="text-sm text-ink-500">
          Where the PERT mean gives you one number, Monte Carlo gives you the whole distribution
          of plausible outcomes — by re-running the entire WBS thousands of times, each time
          drawing a random cost and duration for every work package from its own O/ML/P range.
        </p>

        <SubSub>What's actually being modeled</SubSub>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-500">
          <li><strong className="text-ink-700">Distribution shape:</strong> each sample is drawn from a Beta-PERT distribution shaped by that work package's own Optimistic/Most-Likely/Pessimistic triple — not a plain normal or triangular distribution. The distribution's mean matches the PERT formula above exactly, and it's more heavily weighted around the most-likely value than a plain triangle would be.</li>
          <li><strong className="text-ink-700">Cost, iteration by iteration:</strong> total simulated cost = the sum of one independent random draw per work package, added up across the whole WBS.</li>
          <li><strong className="text-ink-700">Duration, iteration by iteration:</strong> every work package with valid dates gets its own independent random duration, applied from its own fixed start date. The simulated project duration is the latest simulated finish minus the earliest start across all of them — effectively a simplified critical path.</li>
          <li><strong className="text-ink-700">Seed:</strong> a fixed starting number for the random generator. The same seed always reproduces the exact same run, which makes results reproducible and comparable; <strong>Re-roll</strong> picks a fresh one.</li>
        </ul>

        <Aside tone="caution" title="Two assumptions worth knowing before you trust the numbers">
          <p><strong>No correlation between work packages.</strong> Every cost (and every duration) is sampled independently. If your real risk is that one shared cause — a supplier, a currency swing, a permitting delay — could push several work packages over budget at the same time, this model won't capture that; it will understate how bad the bad scenarios can get.</p>
          <p><strong>No schedule logic.</strong> There's no dependency graph. Every work package is assumed able to start on its own entered Start Date regardless of what else is happening — if package B is only supposed to start after package A finishes, that relationship has to already be baked into the dates you typed in; the simulation won't infer it. Work packages missing a valid Start/End Date are excluded from the duration model entirely (flagged in the results) though they still count toward cost.</p>
        </Aside>

        <SubSub>Reading the outputs</SubSub>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-500">
          <li><strong className="text-ink-700">Mean / Std Dev cards:</strong> the average simulated cost and duration, and how spread out the outcomes are around it. A Std Dev that's large relative to the mean is a signal the underlying O/P ranges are wide — i.e., genuinely uncertain — and may be worth tightening if better information exists.</li>
          <li><strong className="text-ink-700">Histograms:</strong> the shape of the outcome distribution, not just its center — worth a glance for skew (a long tail toward high cost or long duration is itself useful information the single PERT number can't show).</li>
          <li><strong className="text-ink-700">P50 / P80 / P90:</strong> the cost or duration that this percentage of simulated outcomes landed at or below. P50 is the median — a coin-flip number, as likely to be exceeded as not. P80 and P90 are the levels most organizations actually plan or set contingency reserves against, since they represent a comfortably-likely ceiling rather than a 50/50 guess.</li>
        </ul>

        <Aside tone="worked" title='Reading the "PERT estimate" row'>
          <p>
            The probability table restates P50/P80/P90 and adds one more row: where your
            deterministic PERT total actually falls inside the simulated distribution. Say the
            PERT cost estimate lands at a cumulative probability of <strong>35%</strong> — that
            means only 35% of simulated iterations came in at or under that number, and{' '}
            <strong>65%</strong> came in higher. In plain terms: the tidy PERT number is on the
            optimistic side of what the ranges you entered actually imply, and a P50 or P80
            figure is the more honest number to plan against.
          </p>
        </Aside>

        <p className="text-sm text-ink-500">
          <strong className="text-ink-700">Cost-vs-Duration scatter:</strong> one dot per simulated
          iteration, with an ellipse drawn around roughly the middle 80% of outcomes. Because cost
          and duration are sampled independently per work package in this model, any diagonal lean
          you see in the cloud isn't a modeled statistical correlation — it emerges only when the
          same handful of work packages happen to dominate both the cost total and the duration
          total.
        </p>

        <Sub>Cash flow, export, and reporting</Sub>
        <OptionsTable
          rows={[
            { term: 'Cash Flow basis', desc: 'Draw the spend histogram and cumulative curve at Budget, PERT, or — once a simulation has been run — P50 / P80 / P90 totals, in Monthly or Weekly buckets.' },
            { term: 'Gantt Chart', desc: 'Every dated work package as a timeline bar, colored by its risk category.' },
            { term: 'Export JSON / Import JSON', desc: 'Full-fidelity save and restore of the entire WBS to a file.' },
            { term: 'Export CSV', desc: 'Downloads the outline as a flat table.' },
            { term: 'Export Mermaid', desc: 'Produces a flowchart definition you can paste into draw.io (Insert → Advanced → Mermaid) or any Mermaid-compatible tool.' },
            { term: 'Reset', desc: 'Clears everything back to the sample project, with a confirmation step first.' },
            { term: 'Print Report', desc: 'An A4-ready report covering the outline, Gantt, cash flow, risk matrix, and the current Monte Carlo results.' },
          ]}
        />
      </Section>
    </div>
  )
}
