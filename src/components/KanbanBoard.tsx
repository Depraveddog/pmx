"use client";

import React, { useState, useEffect, useRef } from "react";
import "./KanbanBoard.css";

type Task = { id: number; title: string };
type ColumnId = "todo" | "inprogress" | "done";
type BoardState = Record<ColumnId, Task[]>;

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
    } catch {
      return initialTasks;
    }
  });
  const [nextId, setNextId] = useState(() => {
    try {
      const saved = localStorage.getItem("pmx-kanban");
      if (saved) {
        const b: BoardState = JSON.parse(saved);
        const max = Math.max(0, ...[...b.todo, ...b.inprogress, ...b.done].map(t => t.id));
        return max + 1;
      }
    } catch { }
    return 5;
  });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  // Touch drag state
  const touchDragRef = useRef<{ task: Task; col: ColumnId } | null>(null);
  const [touchDragging, setTouchDragging] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("pmx-kanban", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!externalTasks.length) return;
    setTasks(prev => {
      const existingTitles = new Set([...prev.todo, ...prev.inprogress, ...prev.done].map(t => t.title));
      const newOnes = externalTasks.filter(t => !existingTitles.has(t.title));
      if (!newOnes.length) return prev;
      return { ...prev, todo: [...prev.todo, ...newOnes] };
    });
    setNextId(prev => prev + externalTasks.length);
  }, [externalTasks]);

  const deleteTask = (column: ColumnId, id: number) => {
    setTasks(prev => ({ ...prev, [column]: prev[column].filter(task => task.id !== id) }));
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    setTasks(prev => ({ ...prev, todo: [...prev.todo, { id: nextId, title }] }));
    setNextId(prev => prev + 1);
    setNewTaskTitle("");
  };

  // ── Desktop drag handlers ──
  const handleDragStart = (e: React.DragEvent, task: Task, column: ColumnId) => {
    e.dataTransfer.setData("task", JSON.stringify({ task, column }));
  };

  const handleDrop = (e: React.DragEvent, newColumn: ColumnId) => {
    e.preventDefault();
    setDragOverCol(null);
    const data = e.dataTransfer.getData("task");
    if (!data) return;
    const { task, column } = JSON.parse(data) as { task: Task; column: ColumnId };
    if (column === newColumn) return;
    setTasks(prev => {
      const copy = structuredClone(prev) as BoardState;
      copy[column] = copy[column].filter(t => t.id !== task.id);
      copy[newColumn].push(task);
      return copy;
    });
  };

  // ── Mobile touch drag handlers ──
  const handleTouchStart = (task: Task, col: ColumnId) => {
    touchDragRef.current = { task, col };
    setTouchDragging(task.id);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const drag = touchDragRef.current;
    if (!drag) return;

    const touch = e.changedTouches[0];
    // Find which column element is under the finger
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const colEl = el?.closest("[data-col]") as HTMLElement | null;
    const newCol = colEl?.dataset.col as ColumnId | undefined;

    if (newCol && newCol !== drag.col) {
      setTasks(prev => {
        const copy = structuredClone(prev) as BoardState;
        copy[drag.col] = copy[drag.col].filter(t => t.id !== drag.task.id);
        copy[newCol].push(drag.task);
        return copy;
      });
    }

    touchDragRef.current = null;
    setTouchDragging(null);
    setDragOverCol(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragRef.current) return;
    // Highlight the column under finger
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const colEl = el?.closest("[data-col]") as HTMLElement | null;
    const col = colEl?.dataset.col as ColumnId | undefined;
    setDragOverCol(col ?? null);
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
        <p className="page-subtitle">Drag and drop tasks between columns</p>
      </header>

      <div className="add-task-container">
        <input
          className="add-task-input"
          placeholder="Add a new task… (Enter to add)"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button className="add-task-btn" onClick={addTask}>+ Add Task</button>
      </div>

      <div
        className="kanban"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {colMeta.map(({ id: col, label }) => (
          <div
            key={col}
            data-col={col}
            className={`kanban-column col-${col} ${dragOverCol === col ? "drag-over" : ""}`}
            onDrop={(e) => handleDrop(e, col)}
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
                className={`kanban-card ${touchDragging === task.id ? "touch-dragging" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task, col)}
                onTouchStart={() => handleTouchStart(task, col)}
              >
                <span>{task.title}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); deleteTask(col, task.id); }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
