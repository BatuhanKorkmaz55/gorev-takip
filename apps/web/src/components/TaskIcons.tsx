import { STATUS_META, dueLabel, type TaskStatus } from "@gorev/shared";
import { cn, todayKey } from "@/lib/utils";

export const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string; text: string }> = {
  TODO: { pill: "bg-todo text-todo-ink", dot: "var(--color-todo-dot)", text: "text-todo-ink" },
  IN_PROGRESS: { pill: "bg-progress text-progress-ink", dot: "var(--color-progress-dot)", text: "text-progress-ink" },
  DONE: { pill: "bg-done text-done-ink", dot: "var(--color-done-dot)", text: "text-done-ink" },
};

/** Durum simgesi: boş halka, yarım halka, onaylı daire. Her zaman bir kelimenin yanında kullanılır. */
export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const c = STATUS_STYLE[status].dot;
  const cls = cn("size-4 shrink-0", className);
  if (status === "DONE")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill={c} />
        <path d="M5 8.2 7.1 10.3 11 6.2" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "IN_PROGRESS")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M8 4.2A3.8 3.8 0 0 1 8 11.8z" fill={c} />
      </svg>
    );
  return (
    <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

/** Durum etiketi (yalnızca gösterir, tıklanmaz) */
export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold whitespace-nowrap", STATUS_STYLE[status].pill, className)}>
      <StatusIcon status={status} />
      {STATUS_META[status].label}
    </span>
  );
}

/** Kelimeyle son tarih: "2 gün gecikti" kırmızı, "Bugün" turuncu, diğerleri düz. Bitmiş görevde gösterilmez. */
export function DueText({ due, status }: { due: string | null; status: TaskStatus }) {
  if (!due || status === "DONE") return null;
  const { text, tone } = dueLabel(due, todayKey());
  return (
    <span className={cn(tone === "overdue" && "font-semibold text-danger", tone === "today" && "font-semibold text-blocked-ink")}>{text}</span>
  );
}
