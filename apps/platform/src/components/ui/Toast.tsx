"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: string; title: string; description?: string };

type ToastContextValue = {
  success: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const success = useCallback(
    (title: string, description?: string) => {
      const id = String(Date.now()) + Math.random().toString(16).slice(2);
      const toast: Toast = { id, title, description };
      setToasts((t) => [toast, ...t].slice(0, 3));
      window.setTimeout(() => remove(id), 2200);
    },
    [remove],
  );

  const value = useMemo(() => ({ success }), [success]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="w-[320px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.description ? <p className="mt-0.5 text-xs text-slate-600">{t.description}</p> : null}
                </div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
