import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from './lib/auth/AuthContext'

export default function App() {
  const { auth, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="bg-white border-b border-ink-200 shadow-sm sticky top-0 z-10">
        {auth && (
          <div className="max-w-7xl mx-auto px-4 pt-2 flex items-center justify-end gap-2 text-xs text-ink-400">
            <span>
              Registered to: <strong className="text-ink-700">{auth.name ?? auth.email}</strong>
              {', '}
              {auth.email}
            </span>
            <span aria-hidden="true">&middot;</span>
            <button
              type="button"
              onClick={logout}
              className="font-semibold text-brand-700 hover:underline"
            >
              Sign out
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-lg font-semibold text-ink-900 leading-tight">Project Management Tools</div>
              <div className="text-xs text-ink-400 leading-tight">EVM, Cash Flow, WBS &amp; Portfolio Tools</div>
            </div>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium no-underline ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/evm-calculator"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium no-underline ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'}`
              }
            >
              EVM Calculator
            </NavLink>
            <NavLink
              to="/cash-flow-simulator"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium no-underline ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'}`
              }
            >
              Cash Flow Simulator
            </NavLink>
            <NavLink
              to="/wbs-maker"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium no-underline ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'}`
              }
            >
              WBS Maker
            </NavLink>
            <NavLink
              to="/portfolio-planner"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium no-underline ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'}`
              }
            >
              Portfolio Planner
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-ink-200 mt-6">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-ink-400">
          <div className="font-semibold text-ink-500">Project Management Tools — New Tools v1.0</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <img
              src="/developer-photo.jpg"
              alt="Dr. Khalid Ahmad Khan"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span>
              Developed by{' '}
              <a
                href="https://www.linkedin.com/in/khalidahmadkhan/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 hover:underline"
              >
                Dr. Khalid Ahmad Khan
              </a>{' '}
              • Strategic Management Solutions
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
