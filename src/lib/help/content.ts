export interface HelpItem {
  term: string
  desc: string
}

export interface HelpSection {
  heading: string
  intro?: string
  items?: HelpItem[]
}

export interface HelpContent {
  title: string
  intro: string
  sections: HelpSection[]
}

export const evmHelp: HelpContent = {
  title: 'EVM Calculator — Help',
  intro:
    'The EVM Calculator applies Earned Value Management to a project status snapshot: you describe the budget, timeline, and how much work has been done, and it computes variance, performance indices, and completion forecasts. Everything runs in your browser and updates instantly as you change inputs.',
  sections: [
    {
      heading: 'Key Inputs',
      items: [
        {
          term: 'Budget at Completion (BAC)',
          desc: 'The total approved project budget. All percentages and forecasts are measured against it.',
        },
        {
          term: 'Actual Cost (AC)',
          desc: 'The cost actually incurred for the work completed so far.',
        },
        {
          term: 'Duration — Enter Duration',
          desc: 'Type the Original Duration (planned months) and Used Duration (months elapsed) directly.',
        },
        {
          term: 'Duration — Enter Dates',
          desc: 'Give Plan Start, Plan Finish, and the Status Date instead; durations are derived using 30.44 days per month.',
        },
      ],
    },
    {
      heading: 'Important Options',
      items: [
        {
          term: 'PV Method: Linear',
          desc: 'Planned Value grows evenly: PV = BAC × elapsed time fraction.',
        },
        {
          term: 'PV Method: S-Curve',
          desc: 'PV follows a slow–fast–slow curve shaped by Alpha (α) and Beta (β), defaults 2/2. Typical for real projects.',
        },
        {
          term: 'PV Method: Enter Value',
          desc: 'Type PV directly. Note: Earned Schedule, SPIe, and the curve chart are unavailable in this mode.',
        },
        {
          term: 'EV Method: % Complete',
          desc: 'EV = BAC × the percentage of the project completed.',
        },
        {
          term: 'EV Method: Enter Value',
          desc: 'Type Earned Value (budgeted cost of work performed) directly.',
        },
        {
          term: 'EV Method: Estimate',
          desc: 'EV is estimated as the present value of the Actual Cost cash flow discounted at the annual Inflation Rate — useful when only spend data is available.',
        },
      ],
    },
    {
      heading: 'Outputs',
      items: [
        {
          term: 'Project Status Summary',
          desc: 'At-a-glance Cost (under/over budget), Schedule (ahead/behind), Health (Excellent / At Risk / Critical), and Progress (EV ÷ BAC).',
        },
        {
          term: 'Calculated Values',
          desc: 'Time Elapsed, Budget Utilized, Completion Efficiency, and the PV and EV your chosen methods produced.',
        },
        {
          term: 'Performance Metrics',
          desc: 'Cost Variance (EV − AC), Schedule Variance (EV − PV), CPI (EV ÷ AC), SPI (EV ÷ PV), plus Earned Schedule (ES) and SPIe when a PV curve is available. Values above 1.0 (or positive variances) are favorable.',
        },
        {
          term: 'Project Forecasting',
          desc: 'Estimate at Completion (EAC), Estimate to Complete (ETC), Variance at Completion (VAC), and the To-Complete Performance Index (TCPI) — the efficiency needed to finish within BAC.',
        },
        {
          term: 'EVM Curve Analysis chart',
          desc: 'PV, EV, and AC curves over the project timeline with markers at the status date.',
        },
        {
          term: 'Print Report',
          desc: 'Generates a printable A4 report of all inputs, metrics, and the chart (use the browser print dialog to save as PDF).',
        },
      ],
    },
  ],
}

export const cashFlowHelp: HelpContent = {
  title: 'Cash Flow Simulator — Help',
  intro:
    'The Cash Flow Simulator models how a project budget is spent over time under different distribution patterns, then shows what start delays, duration extensions, and inflation do to the total. Set a baseline, tweak the risk factors, and compare scenarios side by side.',
  sections: [
    {
      heading: 'Key Inputs',
      items: [
        { term: 'Budget (Millions)', desc: 'Total project budget to distribute over the timeline.' },
        { term: 'Duration (Mo)', desc: 'Planned project duration in months.' },
        {
          term: 'Start Delay',
          desc: 'Months before the project actually starts — shifts the whole cash flow right, exposing it to more inflation.',
        },
        {
          term: 'Project Delay',
          desc: 'Additional months added to the duration — stretches the same budget over a longer period.',
        },
        { term: 'Inflation (%)', desc: 'Annual inflation applied month by month to the simulated cash flow.' },
      ],
    },
    {
      heading: 'Important Options',
      items: [
        { term: 'Pattern: Linear', desc: 'Even spend every month (flat bars).' },
        {
          term: 'Pattern: Highway',
          desc: 'Road-construction profile: slow design phase, ramp-up at mobilization, peak during construction, taper at closeout.',
        },
        {
          term: 'Pattern: Building',
          desc: 'Vertical-construction profile: design, heavy spend through foundation and structure, sustained MEP/finishing, tail-off.',
        },
        {
          term: 'Pattern: S-Curve',
          desc: 'Symmetric slow–fast–slow curve (Beta 2,2) — ramp-up, peak activity mid-project, wind-down.',
        },
        { term: 'View', desc: 'Chart time scale: Monthly, Quarterly, or Yearly buckets.' },
        {
          term: 'Set Baseline / Compare to Baseline',
          desc: 'Set Baseline snapshots the current scenario as the reference. Change inputs, then Compare to Baseline adds the new scenario to the comparison table with its budget delta.',
        },
      ],
    },
    {
      heading: 'Outputs',
      items: [
        {
          term: 'Cash flow chart',
          desc: 'Baseline vs simulated bars per period, with both cumulative curves on the right axis.',
        },
        {
          term: 'Project Timeline bar',
          desc: 'For Highway, Building, and S-Curve patterns: the project phases drawn to scale.',
        },
        {
          term: 'Financial Impact Analysis',
          desc: 'Original budget, simulated budget (after delays and inflation), and the variance percentage.',
        },
        {
          term: 'Baseline & Comparison table',
          desc: 'Every compared scenario with its parameters, simulated budget, and delta from baseline, plus max/average impact summaries.',
        },
        {
          term: 'CSV exports',
          desc: 'Export Comparisons downloads the scenario table; Export Current Cashflow downloads the period-by-period series.',
        },
        {
          term: 'Print Report',
          desc: 'Generates a printable A4 report of the scenario inputs, financial impact, chart, and baseline comparison table (use the browser print dialog to save as PDF).',
        },
      ],
    },
  ],
}

export const wbsHelp: HelpContent = {
  title: 'WBS Maker — Help',
  intro:
    'The WBS Maker decomposes a project into a Work Breakdown Structure of up to four levels (1, 1.n, 1.n.n, 1.n.n.n). Items without children are work packages — you give them budgets, dates, and risk ratings, and everything rolls up automatically to the project level. Your WBS is saved in this browser and can be exported as a file.',
  sections: [
    {
      heading: 'Building the Structure',
      items: [
        {
          term: 'Add Child / Delete',
          desc: 'Select any box (or outline row) and use + Add Child to decompose it, up to four levels. Codes (1.2.3) renumber automatically when you add, delete, or reorder items.',
        },
        {
          term: 'Work packages vs summary elements',
          desc: 'Items without children are work packages (dictionary items) — you enter their data. Items with children are summary elements — their budget and dates roll up from below.',
        },
        {
          term: 'Chart / Outline views',
          desc: 'Chart shows the classic WBS box diagram; Outline shows an indented table with reorder arrows.',
        },
      ],
    },
    {
      heading: 'Work Package Form (Key Inputs)',
      intro:
        'Edits are a draft until you press Save — totals and charts only update then. Revert restores the last saved values, and moving away with unsaved changes asks for confirmation.',
      items: [
        { term: 'Budget (Most Likely)', desc: 'The work package cost estimate.' },
        {
          term: 'Start / End Date',
          desc: 'The work package schedule — drives roll-up dates, the Gantt chart, cash flow, and Monte Carlo duration.',
        },
        {
          term: 'Risk Likelihood / Impact',
          desc: 'Low / Medium / High ratings that place the item in the risk matrix.',
        },
        {
          term: 'Cash Flow Curve',
          desc: 'How the budget spreads across the dates: Linear (even) or S-Curve with Alpha/Beta shape parameters (defaults 2/2).',
        },
        {
          term: 'Three-Point Estimates (Advanced)',
          desc: 'With Advanced (3-point) on: optimistic and pessimistic cost and duration per work package (they default to the most-likely values until you change them).',
        },
      ],
    },
    {
      heading: 'Important Options',
      items: [
        {
          term: 'PERT roll-up',
          desc: 'Rolls up PERT estimates — (Optimistic + 4 × Most Likely + Pessimistic) ÷ 6 — instead of plain budgets.',
        },
        {
          term: 'Monte Carlo Analysis',
          desc: 'Samples every work package cost and duration from beta-PERT distributions (choose iterations and seed; the same seed reproduces the same run). Results go stale when you change inputs — re-run to refresh.',
        },
        {
          term: 'Cash Flow basis and buckets',
          desc: 'Draw the cash flow at Budget, PERT, or (after a simulation) P50 / P80 / P90 totals, in Monthly or Weekly buckets.',
        },
        {
          term: 'Export / Import',
          desc: 'Export JSON saves the whole WBS to a file (Import JSON restores it); Export CSV downloads the outline; Export Mermaid produces a flowchart you can paste into draw.io (Insert → Advanced → Mermaid).',
        },
        {
          term: 'Reset',
          desc: 'Clears everything back to the sample project (with confirmation). The WBS otherwise autosaves in this browser.',
        },
      ],
    },
    {
      heading: 'Outputs',
      items: [
        {
          term: 'Summary cards',
          desc: 'Total budget (or PERT total), project start/finish, and work package count — always current with saved data.',
        },
        {
          term: 'Gantt Chart',
          desc: 'Every dated work package as a timeline bar, colored by its risk category.',
        },
        {
          term: 'Cash Flow',
          desc: 'Per-period spend histogram plus the cumulative S-curve at your chosen basis.',
        },
        {
          term: 'Risk Matrix',
          desc: '3×3 likelihood × impact grid; each cell sums the cost of the work packages in that category.',
        },
        {
          term: 'Monte Carlo results',
          desc: 'Cost and duration histograms with P50/P80/P90 lines, a probability-of-completion table (including where the PERT estimate falls), and a cost-vs-duration scatter with an ≈80% outcome ellipse.',
        },
        {
          term: 'Print Report',
          desc: 'A printable A4 report of the outline, Gantt, cash flow, risk matrix, and current Monte Carlo results.',
        },
      ],
    },
  ],
}

export const portfolioHelp: HelpContent = {
  title: 'Portfolio Planner — Help',
  intro:
    'The Portfolio Planner manages a collection of projects on a shared timeline. Each project has a budget (BAC), plan dates, and a cash flow curve; the tool aggregates them into a portfolio cash flow, compares it with a time-phased funding schedule to find overloaded periods, and — once you set data dates — tracks earned-value performance for each project and the portfolio as a whole. Your portfolio autosaves in this browser and can be saved to / loaded from a JSON file.',
  sections: [
    {
      heading: 'Projects & Gantt',
      items: [
        {
          term: 'Project entry form + table',
          desc: 'One form adds or edits projects: name, BAC (Budget at Completion), Plan Start, Plan Finish, and a cash flow curve — Linear (even spend) or S-Curve shaped by Alpha (α) and Beta (β), defaults 2/2. Projects are listed in a scrollable table; click a row (or Edit) to load it into the form, then Update to apply.',
        },
        {
          term: 'Portfolio Gantt',
          desc: 'Every valid project as a timeline bar. The dashed red line marks the latest data date once you start progressing.',
        },
        {
          term: 'Collapsible sections',
          desc: 'Every section header is clickable — collapse the sections you are not using to focus; your choices are remembered in this browser.',
        },
      ],
    },
    {
      heading: 'Cash Flow & Funding',
      items: [
        {
          term: 'Period granularity',
          desc: 'View the portfolio Monthly, Quarterly, or Yearly. Switching converts your funding amounts: coarser periods sum exactly; finer periods split each amount evenly.',
        },
        {
          term: 'Cash flow vs funding chart',
          desc: 'Stacked per-project spend bars per period, with the cumulative cash requirement and the cumulative funding step curve overlaid on the right axis. Red bands mark overloaded periods.',
        },
        {
          term: 'Net Funding Headroom chart',
          desc: 'Cumulative funding minus cumulative requirement per period; red bars below zero are the overloads.',
        },
        {
          term: 'Funding Schedule table',
          desc: 'Enter the maximum funding available in each period. Funding is keyed to calendar periods, so moving projects never re-maps your funding entries.',
        },
        {
          term: 'Move Projects (what-if)',
          desc: 'Shift a project’s Plan Start (the finish moves with it, keeping the duration) or stretch its duration in months, and watch the overload respond on the charts above.',
        },
        {
          term: 'Overload detection',
          desc: 'A period is overloaded when the cumulative cash requirement exceeds cumulative funding (negative headroom). Overloaded periods are shaded red on the charts and highlighted in the table — fix them by moving projects, stretching durations, or adding funding.',
        },
      ],
    },
    {
      heading: 'Progress (Earned Value)',
      items: [
        {
          term: 'Data dates (status updates)',
          desc: 'Add a data date for each reporting period. New updates start from the previous update’s values; you can edit or delete past updates, and the history builds the EV/AC trend chart.',
        },
        {
          term: 'Planned Value (PV)',
          desc: 'Computed automatically for each project from its curve at the data date; the portfolio PV is the sum.',
        },
        {
          term: 'Actual Cost & % Complete',
          desc: 'You enter these per project. EV = % Complete × BAC.',
        },
        {
          term: 'SPI / SPIe / CPI',
          desc: 'Per project and for the portfolio: SPI = EV ÷ PV, CPI = EV ÷ AC, and SPIe = Earned Schedule ÷ Actual Time. Values below 1.0 mean behind schedule or over cost.',
        },
        {
          term: 'Forecasts',
          desc: 'ETC = (BAC − EV) ÷ CPI, EAC = AC + ETC, VAC = BAC − EAC, and the Expected Finish = planned duration ÷ SPIe — shown as months late or early.',
        },
      ],
    },
    {
      heading: 'Saving & Files',
      items: [
        {
          term: 'Autosave',
          desc: 'The portfolio is saved in this browser automatically as you work.',
        },
        {
          term: 'Export / Import JSON',
          desc: 'Export JSON saves the named portfolio to a file on your drive; Import JSON restores it (or opens one from another machine).',
        },
        {
          term: 'New Portfolio',
          desc: 'Starts an empty portfolio (with confirmation). Export first if you want to keep the current one.',
        },
        {
          term: 'Print Report',
          desc: 'Generates a printable A4 report of the portfolio: projects, Gantt, cash flow, funding analysis with overloads, and the latest earned-value status (use the browser print dialog to save as PDF).',
        },
      ],
    },
  ],
}
