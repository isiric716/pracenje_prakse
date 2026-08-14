import "./App.css";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Diary from "./pages/Diary";
import MentorDashboard from "./pages/MentorDashboard";
import Export from "./pages/Export";
import Settings from "./pages/Settings";


const STUDENT_NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: "/diary",
    label: "Dnevnik",
    requiresActiveInternship: true,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="13" y2="13" />
      </svg>
    ),
  },
  {
    to: "/export",
    label: "Izvoz",
    requiresActiveInternship: true,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Postavke",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const MENTOR_NAV_ITEMS = [
  {
    to: "/mentor",
    label: "Mentor dashboard",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
];

function AppLayout({ children, user, onLogout }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName = user?.fullName || "";
  const displayRole = user?.role === "mentor" ? "Mentor" : "Student";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const navItems = user?.role === "mentor"
    ? MENTOR_NAV_ITEMS
    : STUDENT_NAV_ITEMS.filter(
        (item) => !item.requiresActiveInternship || user?.internshipStatus === "active"
      );

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="22" height="22" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">Evidencija</span>
              <span className="sidebar-logo-sub">Stručne prakse</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user" onClick={() => navigate("/settings")}>
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">{displayRole}</span>
            </div>
          )}
          {!collapsed && (
            <button
              className="sidebar-collapse-btn"
              onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {collapsed && (
          <button className="sidebar-expand-btn" onClick={() => setCollapsed(false)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-right">
            <div
              className="topbar-profile-menu"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setProfileMenuOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setProfileMenuOpen(false);
                  event.currentTarget.querySelector(".topbar-profile")?.focus();
                }
              }}
            >
              <button
                className="topbar-profile"
                type="button"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <div className="topbar-avatar">{initials}</div>
                <span className="topbar-name">{displayName}</span>
                <svg className={profileMenuOpen ? "topbar-profile-arrow topbar-profile-arrow--open" : "topbar-profile-arrow"} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {profileMenuOpen && (
                <div className="topbar-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={() => navigate("/settings")}>
                    Moj profil
                  </button>
                  <button type="button" role="menuitem" onClick={onLogout}>
                    Odjava
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ user, isAuthReady, allowedRole, requiresActiveInternship = false, children }) {
  if (!isAuthReady) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "mentor" ? "/mentor" : "/dashboard"}
        replace
      />
    );
  }

  if (requiresActiveInternship && user.internshipStatus !== "active") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(
    () => !localStorage.getItem("token")
  );
  const authRequestRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    return;
  }

  const controller = new AbortController();
  authRequestRef.current = controller;

  fetch("/users/current", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Nije moguće dohvatiti korisnika.");
      }

      return response.json();
    })
    .then(setUser)
    .catch((error) => {
      if (error.name !== "AbortError") {
        localStorage.removeItem("token");
        setUser(null);
      }
    })
    .finally(() => {
      if (!controller.signal.aborted) {
        setIsAuthReady(true);
      }
    });

  return () => controller.abort();
}, []);

  function handleLogin(authenticatedUser) {
    authRequestRef.current?.abort();
    setUser(authenticatedUser);
    setIsAuthReady(true);
  }

  function handleLogout() {
    authRequestRef.current?.abort();
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthReady(true);
    navigate("/", { replace: true });
  }

  const handleInternshipStatusChange = useCallback((internshipStatus) => {
    setUser((current) => (
      current && current.internshipStatus !== internshipStatus
        ? { ...current, internshipStatus }
        : current
    ));
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onLogin={handleLogin} />}
      />
      <Route
      path="/dashboard"
      element={
        <ProtectedRoute user={user} isAuthReady={isAuthReady} allowedRole="student">
          <AppLayout user={user} onLogout={handleLogout}>
            <Dashboard user={user} onInternshipStatusChange={handleInternshipStatusChange} />
          </AppLayout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/diary"
      element={
        <ProtectedRoute user={user} isAuthReady={isAuthReady} allowedRole="student" requiresActiveInternship>
          <AppLayout user={user} onLogout={handleLogout}>
            <Diary user={user} />
          </AppLayout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/export"
      element={
        <ProtectedRoute user={user} isAuthReady={isAuthReady} allowedRole="student" requiresActiveInternship>
          <AppLayout user={user} onLogout={handleLogout}>
            <Export user={user} />
          </AppLayout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/mentor"
      element={
        <ProtectedRoute user={user} isAuthReady={isAuthReady} allowedRole="mentor">
          <AppLayout user={user} onLogout={handleLogout}>
            <MentorDashboard user={user} />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute user={user} isAuthReady={isAuthReady}>
          <AppLayout user={user} onLogout={handleLogout}>
            <Settings user={user} onUserUpdate={setUser} />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    </Routes>
    );
  }

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
