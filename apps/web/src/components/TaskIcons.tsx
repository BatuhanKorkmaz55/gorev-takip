import { PRIORITY_META, STATUS_META, diffDays, humanDue, type Priority, type TaskStatus } from "@gorev/shared";
import { CalendarDays } from "lucide-react";
import { cn, todayKey } from "@/lib/utils";

export const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "#a1a1aa",
  IN_PROGRESS: "#3b82f6",
  BLOCKED: "#f59e0b",
  DONE: "#10b981",
  CANCELLED: "#a1a1aa",
};

export const STATUS_PILL: Record<TaskStatus, string> = {
  TODO: "bg-zinc-100 text-zinc-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  BLOCKED: "bg-amber-50 text-amber-700",
  DONE: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

export const STATUS_RING: Record<TaskStatus, string> = {
  TODO: "ring-zinc-300",
  IN_PROGRESS: "ring-blue-300",
  BLOCKED: "ring-amber-300",
  DONE: "ring-emerald-300",
  CANCELLED: "ring-zinc-300",
};

/** Durum simgesi. "Devam ediyor" durumunda ilerleme yüzdesi pasta olarak görünür. */
export function StatusIcon({
  status,
  progress = 0,
  className,
}: {
  status: TaskStatus;
  progress?: number;
  className?: string;
}) {
  const c = STATUS_COLOR[status];
  const cls = cn("size-4 shrink-0", className);
  if (status === "DONE")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-label={STATUS_META[status].label}>
        <circle cx="8" cy="8" r="7" fill={c} />
        <path d="M5 8.2 7.1 10.3 11 6.2" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "CANCELLED")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-label={STATUS_META[status].label}>
        <circle cx="8" cy="8" r="7" fill={c} />
        <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (status === "BLOCKED")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-label={STATUS_META[status].label}>
        <circle cx="8" cy="8" r="6.3" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M6.4 5.6v4.8M9.6 5.6v4.8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (status === "IN_PROGRESS") {
    const p = Math.max(0.15, Math.min(0.95, progress / 100 || 0.5));
    const r = 3.6;
    const angle = p * 2 * Math.PI;
    const x = 8 + r * Math.sin(angle);
    const y = 8 - r * Math.cos(angle);
    const large = p > 0.5 ? 1 : 0;
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-label={STATUS_META[status].label}>
        <circle cx="8" cy="8" r="6.3" fill="none" stroke={c} strokeWidth="1.5" />
        <path d={`M8 8 L8 ${8 - r} A${r} ${r} 0 ${large} 1 ${x} ${y} Z`} fill={c} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={cls} aria-label={STATUS_META[status].label}>
      <circle cx="8" cy="8" r="6.3" fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", STATUS_PILL[status], className)}>
      <StatusIcon status={status} className="size-3" progress={60} />
      {STATUS_META[status].label}
    </span>
  );
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const cls = cn("size-4 shrink-0", className);
  const label = `Öncelik: ${PRIORITY_META[priority].label}`;
  if (priority === "URGENT")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-label={label}>
        <title>{label}</title>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#ef4444" />
        <path d="M8 4.5v4.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="1.05" fill="white" />
      </svg>
    );
  const level = PRIORITY_META[priority].rank; // 0..2
  const on = priority === "HIGH" ? "#f97316" : "#71717a";
  return (
    <svg viewBox="0 0 16 16" className={cls} aria-label={label}>
      <title>{label}</title>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2.5 + i * 4} y={10 - i * 3} width="3" height={4 + i * 3} rx="1" fill={i <= level ? on : "#e4e4e7"} />
      ))}
    </svg>
  );
}

export function dueTone(due: string | null, status: TaskStatus): "overdue" | "today" | "soon" | "later" | "none" | "closed" {
  if (!due) return "none";
  if (status === "DONE" || status === "CANCELLED") return "closed";
  const d = diffDays(todayKey(), due);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 2) return "soon";
  return "later";
}

export function DueBadge({ due, status, className }: { due: string | null; status: TaskStatus; className?: string }) {
  if (!due) return null;
  const tone = dueTone(due, status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium",
        tone === "overdue" && "bg-red-50 text-red-700",
        tone === "today" && "bg-amber-50 text-amber-700",
        tone === "soon" && "text-amber-700",
        tone === "later" && "text-zinc-500",
        tone === "closed" && "text-zinc-400",
        className,
      )}
    >
      <CalendarDays className="size-3.5" />
      {humanDue(due, todayKey())}
    </span>
  );
}

export function TagChip({ tag, onClick, className }: { tag: string; onClick?: () => void; className?: string }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600",
        onClick && "hover:bg-zinc-200",
        className,
      )}
    >
      #{tag}
    </Comp>
  );
}
