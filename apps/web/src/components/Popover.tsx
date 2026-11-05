"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Basit açılır menü. `trigger` tıklanınca içerik açılır; dışarı tıklayınca veya Esc ile kapanır.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (o: boolean) => {
    setInnerOpen(o);
    onOpenChange?.(o);
  };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          className={cn(
            "animate-pop-in absolute top-full z-50 mt-1 min-w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  active,
  danger,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
        danger ? "text-red-600 hover:bg-red-50" : "text-zinc-700 hover:bg-zinc-100",
        active && "bg-zinc-100 font-medium text-zinc-900",
        className,
      )}
    >
      {children}
    </button>
  );
}
