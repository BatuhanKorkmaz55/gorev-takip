"use client";

import type { TaskDTO, TaskStatus } from "@gorev/shared";
import { ListChecks, MessageSquare } from "lucide-react";
import { useUpdateTask } from "@/lib/queries";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { AssigneeMenu, StatusMenu } from "./Pickers";
import { DueBadge, PriorityIcon, StatusIcon, TagChip } from "./TaskIcons";
import { useToast } from "./Toast";

export function useStatusChange() {
  const update = useUpdateTask();
  const toast = useToast();
  const drawer = useTaskDrawer();
  return (task: TaskDTO, status: TaskStatus) => {
    update.mutate(
      { id: task.id, status },
      {
        onError: (e) => toast(e.message, { tone: "error" }),
      },
    );
    const msg =
      status === "DONE" ? `#${task.number} tamamlandı 🎉` : status === "BLOCKED" ? `#${task.number} beklemeye alındı` : `#${task.number} güncellendi`;
    toast(msg, { action: { label: "Not ekle", onClick: () => drawer.open(task.number) } });
  };
}

export function TaskRow({ task, showAssignee = true, compact }: { task: TaskDTO; showAssignee?: boolean; compact?: boolean }) {
  const drawer = useTaskDrawer();
  const update = useUpdateTask();
  const changeStatus = useStatusChange();
  const closed = task.status === "DONE" || task.status === "CANCELLED";
  const isOpen = drawer.current === String(task.number);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => drawer.open(task.number)}
      onKeyDown={(e) => {
        if (e.key === "Enter") drawer.open(task.number);
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 px-3 outline-none transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50",
        compact ? "py-2" : "py-2.5",
        isOpen && "bg-accent-50/60 hover:bg-accent-50/60",
      )}
    >
      {/* Tek tıkla tamamla; uzun menü için sağ taraftaki durum */}
      <button
        type="button"
        title={closed ? "Yeniden aç" : "Tamamlandı olarak işaretle"}
        onClick={(e) => {
          e.stopPropagation();
          changeStatus(task, closed ? "TODO" : "DONE");
        }}
        className="group/check -m-1 rounded-full p-1 hover:bg-zinc-200/60"
      >
        <span className="relative block">
          <StatusIcon status={task.status} progress={task.progress} className="size-[18px] group-hover/check:opacity-0" />
          <StatusIcon status={closed ? "TODO" : "DONE"} className="absolute inset-0 size-[18px] opacity-0 group-hover/check:opacity-100" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 text-xs tabular-nums text-zinc-400 sm:inline">#{task.number}</span>
          <span className={cn("truncate text-sm", closed ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900")}>{task.title}</span>
        </div>
        {(task.tags.length > 0 || task.checklistTotal > 0 || task.commentCount > 0) && !compact && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.tags.slice(0, 3).map((t) => (
              <TagChip key={t} tag={t} />
            ))}
            {task.checklistTotal > 0 && (
              <span className={cn("inline-flex items-center gap-1 text-xs", task.checklistDone === task.checklistTotal ? "text-emerald-600" : "text-zinc-500")}>
                <ListChecks className="size-3.5" /> {task.checklistDone}/{task.checklistTotal}
              </span>
            )}
            {task.commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <MessageSquare className="size-3.5" /> {task.commentCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {task.status === "IN_PROGRESS" && task.progress > 0 && (
          <span className="hidden items-center gap-1.5 md:flex" title={`İlerleme %${task.progress}`}>
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full rounded-full bg-blue-500" style={{ width: `${task.progress}%` }} />
            </span>
            <span className="w-8 text-xs tabular-nums text-zinc-500">%{task.progress}</span>
          </span>
        )}
        <DueBadge due={task.dueDate} status={task.status} />
        {task.priority !== "NORMAL" && task.priority !== "LOW" && <PriorityIcon priority={task.priority} />}

        <StatusMenu
          value={task.status}
          align="end"
          onChange={(s) => changeStatus(task, s)}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              className="hidden rounded-md px-1.5 py-1 text-xs text-zinc-500 opacity-0 transition hover:bg-zinc-200/60 group-hover:opacity-100 sm:block"
            >
              Durum
            </button>
          )}
        />

        {showAssignee && (
          <AssigneeMenu
            value={task.assignee?.id ?? null}
            align="end"
            onChange={(id) => update.mutate({ id: task.id, assigneeId: id })}
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                className="rounded-full"
                title={task.assignee ? task.assignee.name : "Atanmamış"}
              >
                <Avatar user={task.assignee} size="sm" />
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
}
