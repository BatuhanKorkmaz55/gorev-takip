"use client";

import { useState } from "react";
import { TASK_STATUSES, STATUS_META, canChangeStatus, type TaskDTO, type TaskStatus } from "@gorev/shared";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { DueText, StatusPill } from "./TaskIcons";
import { useStatusActions } from "./useStatusActions";

const DONE_LIMIT = 20;

/** Üç kolonlu pano. Kart yalnızca görevi yapan kişi için sürüklenir; diğerleri yalnızca görür. */
export function Board({ tasks, show }: { tasks: TaskDTO[]; show: "from" | "to" }) {
  const me = useSession();
  const act = useStatusActions();
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const isMine = (t: TaskDTO) => canChangeStatus(me, { creatorId: t.creator.id, assigneeId: t.assignee.id });

  const column = (s: TaskStatus) => {
    const list = tasks.filter((t) => t.status === s);
    return s === "DONE" ? list.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, DONE_LIMIT) : list;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TASK_STATUSES.map((s) => {
        const list = column(s);
        return (
          <section
            key={s}
            aria-label={`${STATUS_META[s].label}: ${list.length} görev`}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const t = tasks.find((x) => x.id === e.dataTransfer.getData("text/task-id"));
              if (t && t.status !== s && isMine(t)) act(t, s);
              setDragId(null);
            }}
            className={cn("flex min-w-0 flex-col rounded-lg border-2 bg-sunken", over === s ? "border-accent bg-accent-soft" : "border-transparent")}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <StatusPill status={s} className="bg-surface" />
              <span className="text-base font-semibold text-ink-muted">{list.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2.5 px-2.5 pb-3">
              {list.map((t) => (
                <Card key={t.id} task={t} show={show} draggable={isMine(t)} dragging={dragId === t.id} onDrag={setDragId} />
              ))}
              {!list.length && <p className="px-2 py-6 text-center text-base text-ink-muted">Görev yok</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({
  task,
  show,
  draggable,
  dragging,
  onDrag,
}: {
  task: TaskDTO;
  show: "from" | "to";
  draggable: boolean;
  dragging: boolean;
  onDrag: (id: string | null) => void;
}) {
  const me = useSession();
  const drawer = useTaskDrawer();
  const done = task.status === "DONE";
  const who = show === "from" ? `Veren: ${task.creator.id === me.id ? "Sen" : task.creator.name}` : task.assignee.id === me.id ? "Sen" : task.assignee.name;
  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDrag(task.id);
      }}
      onDragEnd={() => onDrag(null)}
      className={cn(
        "flex flex-col gap-1 rounded-md border border-line bg-surface p-3.5 shadow-card",
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => drawer.open(task.number)}
        className={cn("cursor-pointer text-left text-base hover:underline", done ? "text-ink-muted line-through" : "text-ink")}
      >
        {task.title}
      </button>
      <p className="text-sm text-ink-muted">
        {who}
        {task.dueDate && !done && (
          <>
            {" · "}
            <DueText due={task.dueDate} status={task.status} />
          </>
        )}
      </p>
    </article>
  );
}
