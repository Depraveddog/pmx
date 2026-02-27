"use client";

import { useState, useEffect, useRef } from "react";
import "../theme.css";
import "./pdf-export.css";
import RiskRegisterSection from "./RiskRegisterSection";
import WbsSection from "./WbsSection";
import KanbanBoard from "./KanbanBoard";
import GanttSection from "./GanttSection";
import ProjectSchedule from "./ProjectSchedule";
import type { ScheduleEvent } from "./ProjectSchedule";
import BudgetTracker from "./BudgetTracker";
import type { BudgetItem } from "./BudgetTracker";
import type { WbsPhase, KanbanTask } from "./types";
import { saveProject, listProjects } from "../lib/projectService";
import type { Project } from "../lib/projectService";
import pmxDark from "../assets/black_nobg.png";
import pmxLight from "../assets/white_nobg.png";
import html2pdf from "html2pdf.js";
import { marked } from "marked";

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
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project if editing existing
  useEffect(() => {
    if (!projectId) {
      // New project — reset
      setForm(emptyForm());
      setCharter("");
      setRisks([]);
      setWbs([]);
      setAiTasks([]);
      setSchedule([]);
      setBudgetItems([]);
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
      setSchedule((p.schedule ?? []) as ScheduleEvent[]);
      setBudgetItems((p.budget_items ?? []) as BudgetItem[]);
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
  function scheduleAutoSave(updatedForm = form, updatedCharter = charter, updatedRisks = risks, updatedWbs = wbs, updatedTasks = aiTasks, updatedSchedule = schedule, updatedBudget = budgetItems) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      doSave(updatedForm, updatedCharter, updatedRisks, updatedWbs, updatedTasks, updatedSchedule, updatedBudget);
    }, 1500);
  }

  async function doSave(f = form, c = charter, r = risks, w = wbs, t = aiTasks, s = schedule, b = budgetItems) {
    const finalProjectName = f.projectName?.trim() || "Untitled Project";
    setSaving(true);
    try {
      const kanban = { todo: t, inprogress: [], done: [] };
      const saved = await saveProject(currentId, {
        project_name: finalProjectName,
        budget: f.budget,
        duration: f.duration,
        project_type: f.projectType,
        objective: f.objective,
        constraints: f.constraints,
        charter: c,
        wbs: w,
        risks: r,
        kanban,
        schedule: s,
        budget_items: b,
      });
      if (!currentId) setCurrentId(saved.id);
      setError(null);
    } catch (err: any) {
      console.error("Auto-save failed:", err);
      setError(`Failed to save to database: ${err?.message || "Check console"}`);
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

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so the same file can be re-uploaded
    e.target.value = "";

    setExtracting(true);
    setUploadMode(false);
    setError(null);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix ("data:application/pdf;base64,")
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64, mimeType: file.type || "application/pdf" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to extract document");

      // Populate form fields
      const updated = {
        projectName: data.projectName || form.projectName,
        budget: data.budget || form.budget,
        duration: data.duration || form.duration,
        projectType: data.projectType || form.projectType,
        objective: data.objective || form.objective,
        constraints: data.constraints || form.constraints,
      };
      setForm(updated);
      scheduleAutoSave(updated);
    } catch (err: any) {
      setError(err.message || "Failed to extract PDF content");
    } finally {
      setExtracting(false);
    }
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

      // Extract a default project name from the charter if none is provided
      let finalForm = { ...form };
      if (!form.projectName?.trim()) {
        const potentialName = newCharter.match(/^# (.*)/m)?.[1] || "Untitled Project";
        finalForm.projectName = potentialName;
        setForm(finalForm);
      }

      // Immediately save with AI results
      await doSave(finalForm, newCharter, newRisks, newWbs, newTasks);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function exportToPDF() {
    if (!charter) return;

    // Await marked.parse as it can behave asynchronously depending on extensions
    const charterHtml = await marked.parse(charter);

    const htmlString = `
      <div class="pdf-export-container">
        <div class="pdf-header">
          <div class="pdf-logo-wrapper">
            <img src="${pmxDark}" class="pdf-logo" />
          </div>
        </div>
        <div class="pdf-content">
          ${charterHtml}
        </div>
      </div>
    `;

    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `${form.projectName?.trim() || "Project_Charter"}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(htmlString).save();
  }

  const hasResults = !!charter;

  return (
    <div className="container">
      <header className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          className="back-arrow-btn"
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
          {uploadMode ? (
            /* ── Upload Panel ── */
            <div
              className={`pdf-drop-zone ${dragging ? "pdf-drop-active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type === "application/pdf") {
                  // Reuse the same handler via a synthetic-like approach
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  if (fileInputRef.current) {
                    fileInputRef.current.files = dt.files;
                    fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="pdf-drop-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="pdf-drop-text">Drag & drop your PDF here</p>
              <p className="pdf-drop-hint">or click to browse files</p>
              <span className="pdf-drop-badge">PDF • Max 10MB</span>
            </div>
          ) : (
            /* ── Normal Input Fields ── */
            <>
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
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            onChange={handlePdfUpload}
          />
          <div className="form-actions">
            <button
              className={`btn-outline pdf-upload-btn ${uploadMode ? "active" : ""}`}
              type="button"
              onClick={() => { if (uploadMode) setUploadMode(false); else setUploadMode(true); }}
              disabled={extracting || loading}
            >
              {extracting ? (
                <>Extracting<span className="dots"><span>.</span><span>.</span><span>.</span></span></>
              ) : uploadMode ? (
                "← Back to Form"
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Upload PDF
                </>
              )}
            </button>
            <button className="btn-primary" type="button" onClick={handleGenerate} disabled={loading || extracting || uploadMode}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>📄 Project Charter</h2>
              <button className="btn-outline" onClick={exportToPDF} style={{ padding: "4px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
            </div>
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

          <div className="section">
            <ProjectSchedule
              events={schedule}
              onChange={(updated) => {
                setSchedule(updated);
                scheduleAutoSave(form, charter, risks, wbs, aiTasks, updated, budgetItems);
              }}
            />
          </div>

          <div className="section">
            <BudgetTracker
              totalBudget={parseFloat(form.budget.replace(/,/g, "")) || 0}
              items={budgetItems}
              onChange={(updated) => {
                setBudgetItems(updated);
                scheduleAutoSave(form, charter, risks, wbs, aiTasks, schedule, updated);
              }}
            />
          </div>
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
