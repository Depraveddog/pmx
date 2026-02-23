"use client";
import "../theme.css";
import React, { useState, useEffect } from "react";
import type { WbsPhase } from "./types";

type AddedSet = Set<string>;

// Static fallback phases when no AI data exists
const STATIC_PHASES: WbsPhase[] = [
  { id: "1", name: "Initiation", startWeek: 0, durationWeeks: 2, items: ["1.1 Gather high-level business need and pain points", "1.2 Define project objectives & success criteria", "1.3 Identify key stakeholders and sponsor", "1.4 Draft initial project charter outline"] },
  { id: "2", name: "Planning", startWeek: 1, durationWeeks: 3, items: ["2.1 Refine scope and assumptions", "2.2 Break down work into phases & tasks (WBS)", "2.3 Define schedule milestones & dependencies", "2.4 Identify risks and draft risk responses"] },
  { id: "3", name: "Execution", startWeek: 3, durationWeeks: 6, items: ["3.1 Configure PMX features & integrations", "3.2 Develop project templates (charter, WBS, risks)", "3.3 Run pilot with selected users", "3.4 Collect feedback and prioritise improvements"] },
  { id: "4", name: "Monitoring & Control", startWeek: 3, durationWeeks: 6, items: ["4.1 Track progress vs. schedule & scope", "4.2 Monitor risks, issues, and change requests", "4.3 Update stakeholders with status reports"] },
  { id: "5", name: "Closure", startWeek: 9, durationWeeks: 2, items: ["5.1 Formal handover & acceptance", "5.2 Capture lessons learned", "5.3 Archive project artefacts in PMX"] },
];

interface WbsSectionProps {
  phases?: WbsPhase[];
  onAddToKanban?: (title: string) => void;
  /** When true, renders without its own container/header (embedded inside another page) */
  embedded?: boolean;
}

function WbsSection({ phases, onAddToKanban, embedded = false }: WbsSectionProps) {
  const activePhrases = phases && phases.length > 0 ? phases : STATIC_PHASES;

  const [added, setAdded] = useState<AddedSet>(() => {
    try {
      const saved = localStorage.getItem("pmx-wbs-added");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem("pmx-wbs-added", JSON.stringify(Array.from(added)));
  }, [added]);

  // Reset added state when AI generates new phases
  useEffect(() => {
    if (phases && phases.length > 0) {
      setAdded(new Set());
      localStorage.removeItem("pmx-wbs-added");
    }
  }, [phases]);

  const handleAdd = (item: string) => {
    if (added.has(item)) return;
    setAdded(prev => new Set(prev).add(item));
    onAddToKanban?.(item);
  };

  const content = (
    <div className="list-box wbs-box">
      <div className="wbs-header">
        <h2 className="wbs-title">Work Breakdown Structure</h2>
        <p className="wbs-subtitle">
          {phases && phases.length > 0
            ? "AI-generated phases — hover a task and click + Add to send it to Kanban"
            : "Default phases — generate a plan to get AI-tailored phases"}
        </p>
      </div>
      <div className="wbs-grid">
        {activePhrases.map((phase) => (
          <div key={phase.id} className="wbs-phase">
            <div className="wbs-phase-badge"><span>{phase.id}</span></div>
            <h3 className="wbs-phase-title">{phase.name}</h3>
            <ul className="wbs-task-list">
              {phase.items.map((item) => (
                <li key={item}>
                  <span className="wbs-task-text">{item}</span>
                  <button
                    className={`wbs-add-btn ${added.has(item) ? "added" : ""}`}
                    onClick={() => handleAdd(item)}
                    disabled={added.has(item)}
                  >
                    {added.has(item) ? "✓" : "+ Add"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Work Breakdown Structure</h1>
        <p className="page-subtitle">Hover any task and click "+ Add" to send it to the Kanban board</p>
      </header>
      {content}
    </div>
  );
}

export default WbsSection;
