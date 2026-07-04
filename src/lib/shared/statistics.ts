/**
 * Shared statistical helpers used by both the EVM Calculator and the Cash
 * Flow Simulator, replacing `scipy.stats.beta` / `math.gamma` used in the
 * Streamlit app.
 */

const INTEGRATION_STEPS = 200

/** Lanczos approximation of log-Gamma. */
export function lnGamma(x: number): number {
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x)
  }
  const a = x - 1
  let t = c[0]
  for (let i = 1; i < g + 2; i++) {
    t += c[i] / (a + i)
  }
  return 0.5 * Math.log(2 * Math.PI) + (a + 0.5) * Math.log(a + g + 0.5) - (a + g + 0.5) + Math.log(t)
}

function logBetaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return -Infinity
  const logNorm = lnGamma(alpha + beta) - lnGamma(alpha) - lnGamma(beta)
  return logNorm + (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x)
}

/** Beta distribution PDF (replaces `scipy.stats.beta.pdf`). */
export function betaPdf(x: number, alpha: number, beta: number): number {
  return Math.exp(logBetaPdf(x, alpha, beta))
}

function closedFormScurve(x: number): number {
  const xc = Math.max(0, Math.min(1, x))
  return 3 * xc * xc - 2 * xc * xc * xc
}

/**
 * Regularized incomplete Beta function I_x(alpha, beta), used as the S-curve
 * CDF for planned/earned value curves (replaces the Python `scurve_cdf`
 * helper in `core/evm_engine.py`).
 *
 * Uses the closed form `3x^2 - 2x^3` for alpha=beta=2 (matches the
 * historical polynomial approximation), and trapezoidal numerical
 * integration of the Beta PDF otherwise, falling back to the closed form on
 * numerical failure.
 */
export function scurveCdf(x: number, alpha = 2, beta = 2): number {
  try {
    const xc = Math.max(0, Math.min(1, x))
    const a = Math.max(0.1, alpha)
    const b = Math.max(0.1, beta)

    if (Math.abs(a - 2) < 1e-9 && Math.abs(b - 2) < 1e-9) {
      return closedFormScurve(xc)
    }
    if (xc === 0) return 0
    if (xc === 1) return 1

    const n = INTEGRATION_STEPS
    const xs: number[] = new Array(n + 1)
    const pdfVals: number[] = new Array(n + 1)
    for (let i = 0; i <= n; i++) {
      const xi = (xc * i) / n
      xs[i] = xi
      pdfVals[i] = xi ** (a - 1) * (1 - xi) ** (b - 1)
    }

    let integral = 0
    for (let i = 0; i < n; i++) {
      integral += ((pdfVals[i] + pdfVals[i + 1]) / 2) * (xs[i + 1] - xs[i])
    }

    const logB = lnGamma(a) + lnGamma(b) - lnGamma(a + b)
    const result = integral / Math.exp(logB)

    if (!isFinite(result) || isNaN(result)) return closedFormScurve(xc)
    return Math.max(0, Math.min(1, result))
  } catch {
    return closedFormScurve(x)
  }
}
