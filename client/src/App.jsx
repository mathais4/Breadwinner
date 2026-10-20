import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { APP_NAME, COHORT, firstName } from './lib/constants.js';
import { WorkspaceProvider, useWorkspace } from './workspace.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Board from './pages/Board.jsx';
import Applications from './pages/Applications.jsx';
import Prep from './pages/Prep.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function Shell() {
  const { user, logout } = useAuth();
  const { openPalette, openEditor } = useWorkspace();
  return (
    <>
      <header className="topbar">
        <div className="brand-block">
          <strong className="brand">{APP_NAME}</strong>
          <span className="cohort">{COHORT}</span>
        </div>
        <nav aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/board">Board</NavLink>
          <NavLink to="/applications">Applications</NavLink>
          <NavLink to="/prep">Prep</NavLink>
        </nav>
        <div className="spacer" />
        <button className="btn ghost small kbd-btn" onClick={openPalette} aria-label="Open command palette">Search <kbd>Ctrl K</kbd></button>
        <button className="btn primary small" onClick={() => openEditor()} aria-keyshortcuts="n">+ New</button>
        <NavLink to="/settings" className="who">{firstName(user) || user.email}</NavLink>
        <button className="btn ghost small" onClick={logout}>Log out</button>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/board" element={<Board />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <WorkspaceProvider>
              <Shell />
            </WorkspaceProvider>
          </Protected>
        }
      />
    </Routes>
  );
}
