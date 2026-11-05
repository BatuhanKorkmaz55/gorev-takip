"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: { label: string; onClick: () => void };
}

type ToastFn = (message: string, opts?: { tone?: "success" | "error"; action?: ToastItem["action"]; duration?: number }) => void;

const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastFn>(
    (message, opts) => {
      const id = nextId++;
      setItems((s) => [...s.slice(-3), { id, message, tone: opts?.tone ?? "success", action: opts?.action }]);
      setTimeout(() => dismiss(id), opts?.duration ?? (opts?.action ? 6000 : 3500));
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-zinc-900 py-2.5 pl-3.5 pr-2 text-sm text-white shadow-xl"
          >
            {t.tone === "success" ? (
              <CircleCheck className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <TriangleAlert className="size-4 shrink-0 text-red-400" />
            )}
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                className="rounded-md px-2 py-1 text-[13px] font-semibold text-accent-100 hover:bg-white/10"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className={cn("rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white")} onClick={() => dismiss(t.id)} aria-label="Kapat">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
