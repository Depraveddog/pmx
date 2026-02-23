import { useEffect, useState } from "react";
import "./navbar.css";
import { useAuth } from "../context/AuthContext";

// Import both logos
import pmxDark from "../assets/black_nobg.png";
import pmxLight from "../assets/white_nobg.png";

type Theme = "dark" | "light";

function Navbar() {
  const [theme, setTheme] = useState<Theme>("dark");
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

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* LEFT: LOGO */}
        <div className="navbar-left">
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
    </nav>
  );
}

export default Navbar;
