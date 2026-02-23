"use client";

import React, { useState, useEffect } from "react";
import "./KanbanBoard.css";

type Task = { id: number; title: string };
type ColumnId = "todo" | "inprogress" | "done";
type BoardState = Record<ColumnId, Task[]>;
const COLS: ColumnId[] = ["todo", "inprogress", "done"];

const initialTasks: BoardState = {
  todo: [
    { id: 1, title: "Define project scope" },
    { id: 2, title: "Draft project charter" },
  ],
  inprogress: [{ id: 3, title: "Stakeholder interviews" }],
  done: [{ id: 4, title: "Initial requirements gathered" }],
};

interface KanbanBoardProps {
  externalTasks?: Task[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ externalTasks = [] }) => {
  const [tasks, setTasks] = useState<BoardState>(() => {
    try {
      const saved = localStorage.getItem("pmx-kanban");
      return saved ? JSON.parse(saved) : initialTasks;
    } catch { return initialTasks; }
  });
  const [nextId, setNextId] = useState(() => {
    try {
      const saved = localStorage.getItem("pmx-kanban");
      if (saved) {
        const b: BoardState = JSON.parse(saved);
        return Math.max(0, ...[...b.todo, ...b.inprogress, ...b.done].map(t => t.id)) + 1;
      }
    } catch { }
    return 5;
  });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  useEffect(() => {
    localStorage.setItem("pmx-kanban", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!externalTasks.length) return;
    setTasks(prev => {
      const existing = new Set([...prev.todo, ...prev.inprogress, ...prev.done].map(t => t.title));
      const newOnes = externalTasks.filter(t => !existing.has(t.title));
      if (!newOnes.length) return prev;
      return { ...prev, todo: [...prev.todo, ...newOnes] };
    });
    setNextId(prev => prev + externalTasks.length);
  }, [externalTasks]);

  const deleteTask = (col: ColumnId, id: number) =>
    setTasks(prev => ({ ...prev, [col]: prev[col].filter(t => t.id !== id) }));

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    setTasks(prev => ({ ...prev, todo: [...prev.todo, { id: nextId, title }] }));
    setNextId(prev => prev + 1);
    setNewTaskTitle("");
  };

  // Move a task left or right one column (for mobile buttons)
  const moveTask = (task: Task, fromCol: ColumnId, direction: -1 | 1) => {
    const idx = COLS.indexOf(fromCol) + direction;
    if (idx < 0 || idx >= COLS.length) return;
    const toCol = COLS[idx];
    setTasks(prev => {
      const copy = structuredClone(prev) as BoardState;
      copy[fromCol] = copy[fromCol].filter(t => t.id !== task.id);
      copy[toCol].push(task);
      return copy;
    });
  };

  // Desktop drag
  const handleDragStart = (e: React.DragEvent, task: Task, col: ColumnId) =>
    e.dataTransfer.setData("task", JSON.stringify({ task, col }));

  const handleDrop = (e: React.DragEvent, newCol: ColumnId) => {
    e.preventDefault();
    setDragOverCol(null);
    const data = e.dataTransfer.getData("task");
    if (!data) return;
    const { task, col } = JSON.parse(data) as { task: Task; col: ColumnId };
    if (col === newCol) return;
    setTasks(prev => {
      const copy = structuredClone(prev) as BoardState;
      copy[col] = copy[col].filter(t => t.id !== task.id);
      copy[newCol].push(task);
      return copy;
    });
  };

  const colMeta: { id: ColumnId; label: string }[] = [
    { id: "todo", label: "To Do" },
    { id: "inprogress", label: "In Progress" },
    { id: "done", label: "Done" },
  ];

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Kanban Board</h1>
        <p className="page-subtitle">Drag tasks between columns (or use arrows on mobile)</p>
      </header>

      <div className="add-task-container">
        <input
          className="add-task-input"
          placeholder="Add a new task… (Enter to add)"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
        />
        <button className="add-task-btn" onClick={addTask}>+ Add Task</button>
      </div>

      <div className="kanban">
        {colMeta.map(({ id: col, label }, colIdx) => (
          <div
            key={col}
            data-col={col}
            className={`kanban-column col-${col} ${dragOverCol === col ? "drag-over" : ""}`}
            onDrop={e => handleDrop(e, col)}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
            onDragLeave={() => setDragOverCol(null)}
          >
            <h3 className="kanban-title">
              <span className="kanban-title-dot" />
              {label}
              <span className="kanban-count">{tasks[col].length}</span>
            </h3>

            {tasks[col].map(task => (
              <div
                key={task.id}
                className="kanban-card"
                draggable
                onDragStart={e => handleDragStart(e, task, col)}
              >
                <span className="kanban-card-text">{task.title}</span>
                <div className="kanban-card-actions">
                  {/* Mobile move buttons — hidden on desktop via CSS */}
                  {colIdx > 0 && (
                    <button
                      className="kanban-move-btn"
                      onClick={() => moveTask(task, col, -1)}
                      title="Move left"
                    >←</button>
                  )}
                  {colIdx < COLS.length - 1 && (
                    <button
                      className="kanban-move-btn kanban-move-right"
                      onClick={() => moveTask(task, col, 1)}
                      title="Move right"
                    >→</button>
                  )}
                  <button
                    className="delete-btn"
                    onClick={e => { e.stopPropagation(); deleteTask(col, task.id); }}
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
