import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import type { Page } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProjectSetupSection from "./components/ProjectSetupSection";
import CalendarPage from "./components/CalendarPage";
import AssistantPage from "./components/AssistantPage";
import AuthPage from "./components/AuthPage";
import "./theme.css";

function AppShell() {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const savedNotes = localStorage.getItem("pmx-dashboard-notes") || "";
    setNotes(savedNotes);
  }, []);

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
    localStorage.setItem("pmx-dashboard-notes", e.target.value);
  }

  if (loading) return null;
  if (!session) {
    // Mark that we're on the auth page so we can detect fresh login next render
    sessionStorage.setItem("pmx-was-on-auth", "1");
    return <AuthPage />;
  }

  // Detect fresh login: if we just came from auth page, play entry animation
  const justLoggedIn = sessionStorage.getItem("pmx-was-on-auth") === "1";
  if (justLoggedIn) sessionStorage.removeItem("pmx-was-on-auth");

  function handleOpenProject(id: string | null) {
    setActiveProjectId(id);
    setActivePage("setup");
  }

  function handleNavigate(page: Page) {
    setActivePage(page);
    // When going back to dashboard, clear active project
    if (page === "dashboard") setActiveProjectId(null);
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
      case "setup":
        return (
          <ProjectSetupSection
            projectId={activeProjectId}
            onBack={() => { setActivePage("dashboard"); setActiveProjectId(null); }}
          />
        );
      case "calendar":
        return <CalendarPage />;
      case "assistant":
        return <AssistantPage />;
      default:
        return <Dashboard onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
    }
  };

  return (
    <>
      <Navbar activePage={activePage} onNavigate={handleNavigate} />
      <div className={`app-shell${justLoggedIn ? " app-shell--entering" : ""}`}>
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>

      {/* Global Notes FAB */}
      <button
        className={`notes-fab ${showNotes ? "active" : ""}`}
        onClick={() => setShowNotes(!showNotes)}
        title="Open Scratchpad"
      >
        {showNotes ? "✕" : "📝"}
      </button>

      {/* Global Notes Panel */}
      {showNotes && (
        <div className="notes-panel">
          <div className="notes-panel-header">
            <h3>Scratchpad</h3>
          </div>
          <textarea
            className="notes-textarea"
            placeholder="Jot down your ideas, reminders, or scratchpad thoughts here..."
            value={notes}
            onChange={handleNotesChange}
            autoFocus
          />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
