"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";

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
      setItems((s) => [...s.slice(-2), { id, message, tone: opts?.tone ?? "success", action: opts?.action }]);
      setTimeout(() => dismiss(id), opts?.duration ?? (opts?.action ? 8000 : 4000));
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop-in pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-lg bg-ink py-2 pr-2 pl-4 text-base text-on-ink shadow-pop"
          >
            {t.tone === "success" ? (
              <CircleCheck className="size-5 shrink-0 text-signal" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-5 shrink-0 text-signal" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 py-1.5">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="h-10 shrink-0 cursor-pointer rounded-md bg-on-ink px-3 text-[15px] font-semibold text-ink hover:bg-on-ink/90"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-ink/80 hover:bg-on-ink/10 hover:text-on-ink"
              onClick={() => dismiss(t.id)}
              aria-label="Bildirimi kapat"
            >
              <X className="size-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
