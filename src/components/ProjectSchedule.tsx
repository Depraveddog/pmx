import React, { useState, useMemo } from "react";
import "./ProjectSchedule.css";

/* ── types ──────────────────────────────────────────────────────────────── */

export type ScheduleEvent = {
    id: string;
    title: string;
    date: string;       // YYYY-MM-DD
    color: string;      // "accent" | "blue" | "yellow" | "red"
};

/* ── helpers ────────────────────────────────────────────────────────────── */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function pad(n: number) { return String(n).padStart(2, "0"); }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

const colorVar = (c: string) => c === "accent" ? "var(--accent)" : `var(--tag-${c}-text)`;
const colorBgVar = (c: string) => c === "accent" ? "var(--accent-dim)" : `var(--tag-${c})`;

/* ── props ──────────────────────────────────────────────────────────────── */

interface Props {
    events: ScheduleEvent[];
    onChange: (events: ScheduleEvent[]) => void;
}

/* ── component ──────────────────────────────────────────────────────────── */

const ProjectSchedule: React.FC<Props> = ({ events, onChange }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newColor, setNewColor] = useState("accent");

    const colorOptions = [
        { key: "accent", label: "Green" },
        { key: "blue", label: "Blue" },
        { key: "yellow", label: "Yellow" },
        { key: "red", label: "Red" },
    ];

    const grid = useMemo(() => {
        const total = daysInMonth(viewYear, viewMonth);
        const start = firstDay(viewYear, viewMonth);
        const cells: (number | null)[] = [];
        for (let i = 0; i < start; i++) cells.push(null);
        for (let d = 1; d <= total; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [viewYear, viewMonth]);

    const dk = (day: number) => dateKey(viewYear, viewMonth, day);
    const eventsOn = (day: number) => events.filter((e) => e.date === dk(day));
    const isToday = (day: number) =>
        day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

    function handlePrev() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    }
    function handleNext() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    }
    function handleToday() { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }

    function openAdd(day: number) {
        setSelectedDate(dk(day));
        setNewTitle("");
        setNewColor("accent");
        setShowModal(true);
    }

    function handleAdd() {
        if (!newTitle.trim() || !selectedDate) return;
        const ev: ScheduleEvent = { id: Date.now().toString(), title: newTitle.trim(), date: selectedDate, color: newColor };
        onChange([...events, ev]);
        setShowModal(false);
    }

    function handleDelete(id: string) {
        onChange(events.filter((e) => e.id !== id));
    }

    const selDayNum = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : null;
    const selEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : [];

    return (
        <div className="ps-box list-box">
            <div className="ps-header-row">
                <div>
                    <h2 className="ps-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 6 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Project Schedule
                    </h2>
                    <p className="ps-subtitle">Schedule milestones, meetings, and deadlines</p>
                </div>
            </div>

            <div className="ps-layout">
                {/* ── Calendar Grid ── */}
                <div className="ps-cal">
                    <div className="ps-nav">
                        <button className="ps-nav-btn" onClick={handlePrev}>‹</button>
                        <span className="ps-month">{MONTHS[viewMonth]} <span className="ps-year">{viewYear}</span></span>
                        <button className="ps-nav-btn" onClick={handleNext}>›</button>
                        <button className="ps-today-btn" onClick={handleToday}>Today</button>
                    </div>

                    <div className="ps-grid ps-day-headers">
                        {DAYS.map((d) => <div key={d} className="ps-dh">{d}</div>)}
                    </div>

                    <div className="ps-grid ps-body">
                        {grid.map((day, i) => (
                            <div
                                key={i}
                                className={`ps-cell ${day ? "ps-cell-fill" : ""} ${day && isToday(day) ? "ps-cell-today" : ""} ${day && dk(day) === selectedDate ? "ps-cell-sel" : ""}`}
                                onClick={() => { if (day) setSelectedDate(dk(day)); }}
                                onDoubleClick={() => { if (day) openAdd(day); }}
                            >
                                {day && (
                                    <>
                                        <span className="ps-cell-num">{day}</span>
                                        <div className="ps-cell-dots">
                                            {eventsOn(day).slice(0, 3).map((ev) => (
                                                <span key={ev.id} className="ps-dot" style={{ background: colorVar(ev.color) }} />
                                            ))}
                                            {eventsOn(day).length > 3 && <span className="ps-dot-more">+{eventsOn(day).length - 3}</span>}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Detail Panel ── */}
                <div className="ps-detail">
                    {selectedDate ? (
                        <>
                            <div className="ps-detail-head">
                                <h3 className="ps-detail-date">{MONTHS[viewMonth]} {selDayNum}, {viewYear}</h3>
                                <button className="ps-add-btn" onClick={() => openAdd(selDayNum!)}>+ Add</button>
                            </div>
                            {selEvents.length === 0 ? (
                                <p className="ps-empty">No events — double-click or press <strong>+ Add</strong></p>
                            ) : (
                                <ul className="ps-ev-list">
                                    {selEvents.map((ev) => (
                                        <li key={ev.id} className="ps-ev-item" style={{ borderLeftColor: colorVar(ev.color), background: colorBgVar(ev.color) }}>
                                            <span className="ps-ev-title">{ev.title}</span>
                                            <button className="ps-ev-del" onClick={() => handleDelete(ev.id)} title="Delete">×</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="ps-empty">Select a date to view or add events</p>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {showModal && (
                <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="cal-modal-title">New Event</h3>
                        <p className="cal-modal-date">{selectedDate}</p>
                        <div className="field">
                            <input id="psEvTitle" className="floating-input" type="text" placeholder=" " autoFocus
                                value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
                            <label htmlFor="psEvTitle" className="floating-label">Event Title</label>
                        </div>
                        <div className="cal-color-picker">
                            {colorOptions.map((opt) => (
                                <button key={opt.key} className={`cal-color-btn ${newColor === opt.key ? "active" : ""}`}
                                    style={{ background: colorVar(opt.key) }} onClick={() => setNewColor(opt.key)} title={opt.label} />
                            ))}
                        </div>
                        <div className="cal-modal-actions">
                            <button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAdd} disabled={!newTitle.trim()}>Add Event</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSchedule;
