"use client";

import { useState } from "react";

type Todo = { id: string; text: string; done: boolean };

export default function TeacherMemoPage() {
  const [tab, setTab] = useState<"TODO" | "MEMO">("TODO");
  const [todos, setTodos] = useState<Todo[]>([
    { id: "t1", text: "Préparer contrôle de math (6e A)", done: false },
    { id: "t2", text: "Relancer parents (absences répétées)", done: false },
  ]);
  const [memo, setMemo] = useState("Points à revoir cette semaine : fractions, accords du participe passé, lecture…");
  const [newTodo, setNewTodo] = useState("");

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Todo / Mémo</h1>
        <p className="mt-1 text-sm text-slate-600">Notes personnelles (stockage à brancher ensuite sur Supabase).</p>
      </header>

      <section className="elima-card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("TODO")}
            className={tab === "TODO" ? "rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white" : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"}
          >
            Todo
          </button>
          <button
            onClick={() => setTab("MEMO")}
            className={tab === "MEMO" ? "rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white" : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"}
          >
            Mémo
          </button>
        </div>

        {tab === "TODO" ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Ajouter une tâche…"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (!newTodo.trim()) return;
                  setTodos((t) => [{ id: String(Date.now()), text: newTodo.trim(), done: false }, ...t]);
                  setNewTodo("");
                }}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {todos.map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => setTodos((all) => all.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  />
                  <span className={t.done ? "text-slate-400 line-through" : "text-slate-800"}>{t.text}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="min-h-[220px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm"
            />
            <p className="mt-2 text-xs text-slate-500">Sauvegarde automatique à brancher.</p>
          </div>
        )}
      </section>
    </div>
  );
}
