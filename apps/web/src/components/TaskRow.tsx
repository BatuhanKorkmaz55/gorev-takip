"use client";

import { canChangeStatus, type TaskDTO } from "@gorev/shared";
import { useSession } from "@/hooks/useSession";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn, timeAgo } from "@/lib/utils";
import { DueText, StatusPill } from "./TaskIcons";
import { TaskActions } from "./TaskActions";

/**
 * Bir görev satırı. Bilgi satırı kime göre değişir:
 *  - "from": Veren: Ayşe · Yarın   (bana verilenler)
 *  - "to":   Mehmet yapacak · Yarın (benim verdiklerim, ekip)
 */
export function TaskRow({ task, show = "from", status }: { task: TaskDTO; show?: "from" | "to"; status?: boolean }) {
  const me = useSession();
  const drawer = useTaskDrawer();
  const mine = canChangeStatus(me, { creatorId: task.creator.id, assigneeId: task.assignee.id });
  const done = task.status === "DONE";
  const who =
    show === "from"
      ? `Veren: ${task.creator.id === me.id ? "Sen" : task.creator.name}`
      : task.assignee.id === me.id
        ? done
          ? "Sen yaptın"
          : "Sen yapacaksın"
        : `${task.assignee.name} ${done ? "yaptı" : "yapacak"}`;

  return (
    <div
      onClick={() => drawer.open(task.number)}
      className={cn(
        "flex min-h-16 cursor-pointer flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3 transition-colors hover:bg-paper",
        drawer.current === String(task.number) && "bg-accent-soft hover:bg-accent-soft",
      )}
    >
      <div className="min-w-0 flex-[1_1_260px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            drawer.open(task.number);
          }}
          className={cn("cursor-pointer text-left text-base hover:underline hover:underline-offset-2", done ? "text-ink-muted line-through" : "text-ink")}
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
          {done && task.completedAt && ` · ${timeAgo(task.completedAt)}`}
        </p>
      </div>
      {status && <StatusPill status={task.status} />}
      {mine && <TaskActions task={task} className="w-full sm:w-auto" />}
    </div>
  );
}
