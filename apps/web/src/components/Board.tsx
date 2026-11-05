"use client";

import { useState } from "react";
import { BOARD_STATUSES, STATUS_META, type TaskDTO, type TaskStatus } from "@gorev/shared";
import { ListChecks, MessageSquare } from "lucide-react";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { DueBadge, PriorityIcon, StatusIcon, TagChip } from "./TaskIcons";
import { useStatusChange } from "./TaskRow";

const DONE_LIMIT = 25;

export function Board({ tasks }: { tasks: TaskDTO[] }) {
  const changeStatus = useStatusChange();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  const byStatus = (s: TaskStatus) => {
    const list = tasks.filter((t) => t.status === s);
    if (s === "DONE") {
      return list.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, DONE_LIMIT);
    }
    return list;
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {BOARD_STATUSES.map((s) => {
        const list = byStatus(s);
        return (
          <div
            key={s}
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
              "flex w-[280px] shrink-0 flex-col rounded-xl border bg-zinc-100/60 transition-colors lg:w-auto lg:min-w-[230px] lg:flex-1 lg:shrink",
              over === s ? "border-accent-500/50 bg-accent-50/60" : "border-transparent",
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <StatusIcon status={s} progress={50} />
              <span className="text-[13px] font-semibold text-zinc-700">{STATUS_META[s].label}</span>
              <span className="text-xs tabular-nums text-zinc-400">{list.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2 px-2 pb-2">
              {list.map((t) => (
                <BoardCard key={t.id} task={t} dragging={dragId === t.id} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
              ))}
              {!list.length && <p className="px-2 py-6 text-center text-xs text-zinc-400">Buraya sürükle</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ task, dragging, onDragStart, onDragEnd }: { task: TaskDTO; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const drawer = useTaskDrawer();
  const closed = task.status === "DONE";
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => drawer.open(task.number)}
      className={cn(
        "cursor-pointer rounded-lg border border-zinc-200/80 bg-white p-3 shadow-xs transition hover:border-zinc-300 hover:shadow-sm active:cursor-grabbing",
        dragging && "opacity-40",
        drawer.current === String(task.number) && "border-accent-500 ring-2 ring-accent-500/15",
      )}
    >
      <div className="flex items-start gap-2">
        <p className={cn("flex-1 text-sm leading-snug", closed ? "text-zinc-400 line-through" : "text-zinc-900")}>{task.title}</p>
        {task.priority !== "NORMAL" && task.priority !== "LOW" && <PriorityIcon priority={task.priority} className="mt-0.5" />}
      </div>
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
      {task.status === "IN_PROGRESS" && task.progress > 0 && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${task.progress}%` }} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-xs tabular-nums text-zinc-400">#{task.number}</span>
        <DueBadge due={task.dueDate} status={task.status} className="px-1" />
        {task.checklistTotal > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <ListChecks className="size-3.5" />
            {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <MessageSquare className="size-3.5" />
            {task.commentCount}
          </span>
        )}
        <Avatar user={task.assignee} size="sm" className="ml-auto" />
      </div>
    </div>
  );
}
