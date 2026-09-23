import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './state/store';
import {
  CalendarIcon,
  LibraryIcon,
  ProgramIcon,
  ProgressIcon,
  SettingsIcon,
  TodayIcon,
} from './components/Icons';
import { Today } from './screens/Today';
import { CalendarScreen } from './screens/Calendar';
import { ActiveWorkout } from './screens/ActiveWorkout';
import { ExerciseLibrary } from './screens/ExerciseLibrary';
import { ProgramLibrary } from './screens/ProgramLibrary';
import { ProgramBuilder } from './screens/ProgramBuilder';
import { Progress } from './screens/Progress';
import { SettingsScreen } from './screens/Settings';

const TABS = [
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/programs', label: 'Programs', Icon: ProgramIcon },
  { to: '/exercises', label: 'Library', Icon: LibraryIcon },
  { to: '/progress', label: 'Progress', Icon: ProgressIcon },
];

export function App() {
  const { loading, error } = useStore();
  const location = useLocation();
  // The logging screen owns the whole viewport; the tab bar would just be a way
  // to lose your place mid-set.
  const focusMode = location.pathname.startsWith('/session/');

  if (loading) {
    return (
      <div className="app">
        <div className="empty" style={{ marginTop: '35vh' }}>
          <div className="brand-mark" style={{ margin: '0 auto 14px auto' }}>
            O
          </div>
          <p className="muted small">Opening your training history…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <main className="app-main" style={{ paddingTop: 60 }}>
          <div className="banner banner-danger">{error}</div>
          <p className="small muted" style={{ marginTop: 14 }}>
            This app keeps everything in your browser's own storage. Private windows and
            "block site data" settings switch that storage off.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {!focusMode && (
        <header className="app-header">
          <span className="brand">
            <span className="brand-mark">O</span>
            Overload
          </span>
          <span className="spacer" />
          <NavLink to="/settings" className="icon-btn" aria-label="Settings">
            <SettingsIcon />
          </NavLink>
        </header>
      )}

      <main className="app-main" style={focusMode ? { paddingTop: 0, paddingBottom: 140 } : undefined}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/session/:id" element={<ActiveWorkout />} />
          <Route path="/programs" element={<ProgramLibrary />} />
          <Route path="/programs/:id" element={<ProgramBuilder />} />
          <Route path="/exercises" element={<ExerciseLibrary />} />
          <Route path="/exercises/:id" element={<ExerciseLibrary />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/progress/:exerciseId" element={<Progress />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route
            path="*"
            element={
              <div className="empty" style={{ marginTop: 60 }}>
                <h3>Nothing here</h3>
                <NavLink to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                  Back to today
                </NavLink>
              </div>
            }
          />
        </Routes>
      </main>

      {!focusMode && (
        <nav className="tabbar">
          {TABS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
