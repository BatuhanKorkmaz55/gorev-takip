"use client";

import { longDate, type ActivityDTO, type TaskStatus } from "@gorev/shared";
import { useSession } from "@/hooks/useSession";
import { fullDateTime, timeAgo } from "@/lib/utils";

/** "Ayşe Yılmaz tamamladı" / "Sen tamamladın" */
function sentence(a: ActivityDTO, meId: string): string {
  const self = a.user.id === meId;
  const v = (third: string, second: string) => (self ? second : third);
  const m = (a.meta ?? {}) as Record<string, unknown>;
  const target = (id: unknown, name: unknown) => (id === meId ? "sana" : `${String(name)} kişisine`);
  switch (a.type) {
    case "CREATED":
      return m.assigneeId && m.assigneeId !== a.user.id
        ? `görevi ${target(m.assigneeId, m.assigneeName)} ${v("verdi", "verdin")}`
        : v("görevi oluşturdu", "görevi oluşturdun");
    case "STATUS": {
      const to = m.to as TaskStatus;
      if (to === "DONE") return v("tamamladı", "tamamladın");
      if (to === "IN_PROGRESS") return v("başladı", "başladın");
      return v("yeniden açtı", "yeniden açtın");
    }
    case "COMMENT":
      return v("not ekledi", "not ekledin");
    case "ASSIGNEE":
      return `görevi ${target(m.toId, m.toName)} ${v("verdi", "verdin")}`;
    case "DUE_DATE":
      return m.to ? `son tarihi ${longDate(String(m.to))} ${v("yaptı", "yaptın")}` : v("son tarihi kaldırdı", "son tarihi kaldırdın");
    case "TITLE":
      return v("başlığı değiştirdi", "başlığı değiştirdin");
    case "DESCRIPTION":
      return v("açıklamayı güncelledi", "açıklamayı güncelledin");
    default:
      return "";
  }
}

export function ActivityItem({ a }: { a: ActivityDTO }) {
  const me = useSession();
  return (
    <article className="flex flex-col gap-1.5">
      <p className="text-base text-ink">
        <b className="font-semibold">{a.user.id === me.id ? "Sen" : a.user.name}</b> {sentence(a, me.id)}{" "}
        <time dateTime={a.createdAt} title={fullDateTime(a.createdAt)} className="text-sm text-ink-muted">
          · {timeAgo(a.createdAt)}
        </time>
      </p>
      {a.message && <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-base whitespace-pre-wrap break-words text-ink">{a.message}</p>}
    </article>
  );
}
