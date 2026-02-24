"use client";

import { useState, useEffect, useRef } from "react";
import "../theme.css";
import RiskRegisterSection from "./RiskRegisterSection";
import WbsSection from "./WbsSection";
import KanbanBoard from "./KanbanBoard";
import GanttSection from "./GanttSection";
import type { WbsPhase, KanbanTask } from "./types";
import { saveProject, listProjects } from "../lib/projectService";
import type { Project } from "../lib/projectService";

type Risk = {
  id: string;
  description: string;
  category: string;
  impact: "Low" | "Medium" | "High";
  probability: "Low" | "Medium" | "High";
  response: string;
  owner: string;
};

interface Props {
  projectId: string | null;    // null = new project
  onBack: () => void;
}

function emptyForm() {
  return { projectName: "", budget: "", duration: "", objective: "", constraints: "", projectType: "" };
}

function ProjectSetupSection({ projectId, onBack }: Props) {
  const [form, setForm] = useState(emptyForm());
  const [charter, setCharter] = useState<string>("");
  const [risks, setRisks] = useState<Risk[]>([]);
  const [wbs, setWbs] = useState<WbsPhase[]>([]);
  const [aiTasks, setAiTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(projectId);

  // Load project if editing existing
  useEffect(() => {
    if (!projectId) {
      // New project — reset
      setForm(emptyForm());
      setCharter("");
      setRisks([]);
      setWbs([]);
      setAiTasks([]);
      setCurrentId(null);
      return;
    }

    listProjects().then((all) => {
      const p = all.find((x) => x.id === projectId);
      if (!p) return;
      setCurrentId(p.id);
      setForm({
        projectName: p.project_name ?? "",
        budget: p.budget ?? "",
        duration: p.duration ?? "",
        objective: p.objective ?? "",
        constraints: p.constraints ?? "",
        projectType: p.project_type ?? "",
      });
      setCharter(p.charter ?? "");
      setRisks((p.risks ?? []) as Risk[]);
      setWbs((p.wbs ?? []) as WbsPhase[]);
      setAiTasks(
        ((p.kanban?.todo ?? []) as KanbanTask[]).concat(
          (p.kanban?.inprogress ?? []) as KanbanTask[],
          (p.kanban?.done ?? []) as KanbanTask[]
        )
      );
    });
  }, [projectId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { id, value } = e.target;
    if (id === "budget") {
      const clean = value.replace(/\D/g, "");
      const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setForm((prev) => ({ ...prev, [id]: formatted }));
    } else {
      setForm((prev) => ({ ...prev, [id]: value }));
    }
  }

  // Auto-save form fields to Supabase (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleAutoSave(updatedForm = form, updatedCharter = charter, updatedRisks = risks, updatedWbs = wbs, updatedTasks = aiTasks) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      doSave(updatedForm, updatedCharter, updatedRisks, updatedWbs, updatedTasks);
    }, 1500);
  }

  async function doSave(f = form, c = charter, r = risks, w = wbs, t = aiTasks) {
    if (!f.projectName.trim()) return;
    setSaving(true);
    try {
      const kanban = { todo: t, inprogress: [], done: [] };
      const saved = await saveProject(currentId, {
        project_name: f.projectName,
        budget: f.budget,
        duration: f.duration,
        project_type: f.projectType,
        objective: f.objective,
        constraints: f.constraints,
        charter: c,
        wbs: w,
        risks: r,
        kanban,
      });
      if (!currentId) setCurrentId(saved.id);
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    handleChange(e);
    const updated = {
      ...form, [e.target.id]: e.target.id === "budget"
        ? e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        : e.target.value
    };
    scheduleAutoSave(updated);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCharter("");
    setRisks([]);
    setWbs([]);
    setAiTasks([]);

    try {
      const res = await fetch("/api/generate-charter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to generate");

      const newCharter = data.charter || "";
      const newRisks = (data.risks || []) as Risk[];
      const newWbs = (data.wbs || []) as WbsPhase[];
      const newTasks = (data.tasks || []) as KanbanTask[];

      setCharter(newCharter);
      setRisks(newRisks);
      setWbs(newWbs);
      setAiTasks(newTasks);

      // Immediately save with AI results
      await doSave(form, newCharter, newRisks, newWbs, newTasks);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const hasResults = !!charter;

  return (
    <div className="container">
      <header className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, padding: "0 4px 0 0" }}
          title="Back to Dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="page-title">
            {currentId ? "Edit Project" : "New Project"}{" "}
            {saving && <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 400 }}>Saving…</span>}
          </h1>
          <p className="page-subtitle">
            Describe your project — AI will generate the charter, WBS, Kanban tasks, risks, and timeline
            <span className="dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
        </div>
      </header>

      {/* ── Form Card ── */}
      <div className="section card">
        <div className="form">
          <div className="field">
            <input id="projectName" className="floating-input" type="text" placeholder=" "
              value={form.projectName} onChange={handleFormChange} />
            <label htmlFor="projectName" className="floating-label">Project Name</label>
          </div>
          <div className="field">
            <input id="budget" className="floating-input" type="text" placeholder=" "
              value={form.budget} onChange={handleFormChange} />
            <label htmlFor="budget" className="floating-label">Budget</label>
          </div>
          <div className="field">
            <input id="duration" className="floating-input" type="text" placeholder=" "
              value={form.duration} onChange={handleFormChange} />
            <label htmlFor="duration" className="floating-label">Duration (weeks)</label>
          </div>
          <div className="field">
            <select id="projectType" className="floating-input" style={{ appearance: "auto", paddingTop: "8px" }}
              value={form.projectType} onChange={handleFormChange}>
              <option value="IT">IT / Software</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Construction">Construction</option>
              <option value="Other">Other</option>
            </select>
            <label htmlFor="projectType" className="floating-label" style={{ top: "-10px", fontSize: "11px" }}>Project Type</label>
          </div>
          <div className="field">
            <textarea id="objective" className="floating-textarea" placeholder=" "
              value={form.objective} onChange={handleFormChange} />
            <label htmlFor="objective" className="floating-label">Objective / Business Goal</label>
          </div>
          <div className="field">
            <textarea id="constraints" className="floating-textarea" placeholder=" "
              value={form.constraints} onChange={handleFormChange} />
            <label htmlFor="constraints" className="floating-label">Key Constraints</label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "✦ Generate Full Plan with AI"}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="section list-box" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            AI is generating your charter, WBS, tasks, and risk register
            <span className="dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {hasResults && !loading && (
        <>
          <div className="section list-box">
            <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>📄 Project Charter</h2>
            <div className="charter-output">
              <pre className="charter-pre">{charter}</pre>
            </div>
          </div>

          {wbs.length > 0 && (
            <div className="section">
              <WbsSection
                phases={wbs}
                onAddToKanban={(title) => {
                  const task = { id: Date.now(), title };
                  setAiTasks((prev) => {
                    const next = [...prev, task];
                    scheduleAutoSave(form, charter, risks, wbs, next);
                    return next;
                  });
                }}
              />
            </div>
          )}

          <div className="section">
            <KanbanBoard externalTasks={aiTasks} />
          </div>

          {risks.length > 0 && (
            <div className="section">
              <RiskRegisterSection risks={risks} />
            </div>
          )}

          {wbs.length > 0 && (
            <div className="section">
              <GanttSection phases={wbs} totalWeeks={Number(form.duration) || 12} projectType={form.projectType} />
            </div>
          )}
        </>
      )}

      {!hasResults && !loading && !error && (
        <div className="list-box" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            Fill in the form above and click <strong style={{ color: "var(--text-main)" }}>Generate Full Plan with AI</strong><br />
            Your charter, WBS, tasks, risks, and timeline will all appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProjectSetupSection;
