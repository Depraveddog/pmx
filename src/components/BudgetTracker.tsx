import React, { useState } from "react";
import "./BudgetTracker.css";

/* ── types ── */

export type BudgetItem = {
    id: string;
    category: string;
    description: string;
    planned: number;
    actual: number;
};

interface Props {
    totalBudget: number;       // from the project form
    items: BudgetItem[];
    onChange: (items: BudgetItem[]) => void;
}

/* ── helpers ── */

function fmtCurrency(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(part: number, whole: number) {
    if (!whole) return 0;
    return Math.min(Math.round((part / whole) * 100), 100);
}

const CATEGORIES = [
    "Labor", "Materials", "Equipment", "Software", "Consulting",
    "Travel", "Training", "Contingency", "Other",
];

/* ── component ── */

const BudgetTracker: React.FC<Props> = ({ totalBudget, items, onChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formCat, setFormCat] = useState("Labor");
    const [formDesc, setFormDesc] = useState("");
    const [formPlanned, setFormPlanned] = useState("");
    const [formActual, setFormActual] = useState("");

    const totalPlanned = items.reduce((s, i) => s + i.planned, 0);
    const totalActual = items.reduce((s, i) => s + i.actual, 0);
    const remaining = totalBudget - totalActual;
    const variance = totalPlanned - totalActual;

    function openAdd() {
        setEditId(null);
        setFormCat("Labor");
        setFormDesc("");
        setFormPlanned("");
        setFormActual("");
        setShowForm(true);
    }

    function openEdit(item: BudgetItem) {
        setEditId(item.id);
        setFormCat(item.category);
        setFormDesc(item.description);
        setFormPlanned(String(item.planned));
        setFormActual(String(item.actual));
        setShowForm(true);
    }

    function handleSave() {
        const planned = parseFloat(formPlanned.replace(/,/g, "")) || 0;
        const actual = parseFloat(formActual.replace(/,/g, "")) || 0;
        if (!formDesc.trim()) return;

        if (editId) {
            onChange(items.map((i) =>
                i.id === editId ? { ...i, category: formCat, description: formDesc.trim(), planned, actual } : i
            ));
        } else {
            const newItem: BudgetItem = { id: Date.now().toString(), category: formCat, description: formDesc.trim(), planned, actual };
            onChange([...items, newItem]);
        }
        setShowForm(false);
    }

    function handleDelete(id: string) {
        onChange(items.filter((i) => i.id !== id));
    }

    // Aggregate by category for the chart
    const catTotals = items.reduce<Record<string, { planned: number; actual: number }>>((acc, i) => {
        if (!acc[i.category]) acc[i.category] = { planned: 0, actual: 0 };
        acc[i.category].planned += i.planned;
        acc[i.category].actual += i.actual;
        return acc;
    }, {});

    return (
        <div className="bt-box list-box">
            <div className="bt-header">
                <div>
                    <h2 className="bt-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 6 }}>
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        Budget Tracker
                    </h2>
                    <p className="bt-subtitle">Track planned vs actual spending</p>
                </div>
                <button className="ps-add-btn" onClick={openAdd}>+ Add Item</button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="bt-summary">
                <div className="bt-card">
                    <span className="bt-card-label">Total Budget</span>
                    <span className="bt-card-value">${fmtCurrency(totalBudget)}</span>
                </div>
                <div className="bt-card">
                    <span className="bt-card-label">Planned</span>
                    <span className="bt-card-value">${fmtCurrency(totalPlanned)}</span>
                    <div className="bt-bar"><div className="bt-bar-fill bt-bar-planned" style={{ width: `${pct(totalPlanned, totalBudget)}%` }} /></div>
                </div>
                <div className="bt-card">
                    <span className="bt-card-label">Actual Spent</span>
                    <span className="bt-card-value bt-val-actual">${fmtCurrency(totalActual)}</span>
                    <div className="bt-bar"><div className="bt-bar-fill bt-bar-actual" style={{ width: `${pct(totalActual, totalBudget)}%` }} /></div>
                </div>
                <div className="bt-card">
                    <span className="bt-card-label">Remaining</span>
                    <span className={`bt-card-value ${remaining < 0 ? "bt-val-over" : "bt-val-ok"}`}>${fmtCurrency(remaining)}</span>
                </div>
                <div className="bt-card">
                    <span className="bt-card-label">Variance</span>
                    <span className={`bt-card-value ${variance < 0 ? "bt-val-over" : "bt-val-ok"}`}>{variance >= 0 ? "+" : ""}${fmtCurrency(variance)}</span>
                </div>
            </div>

            {/* ── Category Breakdown ── */}
            {Object.keys(catTotals).length > 0 && (
                <div className="bt-cats">
                    <h3 className="bt-section-title">By Category</h3>
                    <div className="bt-cat-list">
                        {Object.entries(catTotals).map(([cat, vals]) => (
                            <div key={cat} className="bt-cat-row">
                                <span className="bt-cat-name">{cat}</span>
                                <div className="bt-cat-bars">
                                    <div className="bt-bar bt-bar-wide">
                                        <div className="bt-bar-fill bt-bar-planned" style={{ width: `${pct(vals.planned, totalBudget)}%` }} />
                                        <div className="bt-bar-fill bt-bar-actual" style={{ width: `${pct(vals.actual, totalBudget)}%` }} />
                                    </div>
                                </div>
                                <span className="bt-cat-amount">${fmtCurrency(vals.actual)} / ${fmtCurrency(vals.planned)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Items Table ── */}
            {items.length > 0 && (
                <div className="bt-table-wrap">
                    <table className="bt-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Planned</th>
                                <th>Actual</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const diff = item.planned - item.actual;
                                const statusClass = diff < 0 ? "bt-over" : diff === 0 ? "bt-on" : "bt-under";
                                const statusLabel = diff < 0 ? "Over" : diff === 0 ? "On Budget" : "Under";
                                return (
                                    <tr key={item.id} className="bt-row" onClick={() => openEdit(item)}>
                                        <td><span className="bt-cat-tag">{item.category}</span></td>
                                        <td>{item.description}</td>
                                        <td className="bt-num">${fmtCurrency(item.planned)}</td>
                                        <td className="bt-num">${fmtCurrency(item.actual)}</td>
                                        <td><span className={`bt-status ${statusClass}`}>{statusLabel}</span></td>
                                        <td>
                                            <button className="ps-ev-del" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} title="Delete">×</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {items.length === 0 && (
                <p className="ps-empty">No budget items yet — click <strong>+ Add Item</strong> to start tracking</p>
            )}

            {/* ── Add/Edit Modal ── */}
            {showForm && (
                <div className="cal-modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="cal-modal-title">{editId ? "Edit" : "Add"} Budget Item</h3>
                        <div className="field">
                            <select className="floating-input" style={{ appearance: "auto", paddingTop: "8px" }} value={formCat} onChange={(e) => setFormCat(e.target.value)}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <label className="floating-label" style={{ top: "-10px", fontSize: "11px" }}>Category</label>
                        </div>
                        <div className="field">
                            <input className="floating-input" type="text" placeholder=" " autoFocus value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                            <label className="floating-label">Description</label>
                        </div>
                        <div className="bt-modal-row">
                            <div className="field">
                                <input className="floating-input" type="text" placeholder=" " value={formPlanned}
                                    onChange={(e) => setFormPlanned(e.target.value.replace(/[^\d.,]/g, ""))} />
                                <label className="floating-label">Planned ($)</label>
                            </div>
                            <div className="field">
                                <input className="floating-input" type="text" placeholder=" " value={formActual}
                                    onChange={(e) => setFormActual(e.target.value.replace(/[^\d.,]/g, ""))} />
                                <label className="floating-label">Actual ($)</label>
                            </div>
                        </div>
                        <div className="cal-modal-actions">
                            <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={!formDesc.trim()}>
                                {editId ? "Update" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetTracker;
