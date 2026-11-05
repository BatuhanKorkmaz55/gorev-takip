"use client";

import type { ReactNode } from "react";
import { PRIORITY_META, STATUS_META, formatDateKey, type ActivityDTO, type Priority, type TaskStatus } from "@gorev/shared";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { useDeleteActivity } from "@/lib/queries";
import { cn, fullDateTime, timeAgo } from "@/lib/utils";
import { Avatar } from "./Avatar";

const B = ({ children, className }: { children: ReactNode; className?: string }) => <b className={cn("font-semibold text-ink", className)}>{children}</b>;

const STATUS_TEXT: Record<TaskStatus, string> = {
  TODO: "text-todo-ink",
  IN_PROGRESS: "text-progress-ink",
  BLOCKED: "text-blocked-ink",
  DONE: "text-done-ink",
  CANCELLED: "text-cancel-ink",
};

function describe(a: ActivityDTO, meId: string): ReactNode {
  const m = (a.meta ?? {}) as Record<string, unknown>;
  switch (a.type) {
    case "CREATED":
      return m.assigneeName && m.assigneeId !== a.user.id ? (
        <>
          görevi oluşturdu ve <B>{m.assigneeId === meId ? "sana" : String(m.assigneeName)}</B> verdi
        </>
      ) : (
        <>görevi oluşturdu</>
      );
    case "COMMENT":
      return <>not ekledi</>;
    case "STATUS": {
      const to = m.to as TaskStatus;
      return (
        <>
          durumu <B className={STATUS_TEXT[to]}>{STATUS_META[to]?.label}</B> yaptı
        </>
      );
    }
    case "ASSIGNEE":
      return m.toName ? (
        <>
          görevi <B>{m.toId === meId ? "sana" : String(m.toName)}</B> verdi
        </>
      ) : (
        <>görevin sorumlusunu kaldırdı</>
      );
    case "PRIORITY":
      return (
        <>
          önceliği <B>{PRIORITY_META[m.to as Priority]?.label}</B> yaptı
        </>
      );
    case "DUE_DATE":
      return m.to ? (
        <>
          bitiş tarihini <B>{formatDateKey(String(m.to))}</B> yaptı
        </>
      ) : (
        <>bitiş tarihini kaldırdı</>
      );
    case "PROGRESS":
      return (
        <>
          ilerlemeyi <B>%{String(m.to)}</B> yaptı
        </>
      );
    case "TITLE":
      return (
        <>
          başlığı <B>“{String(m.to)}”</B> olarak değiştirdi
        </>
      );
    case "DESCRIPTION":
      return <>açıklamayı güncelledi</>;
    case "TAGS":
      return <>etiketleri güncelledi</>;
    case "CHECKLIST": {
      const verb = m.action === "checked" ? "tamamladı" : m.action === "unchecked" ? "geri aldı" : "ekledi";
      return (
        <>
          <B>“{String(m.text)}”</B> adımını {verb}
        </>
      );
    }
    default:
      return null;
  }
}

/** Geçmişteki bir kayıt: kim, ne yaptı, ne zaman; varsa notu. */
export function ActivityItem({ a, showTask, noteBg = "bg-paper" }: { a: ActivityDTO; showTask?: boolean; noteBg?: string }) {
  const drawer = useTaskDrawer();
  const me = useSession();
  const del = useDeleteActivity();
  const canDelete = a.type === "COMMENT" && (a.user.id === me.id || me.role === "ADMIN");

  return (
    <article className="flex gap-3">
      <Avatar user={a.user} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-base text-ink">
          <B>{a.user.id === me.id ? "Sen" : a.user.name}</B> {describe(a, me.id)}
        </p>
        {showTask && a.task && (
          <button
            type="button"
            onClick={() => drawer.open(a.task!.number)}
            className="cursor-pointer self-start text-left text-sm font-semibold text-accent hover:text-accent-strong hover:underline"
          >
            {a.task.title}
          </button>
        )}
        {a.message && <p className={cn("rounded-md px-3 py-2.5 text-base whitespace-pre-wrap break-words text-ink", noteBg)}>{a.message}</p>}
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <time dateTime={a.createdAt} title={fullDateTime(a.createdAt)}>
            {timeAgo(a.createdAt)}
          </time>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Bu not silinsin mi?")) del.mutate(a.id);
              }}
              className="cursor-pointer font-semibold text-danger hover:underline"
            >
              Notu sil
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
