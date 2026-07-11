import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import { AuthProvider } from './lib/auth/AuthContext'
import AuthGate from './components/auth/AuthGate'
import './index.css'

const EvmCalculator = lazy(() => import('./pages/EvmCalculator'))
const CashFlowSimulator = lazy(() => import('./pages/CashFlowSimulator'))
const WbsMaker = lazy(() => import('./pages/WbsMaker'))
const Admin = lazy(() => import('./pages/Admin'))

function PageFallback() {
  return <div className="text-center text-ink-400 py-12">Loading…</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Home />} />
              <Route
                path="evm-calculator"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <EvmCalculator />
                  </Suspense>
                }
              />
              <Route
                path="cash-flow-simulator"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <CashFlowSimulator />
                  </Suspense>
                }
              />
              <Route
                path="wbs-maker"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <WbsMaker />
                  </Suspense>
                }
              />
              <Route
                path="admin"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Admin />
                  </Suspense>
                }
              />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>,
)
