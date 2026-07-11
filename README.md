# Project Management Tools — New Tools (Stage 1)

A React + TypeScript single-page app providing standalone project management tools (EVM Calculator, Cash Flow Simulator, WBS Maker), gated behind email verification:

1. **EVM Calculator** — Earned Value Management calculations (PV/EV/AC, CV, SV, CPI, SPI, SPIe, EAC, ETC, VAC, TCPI) with interactive PV curve analysis. Duration can be entered directly (months) or derived from Plan Start / Plan Finish / Status Date. Planned Value supports Linear, S-Curve (configurable α/β), or manual entry. Earned Value supports manual entry, % Complete, or an inflation-adjusted "Estimate" derived from the present value of the Actual Cost cash flow.
2. **Cash Flow Simulator** — Model cash flow under Linear, Highway, Building, and S-Curve patterns with start delay, project delay, and inflation; set baselines, compare scenarios, and export CSV.

This is Stage 1 of the Streamlit → React migration. All EVM/cash-flow calculations run in the browser. The app itself is gated behind email verification (see below) — a small Express backend issues and checks 6-digit email codes and a long-lived session token, but has no other server-side logic.

## Tech stack

- React 18 + TypeScript
- Vite 5 (build tool)
- React Router 6
- Tailwind CSS 3
- Plotly.js (`plotly.js-dist-min`) for charts
- Vitest for unit tests
- `server/` — Express + Node's built-in `node:sqlite`, JWT sessions, Brevo SMTP (email verification gate, see below)

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

Frontend (Vite dev server, proxies `/api` to the backend below):

```bash
npm install
npm run dev        # http://localhost:5173
```

Backend (in a second terminal):

```bash
cd server
npm install
cp .env.example .env   # fill in JWT_SECRET (openssl rand -hex 32); SMTP_* optional in dev
npm run dev             # http://localhost:3000 — logs the verification code to the console if SMTP isn't configured
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

## Deploy (Docker / Coolify)

The `Dockerfile` builds the frontend, installs the `server/` backend's production
dependencies, and produces a single image: a Node/Express process that serves
the built SPA as static files and the `/api/auth/*` verification endpoints
from one port (`3000`). There's no separate nginx container — Express handles
the SPA fallback itself.

```bash
docker build -t evmtools .
docker run -p 3000:3000 --env-file server/.env -v evmtools-data:/app/server/data evmtools
```

On Coolify (Dockerfile build pack):

1. Set the app's exposed port to `3000`.
2. Add a **persistent Volume** mounted at `/app/server/data` (or wherever `SQLITE_PATH`'s directory points) — without it, every redeploy wipes the verification database.
3. Set the environment variables below directly in Coolify's env UI (never through chat or a committed file).

### Environment variables (backend, `server/.env`)

| Var | Purpose | Example |
|---|---|---|
| `PORT` | Express listen port | `3000` |
| `SQLITE_PATH` | SQLite DB file location | `/app/server/data/app.db` |
| `JWT_SECRET` | Signs session tokens — generate with `openssl rand -hex 32` | *(required, no default)* |
| `JWT_EXPIRES_IN` | Session token lifetime | `365d` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Brevo SMTP creds | `smtp-relay.brevo.com` / `587` / ... |
| `MAIL_FROM` | Verification email sender | `Project Management Tools <no-reply@projectadvisor.cloud>` |
| `CODE_TTL_MINUTES` | Verification code expiry | `10` |
| `MAX_ATTEMPTS` | Wrong-code lockout threshold | `5` |
| `EMAIL_THROTTLE_PER_HOUR` | Max code requests per email/hour | `5` |
| `IP_RATE_LIMIT_PER_HOUR` | Max code requests per IP/hour | `30` |
| `ADMIN_KEY` | Shared secret for the `/admin` activity dashboard (`X-Admin-Key` header) — generate with `openssl rand -hex 32`; unset means the admin API is unreachable | *(optional, no default)* |

If `SMTP_USER`/`SMTP_PASS` are unset, the backend logs the verification code
to the console instead of emailing it — useful for local development, not
for production.

## Routes

| Route | Page |
|-------|------|
| `/` | Home — three tool cards |
| `/evm-calculator` | EVM Calculator |
| `/cash-flow-simulator` | Cash Flow Simulator |
| `/wbs-maker` | WBS Maker |
| `/admin` | Activity dashboard (top users, tool usage, CSV export) — requires the `ADMIN_KEY` |

## Notes on the port from Streamlit

- EVM duration, Planned Value, and Earned Schedule logic follow `core/evm_engine.py` (the engine used by the main Streamlit app's Project Analysis page): durations are computed in months using a 30.44 days/month constant, the S-Curve uses a proper regularized incomplete Beta CDF (`scurveCdf` in `src/lib/shared/statistics.ts`) parameterized by α/β (default 2/2, closed form `3t^2 - 2t^3`), and Earned Schedule is found via direct formula (Linear) or binary search over the CDF (S-Curve).
- The "Estimate" Earned Value method ports `calculate_present_value` from `core/evm_engine.py`: it discounts the Actual Cost, treated as an annuity spread evenly over the elapsed duration, back to present value using a monthly rate derived from the annual inflation rate `(1 + r)^(1/12) - 1`.
- Cash flow patterns are ported from `pages/6_Cash_Flow_Simulator.py`. The S-Curve used `scipy.stats.beta.pdf`; the Lanczos-based `lnGamma` / `betaPdf` implementation now lives in `src/lib/shared/statistics.ts` (shared with the EVM Calculator) and is re-exported from `src/lib/cashflow/patterns.ts` for backward compatibility.
- Baseline/compare session state from Streamlit is replaced with React `useState`; CSV export is done in the browser via `Blob` downloads.
- The legacy Streamlit app at the repository root is left untouched.
