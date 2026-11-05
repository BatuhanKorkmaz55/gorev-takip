import { PRIORITY_META, STATUS_META, dueLabel, type Priority, type TaskStatus } from "@gorev/shared";
import { ChevronDown } from "lucide-react";
import { cn, todayKey } from "@/lib/utils";

/** Durum renkleri: zemin, metin ve simge (tasarım sistemi "Durum dili" tablosu). */
export const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string; border: string }> = {
  TODO: { pill: "bg-todo text-todo-ink", dot: "var(--color-todo-dot)", border: "border-todo-dot" },
  IN_PROGRESS: { pill: "bg-progress text-progress-ink", dot: "var(--color-progress-dot)", border: "border-progress-dot" },
  BLOCKED: { pill: "bg-blocked text-blocked-ink", dot: "var(--color-blocked-dot)", border: "border-blocked-dot" },
  DONE: { pill: "bg-done text-done-ink", dot: "var(--color-done-dot)", border: "border-done-dot" },
  CANCELLED: { pill: "bg-cancel text-cancel-ink", dot: "var(--color-todo-dot)", border: "border-todo-dot" },
};

/** Durum simgesi. Şekiller birbirinden farklıdır; renk körlüğünde de ayırt edilir. Her zaman bir kelimenin yanında kullanılır. */
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
  if (status === "CANCELLED")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill={c} />
        <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (status === "BLOCKED")
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M6.4 5.6v4.8M9.6 5.6v4.8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
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

/** Durum etiketi: simge + kelime. `asButton` ile durum menüsünü açan düğme olur. */
export function StatusPill({ status, chevron, className }: { status: TaskStatus; chevron?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold whitespace-nowrap",
        STATUS_STYLE[status].pill,
        className,
      )}
    >
      <StatusIcon status={status} />
      {STATUS_META[status].label}
      {chevron && <ChevronDown className="size-4" aria-hidden="true" />}
    </span>
  );
}

/** Kelimeyle bitiş tarihi. Gecikmiş: kırmızı etiket, bugün: turuncu etiket, diğerleri düz metin. */
export function DueLabel({ due, status, className }: { due: string | null; status: TaskStatus; className?: string }) {
  if (!due) return null;
  const closed = status === "DONE" || status === "CANCELLED";
  const { text, tone } = dueLabel(due, todayKey());
  if (closed) {
    return <span className={cn("text-sm whitespace-nowrap text-ink-muted", className)}>{tone === "overdue" ? "Tarihi geçti" : text}</span>;
  }
  if (tone === "overdue" || tone === "today") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-sm px-2 py-0.5 text-sm font-semibold whitespace-nowrap",
          tone === "overdue" ? "bg-danger-soft text-danger" : "bg-blocked text-blocked-ink",
          className,
        )}
      >
        {text}
      </span>
    );
  }
  return (
    <span className={cn("text-sm whitespace-nowrap", tone === "tomorrow" ? "font-semibold text-ink" : "text-ink-muted", className)}>
      {text}
    </span>
  );
}

/** Öncelik kelimeyle: yalnızca Acil ve Yüksek satırlarda öne çıkar. */
export function PriorityText({ priority, always, className }: { priority: Priority; always?: boolean; className?: string }) {
  if (!always && (priority === "NORMAL" || priority === "LOW")) return null;
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        priority === "URGENT" ? "text-danger" : priority === "HIGH" ? "text-blocked-ink" : "text-ink-muted",
        className,
      )}
    >
      {PRIORITY_META[priority].label}
    </span>
  );
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm bg-todo px-2 py-0.5 text-sm font-semibold text-todo-ink", className)}>
      #{tag}
    </span>
  );
}
