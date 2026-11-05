"use client";

import type { TaskDTO } from "@gorev/shared";
import { cn } from "@/lib/utils";
import { Button } from "./ui";
import { useStatusActions } from "./useStatusActions";

/** Görevi yapan kişinin düğmeleri: Başla + Tamamla / Tamamla / Geri al */
export function TaskActions({ task, size = "md", className }: { task: TaskDTO; size?: "md" | "lg"; className?: string }) {
  const act = useStatusActions();
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const sz = size === "lg" ? "h-13 text-lg" : "";
  return (
    <div className={cn("flex gap-2", className)}>
      {task.status === "TODO" && (
        <Button className={cn("flex-1 sm:flex-none", sz)} onClick={stop(() => act(task, "IN_PROGRESS"))}>
          Başla
        </Button>
      )}
      {task.status !== "DONE" && (
        <Button variant="primary" className={cn("flex-1 sm:flex-none", sz)} onClick={stop(() => act(task, "DONE"))}>
          Tamamla
        </Button>
      )}
      {task.status === "DONE" && (
        <Button className={cn("flex-1 sm:flex-none", sz)} onClick={stop(() => act(task, "TODO"))}>
          Geri al
        </Button>
      )}
    </div>
  );
}
