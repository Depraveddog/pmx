"use client";

import React, { useState, useEffect } from "react";
import "./KanbanBoard.css";

export type Task = { id: string | number; title: string; ownerEmail?: string };
export type ColumnId = "todo" | "inprogress" | "done";
export type BoardState = Record<ColumnId, Task[]>;
const COLS: ColumnId[] = ["todo", "inprogress", "done"];

interface KanbanBoardProps {
  board: BoardState;
  onChange: (board: BoardState) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, onChange }) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskOwnerEmail, setNewTaskOwnerEmail] = useState("");
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  const deleteTask = (col: ColumnId, id: string | number) => {
    onChange({ ...board, [col]: board[col].filter(t => String(t.id) !== String(id)) });
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const task: Task = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      ownerEmail: newTaskOwnerEmail.trim() || undefined
    };
    onChange({
      ...board,
      todo: [...board.todo, task]
    });
    setNewTaskTitle("");
    setNewTaskOwnerEmail("");
  };

  // Move a task left or right one column (for mobile buttons)
  const moveTask = (task: Task, fromCol: ColumnId, direction: -1 | 1) => {
    const idx = COLS.indexOf(fromCol) + direction;
    if (idx < 0 || idx >= COLS.length) return;
    const toCol = COLS[idx];
    const copy = structuredClone(board) as BoardState;
    copy[fromCol] = copy[fromCol].filter(t => String(t.id) !== String(task.id));
    copy[toCol].push(task);
    onChange(copy);
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
    const copy = structuredClone(board) as BoardState;
    // VERY IMPORTANT: filter by String(id) to avoid any type coercion issues with Date.now() or AI generated IDs
    copy[col] = copy[col].filter(t => String(t.id) !== String(task.id));
    copy[newCol].push(task);
    onChange(copy);
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
        <div className="add-task-inputs">
          <input
            className="add-task-input title-input"
            placeholder="Add a new task…"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
          />
          <input
            className="add-task-input email-input"
            placeholder="Owner Email (optional)"
            type="email"
            value={newTaskOwnerEmail}
            onChange={e => setNewTaskOwnerEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
          />
        </div>
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
              <span className="kanban-count">{board[col].length}</span>
            </h3>

            {board[col].map((task, i) => (
              <div
                key={`${task.id}-${i}`}
                className="kanban-card"
                draggable
                onDragStart={e => handleDragStart(e, task, col)}
              >
                <div className="kanban-card-content">
                  <span className="kanban-card-text">{task.title}</span>
                  {task.ownerEmail && (
                    <span className="kanban-card-owner" title="Owner Email">
                      👤 {task.ownerEmail}
                    </span>
                  )}
                </div>
                <div className="kanban-card-actions">
                  {task.ownerEmail && (
                    <a
                      href={`mailto:${task.ownerEmail}?subject=${encodeURIComponent(`Task Assigned: ${task.title}`)}&body=${encodeURIComponent(`You have been assigned a new task:\n\nTitle: ${task.title}\nStatus: ${label}\n\nPlease update the Kanban board when you make progress.`)}`}
                      className="email-btn"
                      title="Send Task via Email"
                      onClick={e => e.stopPropagation()}
                    >
                      ✉️
                    </a>
                  )}
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
