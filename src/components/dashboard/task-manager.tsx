"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dueDate: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string | null } | null;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  LOW:    { label: "Low",    color: "bg-gray-100 text-gray-600",     icon: null },
  MEDIUM: { label: "Med",    color: "bg-blue-100 text-blue-700",     icon: null },
  HIGH:   { label: "High",   color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700",       icon: AlertTriangle },
};

const RECURRENCE_LABELS: Record<Task["recurrence"], string> = {
  NONE:     "Does not repeat",
  DAILY:    "Every day",
  WEEKLY:   "Every week",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY:  "Every month",
};

const STATUS_ICON = {
  TODO:        Circle,
  IN_PROGRESS: Clock,
  DONE:        CheckCircle2,
};

function formatDueDate(iso: string): { label: string; overdue: boolean } {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Overdue (${Math.abs(diff)}d)`, overdue: true };
  if (diff === 0) return { label: "Due today", overdue: false };
  if (diff === 1) return { label: "Due tomorrow", overdue: false };
  if (diff <= 6) return { label: `Due in ${diff}d`, overdue: false };
  return {
    label: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    overdue: false,
  };
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<Task["recurrence"]>("NONE");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS" | "DONE">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");

  const fetchTasks = useCallback(async () => {
    const url = filter === "ALL" ? "/api/tasks" : `/api/tasks?status=${filter}`;
    const res = await fetch(url);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDueDate || null,
        recurrence: newRecurrence,
      }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setNewPriority("MEDIUM");
      setNewDueDate("");
      setNewRecurrence("NONE");
    }
    setAdding(false);
  }

  async function updateTask(id: string, data: Partial<Task>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function cycleStatus(task: Task) {
    const next =
      task.status === "TODO"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
        ? "DONE"
        : "TODO";
    updateTask(task.id, { status: next });
  }

  const counts = {
    ALL:         tasks.length,
    TODO:        tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    DONE:        tasks.filter((t) => t.status === "DONE").length,
  };

  const filtered =
    filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-2">
        {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === s
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s === "ALL"
              ? "All"
              : s === "TODO"
              ? "To Do"
              : s === "IN_PROGRESS"
              ? "In Progress"
              : "Done"}
            <span className="ml-1 text-[10px]">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Add task form */}
      <form onSubmit={addTask} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1"
          />
          <select
            value={newPriority}
            onChange={(e) =>
              setNewPriority(e.target.value as Task["priority"])
            }
            className="rounded-lg border border-gray-200 px-2 text-xs text-gray-600"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Med</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <Button
            type="submit"
            size="sm"
            disabled={adding || !newTitle.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Due date + recurrence row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <div className="relative flex-1">
            <RefreshCw className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <select
              value={newRecurrence}
              onChange={(e) =>
                setNewRecurrence(e.target.value as Task["recurrence"])
              }
              className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-1.5 text-xs text-gray-600 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Every day</option>
              <option value="WEEKLY">Every week</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Every month</option>
            </select>
          </div>
        </div>
      </form>

      {/* Task list */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          {filter === "ALL" ? "No tasks yet" : "No tasks in this category"}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task) => {
            const StatusIcon = STATUS_ICON[task.status];
            const prio = PRIORITY_CONFIG[task.priority];
            const isExpanded = expandedId === task.id;
            const dueMeta = task.dueDate ? formatDueDate(task.dueDate) : null;

            return (
              <div key={task.id} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => cycleStatus(task)}
                    className={`shrink-0 ${
                      task.status === "DONE"
                        ? "text-green-500"
                        : task.status === "IN_PROGRESS"
                        ? "text-indigo-500"
                        : "text-gray-300 hover:text-gray-400"
                    }`}
                    title="Click to change status"
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-sm truncate ${
                        task.status === "DONE"
                          ? "line-through text-gray-400"
                          : "text-gray-800"
                      }`}
                    >
                      {task.title}
                    </span>
                    {dueMeta && (
                      <span
                        className={`text-[10px] ${
                          dueMeta.overdue ? "text-red-500" : "text-gray-400"
                        }`}
                      >
                        {dueMeta.label}
                        {task.recurrence !== "NONE" && (
                          <span className="ml-1 opacity-70">
                            Â· {RECURRENCE_LABELS[task.recurrence]}
                          </span>
                        )}
                      </span>
                    )}
                    {!dueMeta && task.recurrence !== "NONE" && (
                      <span className="text-[10px] text-gray-400">
                        {RECURRENCE_LABELS[task.recurrence]}
                      </span>
                    )}
                  </div>

                  <Badge className={`text-[10px] px-1.5 py-0 ${prio.color} shrink-0`}>
                    {prio.label}
                  </Badge>

                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedId(null);
                      } else {
                        setExpandedId(task.id);
                        setEditDesc(task.description ?? "");
                      }
                    }}
                    className="shrink-0 text-gray-300 hover:text-gray-500"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="shrink-0 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 py-3 space-y-3">
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      onBlur={() => {
                        if (editDesc !== (task.description ?? "")) {
                          updateTask(task.id, {
                            description: editDesc || null,
                          });
                        }
                      }}
                      placeholder="Add a description…"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Due date
                        </label>
                        <input
                          type="date"
                          defaultValue={
                            task.dueDate
                              ? task.dueDate.split("T")[0]
                              : ""
                          }
                          onBlur={(e) =>
                            updateTask(task.id, {
                              dueDate: e.target.value || null,
                            })
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Repeats
                        </label>
                        <select
                          value={task.recurrence}
                          onChange={(e) =>
                            updateTask(task.id, {
                              recurrence: e.target.value as Task["recurrence"],
                            })
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        >
                          <option value="NONE">Does not repeat</option>
                          <option value="DAILY">Every day</option>
                          <option value="WEEKLY">Every week</option>
                          <option value="BIWEEKLY">Every 2 weeks</option>
                          <option value="MONTHLY">Every month</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Status:</span>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, {
                            status: e.target.value as Task["status"],
                          })
                        }
                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                      <span className="ml-2">Priority:</span>
                      <select
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(task.id, {
                            priority: e.target.value as Task["priority"],
                          })
                        }
                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
