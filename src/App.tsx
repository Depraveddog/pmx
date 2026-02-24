import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import type { Page } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProjectSetupSection from "./components/ProjectSetupSection";
import CalendarPage from "./components/CalendarPage";
import AuthPage from "./components/AuthPage";
import "./theme.css";

function AppShell() {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  if (loading) return null;
  if (!session) return <AuthPage />;

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
      default:
        return <Dashboard onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
    }
  };

  return (
    <>
      <Navbar />
      <div className="app-shell">
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
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
