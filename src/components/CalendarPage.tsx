import React, { useState, useMemo } from "react";
import "../theme.css";
import "./CalendarPage.css";

/* ── helpers ────────────────────────────────────────────────────────────── */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

type CalEvent = {
    id: string;
    title: string;
    date: string;          // YYYY-MM-DD
    startTime: string;     // HH:MM or ""
    endTime: string;       // HH:MM or ""
    color: string;         // CSS variable name
};

/* ── component ──────────────────────────────────────────────────────────── */

const CalendarPage: React.FC = () => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newColor, setNewColor] = useState("accent");
    const [newStart, setNewStart] = useState("");
    const [newEnd, setNewEnd] = useState("");

    const colorOptions = [
        { key: "accent", label: "Green" },
        { key: "blue", label: "Blue" },
        { key: "yellow", label: "Yellow" },
        { key: "red", label: "Red" },
    ];

    // Build calendar grid
    const grid = useMemo(() => {
        const totalDays = daysInMonth(viewYear, viewMonth);
        const startDay = firstDayOfMonth(viewYear, viewMonth);
        const cells: (number | null)[] = [];

        for (let i = 0; i < startDay; i++) cells.push(null);
        for (let d = 1; d <= totalDays; d++) cells.push(d);
        // Pad to complete the last row
        while (cells.length % 7 !== 0) cells.push(null);

        return cells;
    }, [viewYear, viewMonth]);

    function dateKey(day: number) {
        return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function eventsOnDay(day: number) {
        return events.filter((e) => e.date === dateKey(day));
    }

    function isToday(day: number) {
        return (
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear()
        );
    }

    function handlePrev() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    }

    function handleNext() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    }

    function handleToday() {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
    }

    function openAddModal(day: number) {
        setSelectedDate(dateKey(day));
        setNewTitle("");
        setNewColor("accent");
        setNewStart("");
        setNewEnd("");
        setShowModal(true);
    }

    function handleAddEvent() {
        if (!newTitle.trim() || !selectedDate) return;
        const ev: CalEvent = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            date: selectedDate,
            startTime: newStart,
            endTime: newEnd,
            color: newColor,
        };
        setEvents((prev) => [...prev, ev]);
        setShowModal(false);
    }

    function handleDeleteEvent(id: string) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
    }

    const colorVar = (c: string) => {
        if (c === "accent") return "var(--accent)";
        return `var(--tag-${c}-text)`;
    };

    const colorBgVar = (c: string) => {
        if (c === "accent") return "var(--accent-dim)";
        return `var(--tag-${c})`;
    };

    function fmtTime(t: string) {
        if (!t) return "";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }

    /* ── selected day panel ──────────────────────────────────────────────── */
    const selectedDayNum = selectedDate
        ? parseInt(selectedDate.split("-")[2], 10)
        : null;
    const selectedDayEvents = selectedDate
        ? events.filter((e) => e.date === selectedDate).sort((a, b) => (a.startTime || "99").localeCompare(b.startTime || "99"))
        : [];

    return (
        <div className="container">
            <header className="page-header">
                <h1 className="page-title">Calendar</h1>
                <p className="page-subtitle">
                    Plan and track your schedule
                    <span className="dots"><span>.</span><span>.</span><span>.</span></span>
                </p>
            </header>

            <div className="cal-layout">
                {/* ── Calendar Grid ── */}
                <div className="cal-card">
                    {/* Month nav */}
                    <div className="cal-month-nav">
                        <div className="cal-nav-left">
                            <button className="cal-nav-btn" onClick={handlePrev}>‹</button>
                            <button className="cal-nav-btn" onClick={handleNext}>›</button>
                        </div>

                        <div className="cal-month-title">
                            <span className="cal-month-name">{MONTHS[viewMonth]}</span>
                            <span className="cal-year">{viewYear}</span>
                        </div>

                        <div className="cal-nav-right">
                            <button className="cal-today-btn" onClick={handleToday}>Today</button>
                        </div>
                    </div>

                    {/* Day headers */}
                    <div className="cal-grid cal-header-row">
                        {DAYS.map((d) => (
                            <div key={d} className="cal-day-header">{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="cal-grid cal-body">
                        {grid.map((day, i) => (
                            <div
                                key={i}
                                className={`cal-cell ${day ? "cal-cell-active" : "cal-cell-empty"} ${day && isToday(day) ? "cal-today" : ""} ${day && dateKey(day) === selectedDate ? "cal-selected" : ""}`}
                                onClick={() => { if (day) { setSelectedDate(dateKey(day)); } }}
                                onDoubleClick={() => { if (day) openAddModal(day); }}
                            >
                                {day && (
                                    <>
                                        <span className="cal-cell-num">{day}</span>
                                        <div className="cal-cell-dots">
                                            {eventsOnDay(day).slice(0, 3).map((ev) => (
                                                <span
                                                    key={ev.id}
                                                    className="cal-dot"
                                                    style={{ background: colorVar(ev.color) }}
                                                />
                                            ))}
                                            {eventsOnDay(day).length > 3 && (
                                                <span className="cal-dot-more">+{eventsOnDay(day).length - 3}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Day Detail Panel ── */}
                <div className="cal-detail-panel">
                    {selectedDate ? (
                        <>
                            <div className="cal-detail-header">
                                <h3 className="cal-detail-title">
                                    {MONTHS[viewMonth]} {selectedDayNum}, {viewYear}
                                </h3>
                                <button className="cal-add-btn" onClick={() => openAddModal(selectedDayNum!)}>
                                    + Add Event
                                </button>
                            </div>

                            {selectedDayEvents.length === 0 ? (
                                <div className="cal-empty-day">
                                    <span className="cal-empty-icon">📅</span>
                                    <p>No events scheduled</p>
                                    <p className="cal-empty-hint">Double-click a day or press <strong>+ Add Event</strong></p>
                                </div>
                            ) : (
                                <ul className="cal-event-list">
                                    {selectedDayEvents.map((ev) => (
                                        <li
                                            key={ev.id}
                                            className="cal-event-item"
                                            style={{
                                                borderLeftColor: colorVar(ev.color),
                                                background: colorBgVar(ev.color),
                                            }}
                                        >
                                            <div className="cal-event-info">
                                                {(ev.startTime || ev.endTime) && (
                                                    <span className="cal-event-time">{fmtTime(ev.startTime)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ""}</span>
                                                )}
                                                <span className="cal-event-title">{ev.title}</span>
                                            </div>
                                            <button
                                                className="cal-event-del"
                                                onClick={() => handleDeleteEvent(ev.id)}
                                                title="Delete event"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <div className="cal-empty-day">
                            <span className="cal-empty-icon">👈</span>
                            <p>Select a date to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add Event Modal ── */}
            {showModal && (
                <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="cal-modal-title">New Event</h3>
                        <p className="cal-modal-date">{selectedDate}</p>

                        <div className="field">
                            <input
                                id="calEventTitle"
                                className="floating-input"
                                type="text"
                                placeholder=" "
                                autoFocus
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddEvent(); }}
                            />
                            <label htmlFor="calEventTitle" className="floating-label">Event Title</label>
                        </div>

                        <div className="cal-time-row">
                            <div className="cal-time-field">
                                <label className="cal-time-label">Start</label>
                                <input type="time" className="cal-time-input" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                            </div>
                            <div className="cal-time-field">
                                <label className="cal-time-label">End</label>
                                <input type="time" className="cal-time-input" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                            </div>
                        </div>

                        <div className="cal-color-picker">
                            {colorOptions.map((opt) => (
                                <button
                                    key={opt.key}
                                    className={`cal-color-btn ${newColor === opt.key ? "active" : ""}`}
                                    style={{ background: colorVar(opt.key) }}
                                    onClick={() => setNewColor(opt.key)}
                                    title={opt.label}
                                />
                            ))}
                        </div>

                        <div className="cal-modal-actions">
                            <button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddEvent} disabled={!newTitle.trim()}>Add Event</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
