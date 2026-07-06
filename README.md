# Project Management Tools — New Tools (Stage 1)

A public, no-login React + TypeScript single-page app providing two standalone tools:

1. **EVM Calculator** — Earned Value Management calculations (PV/EV/AC, CV, SV, CPI, SPI, SPIe, EAC, ETC, VAC, TCPI) with interactive PV curve analysis. Duration can be entered directly (months) or derived from Plan Start / Plan Finish / Status Date. Planned Value supports Linear, S-Curve (configurable α/β), or manual entry. Earned Value supports manual entry, % Complete, or an inflation-adjusted "Estimate" derived from the present value of the Actual Cost cash flow.
2. **Cash Flow Simulator** — Model cash flow under Linear, Highway, Building, and S-Curve patterns with start delay, project delay, and inflation; set baselines, compare scenarios, and export CSV.

This is Stage 1 of the Streamlit → React migration. There is **no backend, no login, and no database**. All calculations run in the browser.

## Tech stack

- React 18 + TypeScript
- Vite 5 (build tool)
- React Router 6
- Tailwind CSS 3
- Plotly.js (`plotly.js-dist-min`) for charts
- Vitest for unit tests

## Project layout

```
newtools/
├── src/
│   ├── pages/                # Home, EvmCalculator, CashFlowSimulator
│   ├── components/
│   │   ├── layout/           # AppShell, MetricCard, NumberField, SelectField
│   │   ├── evm/              # EvmInputs, EvmResults, EvmChart
│   │   ├── cashflow/         # CashFlowInputs, CashFlowChart, TimelineBar, ComparisonTable
│   │   └── Plot.tsx          # Plotly wrapper (ref-based)
│   ├── lib/
│   │   ├── shared/statistics.ts       # lnGamma, betaPdf, scurveCdf (regularized incomplete Beta)
│   │   ├── evm/calculations.ts        # duration/PV/EV resolution, EVM metrics, Earned Schedule
│   │   └── cashflow/
│   │       ├── patterns.ts            # ported from pages/6_Cash_Flow_Simulator.py
│   │       ├── calculations.ts
│   │       └── export.ts              # client-side CSV export
│   └── types/               # evm.ts, cashflow.ts
└── index.html
```

## Local development

```bash
cd F:\Coding\Portfolio\newtools
npm install
npm run dev        # http://localhost:5173
```

## Build

```bash
npm run build      # type-check (tsc) + Vite build -> dist/
npm run preview    # preview the production build locally
```

The production output is in `newtools/dist/` — a set of static files.

## Tests

Calculation-logic parity tests (EVM metrics, cash flow patterns summing to budget, inflation/delay behavior):

```bash
npm test           # one-off run
npm run test:watch # watch mode
```

## Deploy to a VPS (nginx)

1. Build locally (or in CI):
   ```bash
   npm ci
   npm run build
   ```
2. Copy `dist/` to the VPS, e.g. `/var/www/portfolio-suite/`:
   ```bash
   scp -r dist/* user@your-vps:/var/www/portfolio-suite/
   ```
3. nginx config (SPA fallback so client-side routes work on refresh):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/portfolio-suite;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # cache static assets
       location ~* \.(js|css|svg|woff2?)$ {
           expires 30d;
           add_header Cache-Control "public, immutable";
       }
   }
   ```
4. Reload nginx: `sudo nginx -t && sudo nginx -s reload`
5. (Optional) Add HTTPS with Let's Encrypt: `sudo certbot --nginx -d your-domain.com`

No environment variables or secrets are required for Stage 1.

## Routes

| Route | Page |
|-------|------|
| `/` | Home — two tool cards |
| `/evm-calculator` | EVM Calculator |
| `/cash-flow-simulator` | Cash Flow Simulator |

## Notes on the port from Streamlit

- EVM duration, Planned Value, and Earned Schedule logic follow `core/evm_engine.py` (the engine used by the main Streamlit app's Project Analysis page): durations are computed in months using a 30.44 days/month constant, the S-Curve uses a proper regularized incomplete Beta CDF (`scurveCdf` in `src/lib/shared/statistics.ts`) parameterized by α/β (default 2/2, closed form `3t^2 - 2t^3`), and Earned Schedule is found via direct formula (Linear) or binary search over the CDF (S-Curve).
- The "Estimate" Earned Value method ports `calculate_present_value` from `core/evm_engine.py`: it discounts the Actual Cost, treated as an annuity spread evenly over the elapsed duration, back to present value using a monthly rate derived from the annual inflation rate `(1 + r)^(1/12) - 1`.
- Cash flow patterns are ported from `pages/6_Cash_Flow_Simulator.py`. The S-Curve used `scipy.stats.beta.pdf`; the Lanczos-based `lnGamma` / `betaPdf` implementation now lives in `src/lib/shared/statistics.ts` (shared with the EVM Calculator) and is re-exported from `src/lib/cashflow/patterns.ts` for backward compatibility.
- Baseline/compare session state from Streamlit is replaced with React `useState`; CSV export is done in the browser via `Blob` downloads.
- The legacy Streamlit app at the repository root is left untouched.
