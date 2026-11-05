"use client";

import { useState } from "react";
import { BOARD_STATUSES, STATUS_META, type TaskDTO, type TaskStatus } from "@gorev/shared";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { StatusMenu } from "./Pickers";
import { DueLabel, PriorityText, StatusPill } from "./TaskIcons";
import { useStatusChange } from "./TaskRow";

const DONE_LIMIT = 25;

/** Pano: kartları sürükleyip başka bir kolona bırakmak durumu değiştirir. Sürükleyemeyenler kart üzerindeki durum düğmesini kullanır. */
export function Board({ tasks }: { tasks: TaskDTO[] }) {
  const changeStatus = useStatusChange();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  const byStatus = (s: TaskStatus) => {
    const list = tasks.filter((t) => t.status === s);
    if (s === "DONE") return list.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, DONE_LIMIT);
    return list;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_STATUSES.map((s) => {
        const list = byStatus(s);
        return (
          <section
            key={s}
            aria-label={`${STATUS_META[s].label}: ${list.length} görev`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/task-id");
              const t = tasks.find((x) => x.id === id);
              if (t && t.status !== s) changeStatus(t, s);
              setDragId(null);
            }}
            className={cn(
              "flex w-[300px] shrink-0 flex-col rounded-lg border-2 bg-sunken transition-colors lg:w-auto lg:min-w-[220px] lg:flex-1 lg:shrink",
              over === s ? "border-accent bg-accent-soft" : "border-transparent",
            )}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <StatusPill status={s} className="bg-surface" />
              <span className="text-base font-semibold text-ink-muted">{list.length}</span>
            </div>
            <div className="flex min-h-28 flex-col gap-2.5 px-2.5 pb-3">
              {list.map((t) => (
                <BoardCard key={t.id} task={t} dragging={dragId === t.id} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
              ))}
              {!list.length && <p className="px-2 py-8 text-center text-base text-ink-muted">Bu kolonda görev yok. Bir kartı buraya sürükleyebilirsin.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({ task, dragging, onDragStart, onDragEnd }: { task: TaskDTO; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const drawer = useTaskDrawer();
  const me = useSession();
  const changeStatus = useStatusChange();
  const closed = task.status === "DONE";
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => drawer.open(task.number)}
      className={cn(
        "flex cursor-pointer flex-col gap-2.5 rounded-md border border-line bg-surface p-3.5 shadow-card transition hover:border-line-strong active:cursor-grabbing",
        dragging && "opacity-40",
        drawer.current === String(task.number) && "border-accent ring-2 ring-accent/25",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          drawer.open(task.number);
        }}
        className={cn("cursor-pointer text-left text-base hover:underline", closed ? "text-ink-muted line-through" : "text-ink")}
      >
        {task.title}
      </button>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        <PriorityText priority={task.priority} />
        {task.tags.slice(0, 2).map((t) => (
          <span key={t}>#{t}</span>
        ))}
        {task.checklistTotal > 0 && (
          <span>
            {task.checklistDone}/{task.checklistTotal} adım
          </span>
        )}
      </div>
      {task.status === "IN_PROGRESS" && task.progress > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-progress-dot" style={{ width: `${task.progress}%` }} />
          </div>
          <span className="text-sm font-semibold text-ink">%{task.progress}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
        {task.dueDate && <DueLabel due={task.dueDate} status={task.status} className="self-start" />}
        <div className="flex items-center gap-2">
          <Avatar user={task.assignee} size="sm" />
          <span className="min-w-0 flex-1 text-sm text-ink">
            {task.assignee ? (task.assignee.id === me.id ? "Sen" : task.assignee.name) : <span className="text-ink-muted">Kimseye verilmedi</span>}
          </span>
        </div>
      </div>
      <StatusMenu
        value={task.status}
        onChange={(s) => changeStatus(task, s)}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="min-h-9 cursor-pointer text-left text-sm font-semibold text-accent hover:underline"
          >
            Durumu değiştir
          </button>
        )}
      />
    </article>
  );
}
