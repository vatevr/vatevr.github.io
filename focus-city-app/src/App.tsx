import { HashRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { StateProvider } from './state'
import { FocusTimer } from './components/FocusTimer'
import { CityView } from './components/CityView'
import { Tasks } from './components/Tasks'
import { Habits } from './components/Habits'
import { MaterialsBar } from './components/MaterialsBar'
import { AmbientControls } from './components/AmbientControls'
import { Stats } from './components/Stats'
import { Settings } from './components/Settings'

const NAV = [
  { to: '/city', label: 'City' },
  { to: '/focus', label: 'Focus' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/habits', label: 'Habits' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
]

function RightRail() {
  return (
    <div className="flex flex-col gap-3 min-h-0">
      <Tasks />
      <Habits />
    </div>
  )
}

function Shell() {
  return (
    <div className="min-h-screen flex flex-col p-3 md:p-5 gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl md:text-2xl tracking-wide text-gold">🏰 Focus Kingdom</h1>
        <nav className="flex flex-wrap gap-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `text-xs uppercase tracking-widest px-2 py-1 rounded ${
                  isActive ? 'bg-gold/90 text-ink' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto grow md:grow-0 md:min-w-[420px]">
          <MaterialsBar />
        </div>
      </header>

      <main className="grow grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px] gap-3 min-h-0">
        <Routes>
          <Route path="/" element={<Navigate to="/city" replace />} />
          <Route path="/city" element={<><FocusTimer /><CityView /><RightRail /></>} />
          <Route path="/focus" element={<><FocusTimer /><CityView /><RightRail /></>} />
          <Route path="/tasks" element={<><Tasks /><CityView /><RightRail /></>} />
          <Route path="/habits" element={<><Habits /><CityView /><RightRail /></>} />
          <Route path="/stats" element={<><Stats /><CityView /><RightRail /></>} />
          <Route path="/settings" element={<><Settings /><CityView /><RightRail /></>} />
        </Routes>
      </main>

      <footer className="flex flex-col gap-2">
        <AmbientControls />
        <p className="text-[10px] text-center text-white/30">
          Every focused hour leaves a visible trace. Saved locally in your browser.
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <StateProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StateProvider>
  )
}
