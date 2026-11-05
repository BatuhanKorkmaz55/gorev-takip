"use client";

import type { TaskDTO, TaskStatus } from "@gorev/shared";
import { STATUS_META } from "@gorev/shared";
import { useUpdateTask } from "@/lib/queries";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { StatusMenu } from "./Pickers";
import { DueLabel, PriorityText, StatusPill } from "./TaskIcons";
import { useToast } from "./Toast";

/** Durum değiştir; ardından not eklemeyi öneren bildirim göster. */
export function useStatusChange() {
  const update = useUpdateTask();
  const toast = useToast();
  const drawer = useTaskDrawer();
  return (task: TaskDTO, status: TaskStatus) => {
    update.mutate({ id: task.id, status }, { onError: (e) => toast(e.message, { tone: "error" }) });
    const msg =
      status === "DONE"
        ? `“${task.title}” tamamlandı.`
        : `“${task.title}” artık ${STATUS_META[status].label.toLocaleLowerCase("tr-TR")}.`;
    toast(msg, { action: { label: "Not ekle", onClick: () => drawer.open(task.number) } });
  };
}

/** Bir görev satırının alt bilgisi: kişi · öncelik · etiketler · alt adımlar · ilerleme · notlar */
function MetaLine({ task, showAssignee }: { task: TaskDTO; showAssignee: boolean }) {
  const me = useSession();
  const parts: React.ReactNode[] = [];
  if (showAssignee) {
    parts.push(
      task.assignee ? (
        <span key="a" className="font-semibold text-ink">
          {task.assignee.id === me.id ? "Sen" : task.assignee.name}
          {!task.assignee.active && <span className="font-normal text-ink-muted"> (ayrıldı)</span>}
        </span>
      ) : (
        <span key="a">Kimseye verilmedi</span>
      ),
    );
  }
  if (task.priority === "URGENT" || task.priority === "HIGH") parts.push(<PriorityText key="p" priority={task.priority} />);
  task.tags.slice(0, 3).forEach((t) => parts.push(<span key={`t${t}`}>#{t}</span>));
  if (task.checklistTotal > 0) parts.push(<span key="c">{task.checklistDone}/{task.checklistTotal} adım</span>);
  if (task.status === "IN_PROGRESS" && task.progress > 0) parts.push(<span key="pr">ilerleme %{task.progress}</span>);
  if (task.commentCount > 0) parts.push(<span key="n">{task.commentCount} not</span>);
  if (!parts.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">·</span>}
          {p}
        </span>
      ))}
    </div>
  );
}

export function TaskRow({ task, showAssignee = true, avatar }: { task: TaskDTO; showAssignee?: boolean; avatar?: boolean }) {
  const drawer = useTaskDrawer();
  const changeStatus = useStatusChange();
  const closed = task.status === "DONE" || task.status === "CANCELLED";
  const isOpen = drawer.current === String(task.number);

  return (
    <div
      onClick={() => drawer.open(task.number)}
      className={cn(
        "flex min-h-16 cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-paper",
        isOpen && "bg-accent-soft hover:bg-accent-soft",
      )}
    >
      <input
        type="checkbox"
        checked={task.status === "DONE"}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => changeStatus(task, e.target.checked ? "DONE" : "TODO")}
        aria-label={task.status === "DONE" ? `“${task.title}” görevini yeniden aç` : `“${task.title}” görevini tamamlandı olarak işaretle`}
        className="size-6 shrink-0 cursor-pointer"
      />
      {avatar && <Avatar user={task.assignee} size="md" />}

      <div className="min-w-0 flex-[1_1_220px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            drawer.open(task.number);
          }}
          className={cn(
            "cursor-pointer text-left text-base hover:underline hover:underline-offset-2",
            closed ? "text-ink-muted line-through" : "text-ink",
          )}
        >
          {task.title}
        </button>
        <MetaLine task={task} showAssignee={showAssignee} />
      </div>

      <div className="ml-10 flex shrink-0 items-center gap-3 sm:ml-0">
        <DueLabel due={task.dueDate} status={task.status} />
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
              aria-label={`Durum: ${STATUS_META[task.status].label}. Değiştirmek için seç.`}
              className="cursor-pointer rounded-sm"
            >
              <StatusPill status={task.status} chevron />
            </button>
          )}
        />
      </div>
    </div>
  );
}
