"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./ui";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-start justify-center bg-zinc-900/30 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("animate-pop-in w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl", className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
          <IconButton label="Kapat" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
