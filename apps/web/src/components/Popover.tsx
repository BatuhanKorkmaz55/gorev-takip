"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Pos = { top?: number; bottom?: number; left: number; maxHeight: number };

const GAP = 6;
const MARGIN = 8;

/**
 * Açılır menü. İçerik sayfanın en üst katmanında (portal) açılır; böylece kartların kenarında kesilmez.
 * Altta yer yoksa yukarı açılır, ekrana sığmayacaksa kendi içinde kaydırılır.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  className,
  triggerClassName = "inline-flex",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Tetikleyiciyi saran kutunun sınıfı (tam genişlik için "flex w-full") */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!r || !panel) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = panel.offsetWidth;
    const h = panel.scrollHeight;
    const below = vh - r.bottom - GAP - MARGIN;
    const above = r.top - GAP - MARGIN;
    const up = h > below && above > below;
    const rawLeft = align === "end" ? r.right - w : r.left;
    const left = Math.max(MARGIN, Math.min(rawLeft, vw - w - MARGIN));
    setPos(up ? { bottom: vh - r.top + GAP, left, maxHeight: above } : { top: r.bottom + GAP, left, maxHeight: below });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <>
      <div ref={triggerRef} className={triggerClassName} onClick={(e) => e.stopPropagation()}>
        {trigger({ open, toggle: () => setOpen((o) => !o) })}
      </div>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            data-popover=""
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: pos?.top, bottom: pos?.bottom, left: pos?.left ?? 0, maxHeight: pos?.maxHeight, visibility: pos ? "visible" : "hidden" }}
            className={cn("animate-pop-in z-[80] min-w-56 overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-pop", className)}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-left text-base transition-colors",
        danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
