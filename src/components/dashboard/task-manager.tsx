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
  dueDate: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string | null } | null;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-600", icon: null },
  MEDIUM: { label: "Med", color: "bg-blue-100 text-blue-700", icon: null },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const STATUS_ICON = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("MEDIUM");
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
      body: JSON.stringify({ title: newTitle.trim(), priority: newPriority }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setNewPriority("MEDIUM");
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
    const next = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "TODO";
    updateTask(task.id, { status: next });
  }

  const counts = {
    ALL: tasks.length,
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
  };

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

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
            {s === "ALL" ? "All" : s === "TODO" ? "To Do" : s === "IN_PROGRESS" ? "In Progress" : "Done"}
            <span className="ml-1 text-[10px]">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Add task form */}
      <form onSubmit={addTask} className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
          className="rounded-lg border border-gray-200 px-2 text-xs text-gray-600"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Med</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <Button type="submit" size="sm" disabled={adding || !newTitle.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
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

                  <span
                    className={`flex-1 text-sm truncate ${
                      task.status === "DONE" ? "line-through text-gray-400" : "text-gray-800"
                    }`}
                  >
                    {task.title}
                  </span>

                  <Badge className={`text-[10px] px-1.5 py-0 ${prio.color}`}>
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
                  <div className="border-t border-gray-100 px-3 py-3 space-y-2">
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      onBlur={() => {
                        if (editDesc !== (task.description ?? "")) {
                          updateTask(task.id, { description: editDesc || null });
                        }
                      }}
                      placeholder="Add a description…"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-none"
                    />
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Status:</span>
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(task.id, { status: e.target.value as Task["status"] })}
                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                      <span className="ml-2">Priority:</span>
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(task.id, { priority: e.target.value as Task["priority"] })}
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
