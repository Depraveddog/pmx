import { useEffect, useState } from "react";
import "./navbar.css";
import { useAuth } from "../context/AuthContext";

// Import both logos
import pmxDark from "../assets/black_nobg.png";
import pmxLight from "../assets/white_nobg.png";
import type { Page } from "./Sidebar";

type Theme = "dark" | "light";

interface NavbarProps {
  activePage?: Page;
  onNavigate?: (page: Page) => void;
}

function Navbar({ activePage, onNavigate }: NavbarProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Load saved theme on mount
  useEffect(() => {
    const saved = (localStorage.getItem("pmx-theme") as Theme) || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // Apply theme and save it
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pmx-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "setup", label: "Project Planner", icon: "✦" },
    {
      id: "calendar",
      label: "Calendar",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: "assistant",
      label: "PMX Assistant",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <line x1="12" y1="7" x2="12" y2="11" />
          <circle cx="9" cy="16" r="1" fill="currentColor" />
          <circle cx="15" cy="16" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* LEFT: LOGO */}
        <div className="navbar-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onNavigate && (
            <button className="nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          )}
          <img
            src={theme === "light" ? pmxLight : pmxDark}
            alt="PMX Logo"
            className="navbar-logo"
          />
        </div>

        {/* CENTER: SEARCH */}
        <div className="navbar-search-wrapper">
          <div className="navbar-search">
            <span className="navbar-search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input type="text" className="navbar-search-input" placeholder="Search" />
          </div>
        </div>

        {/* RIGHT: USER + THEME TOGGLE */}
        <div className="navbar-right">
          {user && (
            <>
              <span className="nav-user-email">{user.email}</span>
              <button className="nav-signout" onClick={signOut}>Sign Out</button>
            </>
          )}

          {/* THEME SWITCH */}
          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-toggle-knob"></span>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && onNavigate && (
        <div className="nav-mobile-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-mobile-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-mobile-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {user && (
            <button className="nav-mobile-item signout" onClick={signOut}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
