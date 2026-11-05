"use client";

import type { ReactNode } from "react";
import { PRIORITY_META, formatDateKey, type ActivityDTO, type Priority, type TaskStatus } from "@gorev/shared";
import { Trash2 } from "lucide-react";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { useDeleteActivity } from "@/lib/queries";
import { cn, fullDateTime, timeAgo } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { PriorityIcon, StatusIcon, StatusPill } from "./TaskIcons";

const B = ({ children }: { children: ReactNode }) => <span className="font-medium text-zinc-800">{children}</span>;

function describe(a: ActivityDTO): ReactNode {
  const m = (a.meta ?? {}) as Record<string, unknown>;
  switch (a.type) {
    case "CREATED":
      return m.assigneeName && m.assigneeId !== a.user.id ? (
        <>
          görevi oluşturdu ve <B>{String(m.assigneeName)}</B> kişisine atadı
        </>
      ) : (
        <>görevi oluşturdu</>
      );
    case "COMMENT":
      return <>not ekledi</>;
    case "STATUS":
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          durumu <StatusPill status={m.to as TaskStatus} /> yaptı
        </span>
      );
    case "ASSIGNEE":
      return m.toName ? (
        <>
          görevi <B>{String(m.toName)}</B> kişisine atadı
        </>
      ) : (
        <>atamayı kaldırdı</>
      );
    case "PRIORITY":
      return (
        <span className="inline-flex items-center gap-1">
          önceliği <PriorityIcon priority={m.to as Priority} className="size-3.5" /> <B>{PRIORITY_META[m.to as Priority]?.label}</B> yaptı
        </span>
      );
    case "DUE_DATE":
      return m.to ? (
        <>
          bitiş tarihini <B>{formatDateKey(String(m.to))}</B> olarak ayarladı
        </>
      ) : (
        <>bitiş tarihini kaldırdı</>
      );
    case "PROGRESS":
      return (
        <>
          ilerlemeyi <B>%{String(m.to)}</B> olarak güncelledi
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

/** Görev zaman akışındaki tek satır */
export function ActivityItem({ a, showTask }: { a: ActivityDTO; showTask?: boolean }) {
  const drawer = useTaskDrawer();
  const me = useSession();
  const del = useDeleteActivity();
  const canDelete = a.type === "COMMENT" && (a.user.id === me.id || me.role === "ADMIN");
  const emphasize = a.type === "COMMENT" || !!a.message;

  return (
    <div className="group relative flex gap-3">
      <Avatar user={a.user} size={emphasize ? "md" : "sm"} className={cn(!emphasize && "mx-1")} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[13px] leading-6 text-zinc-500">
          <B>{a.user.name}</B> {describe(a)}{" "}
          {showTask && a.task && (
            <button
              type="button"
              onClick={() => drawer.open(a.task!.number)}
              className="inline-flex max-w-full items-center gap-1 rounded-md px-1 text-left align-middle font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <StatusIcon status={a.task.status} className="size-3.5" />
              <span className="truncate">
                #{a.task.number} {a.task.title}
              </span>
            </button>
          )}
          <span className="whitespace-nowrap text-xs text-zinc-400" title={fullDateTime(a.createdAt)}>
            · {timeAgo(a.createdAt)}
          </span>
        </div>
        {a.message && (
          <div className="mt-1 whitespace-pre-wrap break-words rounded-lg rounded-tl-sm border border-zinc-200/70 bg-white px-3 py-2 text-sm text-zinc-800 shadow-xs">
            {a.message}
          </div>
        )}
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Bu not silinsin mi?")) del.mutate(a.id);
          }}
          className="absolute right-0 top-0 rounded-md p-1 text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="Notu sil"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}
