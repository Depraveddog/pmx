import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import type { Page } from "./Sidebar";
import { listProjects, deleteProject } from "../lib/projectService";
import type { Project } from "../lib/projectService";
import { useAuth } from "../context/AuthContext";

interface DashboardProps {
    onNavigate: (page: Page) => void;
    onOpenProject: (id: string | null) => void;
}

const TYPE_ICONS: Record<string, string> = {
    IT: "💻",
    Infrastructure: "🏗️",
    Construction: "🔨",
    Other: "📁",
    "": "📁",
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenProject }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setLoading(true);
        try {
            const data = await listProjects();
            setProjects(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function handleDeleteClick(p: Project, e: React.MouseEvent) {
        e.stopPropagation();
        setProjectToDelete(p);
    }

    async function confirmDelete() {
        if (!projectToDelete) return;
        setDeleting(projectToDelete.id);
        try {
            await deleteProject(projectToDelete.id);
            setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
            setProjectToDelete(null);
        } catch (err) {
            console.error("Failed to delete project:", err);
            setProjectToDelete(null);
        } finally {
            setDeleting(null);
        }
    }

    // Aggregate stats across all projects
    const totalTasks = projects.reduce((sum, p) => {
        const k = p.kanban ?? { todo: [], inprogress: [], done: [] };
        return sum + (k.todo?.length ?? 0) + (k.inprogress?.length ?? 0) + (k.done?.length ?? 0);
    }, 0);
    const doneTasks = projects.reduce((sum, p) => sum + (p.kanban?.done?.length ?? 0), 0);
    const inProgressTasks = projects.reduce((sum, p) => sum + (p.kanban?.inprogress?.length ?? 0), 0);
    const highRisks = projects.reduce(
        (sum, p) => sum + ((p.risks ?? []).filter((r: any) => r.impact === "High").length),
        0
    );

    const stats = [
        { label: "Projects", value: projects.length, sub: "total portfolios", color: "blue" },
        { label: "Completed Tasks", value: doneTasks, sub: totalTasks ? `${Math.round((doneTasks / totalTasks) * 100)}% done` : "no tasks yet", color: "green" },
        { label: "In Progress", value: inProgressTasks, sub: "active right now", color: "yellow" },
        { label: "High Risks", value: highRisks, sub: projects.length ? `across ${projects.length} projects` : "run AI to detect", color: "red" },
    ];

    const firstName = user?.email?.split("@")[0] ?? "there";

    return (
        <div className="container">
            <header className="page-header">
                <h1 className="page-title">
                    Welcome back, <span className="highlight">{firstName}</span>
                </h1>
                <p className="page-subtitle">Your project management cockpit</p>
            </header>

            {/* Per-project stats table */}
            <div className="proj-stats-table-wrap">
                <table className="proj-stats-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>✅ Completed</th>
                            <th>⏳ In Progress</th>
                            <th>⚠️ High Risks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>Loading…</td></tr>
                        ) : projects.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>No projects yet — create one below</td></tr>
                        ) : (
                            projects.map(p => {
                                const k = p.kanban ?? { todo: [], inprogress: [], done: [] };
                                const done = k.done?.length ?? 0;
                                const inprog = k.inprogress?.length ?? 0;
                                const risks = (p.risks ?? []).filter((r: any) => r.impact === "High").length;
                                return (
                                    <tr key={p.id} className="proj-stats-row" onClick={() => { onOpenProject(p.id); onNavigate("setup"); }}>
                                        <td className="proj-stats-name">
                                            <span className="proj-stats-icon">{TYPE_ICONS[p.project_type] ?? "📁"}</span>
                                            {p.project_name || "Untitled"}
                                        </td>
                                        <td><span className="proj-stat-pill pill-green">{done}</span></td>
                                        <td><span className="proj-stat-pill pill-yellow">{inprog}</span></td>
                                        <td><span className={`proj-stat-pill ${risks > 0 ? "pill-red" : "pill-dim"}`}>{risks}</span></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>


            {/* Projects section */}
            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2 className="dashboard-section-title">My Projects</h2>
                    <button className="btn-new-project" onClick={() => { onOpenProject(null); onNavigate("setup"); }}>
                        + New Project
                    </button>
                </div>

                {loading ? (
                    <div className="projects-empty">
                        <p style={{ color: "var(--text-muted)", margin: 0 }}>Loading projects…</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="projects-empty">
                        <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
                        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
                            No projects yet.{" "}
                            <button
                                className="auth-toggle-btn"
                                onClick={() => { onOpenProject(null); onNavigate("setup"); }}
                            >
                                Create your first project →
                            </button>
                        </p>
                    </div>
                ) : (
                    <div className="project-cards-grid">
                        {projects.map((p) => {
                            const kanban = p.kanban ?? { todo: [], inprogress: [], done: [] };
                            const tasks = (kanban.todo?.length ?? 0) + (kanban.inprogress?.length ?? 0) + (kanban.done?.length ?? 0);
                            const done = kanban.done?.length ?? 0;
                            const pct = tasks ? Math.round((done / tasks) * 100) : 0;
                            const hasCharter = !!p.charter;

                            return (
                                <div
                                    key={p.id}
                                    className="project-card"
                                    onClick={() => { onOpenProject(p.id); onNavigate("setup"); }}
                                >
                                    <div className="project-card-header">
                                        <span className="project-card-icon">
                                            {TYPE_ICONS[p.project_type] ?? "📁"}
                                        </span>
                                        <div className="project-card-meta">
                                            <span className="project-card-type">{p.project_type || "General"}</span>
                                            {hasCharter && <span className="project-card-badge">AI Generated</span>}
                                        </div>
                                        <button
                                            className="project-card-delete"
                                            onClick={(e) => handleDeleteClick(p, e)}
                                            disabled={deleting === p.id}
                                            title="Delete project"
                                        >
                                            {deleting === p.id ? "…" : "✕"}
                                        </button>
                                    </div>

                                    <h3 className="project-card-name">{p.project_name || "Untitled"}</h3>

                                    {p.objective && (
                                        <p className="project-card-objective">{p.objective}</p>
                                    )}

                                    <div className="project-card-stats">
                                        <div className="project-card-stat">
                                            <span className="project-card-stat-val">{tasks}</span>
                                            <span className="project-card-stat-label">Tasks</span>
                                        </div>
                                        <div className="project-card-stat">
                                            <span className="project-card-stat-val">{p.duration ? `${p.duration}w` : "—"}</span>
                                            <span className="project-card-stat-label">Duration</span>
                                        </div>
                                        <div className="project-card-stat">
                                            <span className="project-card-stat-val">{p.budget || "—"}</span>
                                            <span className="project-card-stat-label">Budget</span>
                                        </div>
                                    </div>

                                    {tasks > 0 && (
                                        <div className="project-card-progress">
                                            <div className="project-card-progress-bar">
                                                <div className="project-card-progress-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="project-card-progress-label">{pct}% complete</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Custom Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="dashboard-modal-overlay" onClick={() => setProjectToDelete(null)}>
                    <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="dashboard-modal-header">
                            <h3>Delete Project</h3>
                            <button className="dashboard-modal-close" onClick={() => setProjectToDelete(null)}>✕</button>
                        </div>
                        <div className="dashboard-modal-body">
                            <p>Are you sure you want to delete <strong style={{ color: "var(--text-main)" }}>{projectToDelete.project_name || "Untitled"}</strong>?</p>
                            <p className="dashboard-modal-warning">This action cannot be undone.</p>
                        </div>
                        <div className="dashboard-modal-actions">
                            <button className="btn-outline" onClick={() => setProjectToDelete(null)} disabled={deleting !== null}>Cancel</button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={deleting !== null}>
                                {deleting === projectToDelete.id ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
