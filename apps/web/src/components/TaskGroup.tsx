"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TaskGroupData } from "@/lib/grouping";
import { cn } from "@/lib/utils";
import { TaskRow } from "./TaskRow";

export function TaskGroup({
  group,
  showHeader = true,
  defaultCollapsed = false,
  showAssignee = true,
  avatar,
  limit,
}: {
  group: TaskGroupData;
  showHeader?: boolean;
  defaultCollapsed?: boolean;
  showAssignee?: boolean;
  avatar?: boolean;
  limit?: number;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState(false);
  const visible = limit && !expanded ? group.tasks.slice(0, limit) : group.tasks;
  return (
    <section>
      {showHeader && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className="flex min-h-10 w-full cursor-pointer items-center gap-2 bg-sunken px-5 py-2 text-left"
        >
          <span
            className={cn(
              "flex-1 text-sm font-semibold",
              group.tone === "danger" ? "text-danger" : group.tone === "warn" ? "text-blocked-ink" : "text-todo-ink",
            )}
          >
            {group.label} · {group.tasks.length}
          </span>
          <span className="text-sm text-ink-muted">{collapsed ? "Göster" : "Gizle"}</span>
          <ChevronDown className={cn("size-4 text-ink-muted transition-transform", collapsed && "-rotate-90")} aria-hidden="true" />
        </button>
      )}
      {!collapsed && (
        <div className="divide-y divide-line">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} showAssignee={showAssignee} avatar={avatar} />
          ))}
          {limit && group.tasks.length > limit && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="min-h-11 w-full cursor-pointer px-5 text-left text-base font-semibold text-accent hover:bg-paper"
            >
              {expanded ? "Daha az göster" : `${group.tasks.length - limit} görev daha göster`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
