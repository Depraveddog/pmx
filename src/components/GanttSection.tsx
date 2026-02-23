import React from "react";
import "./GanttSection.css";
import type { WbsPhase } from "./types";

const PHASE_COLORS = [
    "var(--tag-blue-text)",
    "var(--accent)",
    "var(--tag-green-text)",
    "var(--tag-yellow-text)",
    "var(--tag-red-text)",
    "#c084fc",
    "#f97316",
    "#22d3ee",
];

// Static fallback phases — all start at week 1 (startWeek: 0 = week 1 offset)
const BASE_STATIC_PHASES: WbsPhase[] = [
    { id: "1", name: "Prerequisite Gathering", startWeek: 0, durationWeeks: 2, items: [] },
    { id: "2", name: "Design Workshops", startWeek: 2, durationWeeks: 2, items: [] },
    { id: "3", name: "Initiation", startWeek: 4, durationWeeks: 1, items: [] },
    { id: "4", name: "Planning", startWeek: 5, durationWeeks: 2, items: [] },
    { id: "5", name: "Execution", startWeek: 7, durationWeeks: 4, items: [] },
    { id: "6", name: "Closure", startWeek: 11, durationWeeks: 1, items: [] },
];

const INFRA_PHASE: WbsPhase = {
    id: "infra-lead",
    name: "Equipment Lead Time",
    startWeek: 2,
    durationWeeks: 4,
    items: [],
};

interface GanttSectionProps {
    phases?: WbsPhase[];
    totalWeeks?: number;
    embedded?: boolean;
    projectType?: string;
}

const GanttSection: React.FC<GanttSectionProps> = ({
    phases,
    totalWeeks,
    embedded = false,
    projectType = "",
}) => {
    // Build static phases: optionally insert Equipment Lead Time for infrastructure projects
    const isInfra = projectType.toLowerCase().includes("infra");
    const staticPhases: WbsPhase[] = isInfra
        ? [
            BASE_STATIC_PHASES[0],
            BASE_STATIC_PHASES[1],
            INFRA_PHASE,
            ...BASE_STATIC_PHASES.slice(2).map((p, i) => ({
                ...p,
                id: String(Number(p.id) + 1),
                startWeek: p.startWeek + 2, // shift down to make room
            })),
        ]
        : BASE_STATIC_PHASES;

    const activePhases = phases && phases.length > 0 ? phases : staticPhases;

    const maxWeek = activePhases.reduce((m, p) => Math.max(m, p.startWeek + p.durationWeeks), 0);
    const total = totalWeeks ? Math.max(totalWeeks, maxWeek) : maxWeek || 12;
    const weeks = Array.from({ length: total }, (_, i) => i + 1);

    const chart = (
        <div className="list-box gantt-box">
            <div className="gantt-chart">
                {/* Header */}
                <div className="gantt-header">
                    <div className="gantt-label-col">Phase</div>
                    <div className="gantt-timeline-col">
                        {weeks.map((w) => (
                            <div key={w} className="gantt-week-label">W{w}</div>
                        ))}
                    </div>
                </div>

                {/* Phase rows */}
                {activePhases.map((phase, i) => {
                    const leftPct = (phase.startWeek / total) * 100;
                    const widthPct = (phase.durationWeeks / total) * 100;
                    const color = PHASE_COLORS[i % PHASE_COLORS.length];

                    return (
                        <div key={phase.id} className="gantt-row">
                            <div className="gantt-label-col">
                                <span className="gantt-phase-id">{i + 1}</span>
                                <span className="gantt-phase-name">{phase.name}</span>
                            </div>
                            <div className="gantt-timeline-col">
                                {weeks.map((w) => <div key={w} className="gantt-cell" />)}
                                <div
                                    className="gantt-bar"
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
                                >
                                    <div className="gantt-bar-fill" />
                                    <span className="gantt-bar-label">{phase.durationWeeks}w</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="gantt-legend">
                {activePhases.map((phase, i) => (
                    <div key={phase.id} className="gantt-legend-item">
                        <span className="gantt-legend-dot" style={{ background: PHASE_COLORS[i % PHASE_COLORS.length] }} />
                        <span>{phase.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (embedded) return chart;

    return (
        <div className="container">
            <header className="page-header">
                <h1 className="page-title">Project Timeline</h1>
                <p className="page-subtitle">
                    {phases && phases.length > 0
                        ? `AI-generated timeline across ${total} weeks`
                        : "Default Gantt view — generate a plan to get your real timeline"}
                </p>
            </header>
            {chart}
        </div>
    );
};

export default GanttSection;
