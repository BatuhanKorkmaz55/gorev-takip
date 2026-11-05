"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { TaskGroupData } from "@/lib/grouping";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { PriorityIcon, StatusIcon } from "./TaskIcons";
import { TaskRow } from "./TaskRow";

export function TaskGroup({
  group,
  showHeader = true,
  defaultCollapsed = false,
  showAssignee = true,
  limit,
}: {
  group: TaskGroupData;
  showHeader?: boolean;
  defaultCollapsed?: boolean;
  showAssignee?: boolean;
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
          className="sticky top-14 z-10 flex w-full items-center gap-2 border-b border-zinc-100 bg-zinc-50/95 px-3 py-2 text-left backdrop-blur md:top-0"
        >
          <ChevronRight className={cn("size-3.5 text-zinc-400 transition-transform", !collapsed && "rotate-90")} />
          {group.status && <StatusIcon status={group.status} progress={50} className="size-3.5" />}
          {group.priority && <PriorityIcon priority={group.priority} className="size-3.5" />}
          {group.kind === "assignee" && <Avatar user={group.user ?? null} size="xs" />}
          <span
            className={cn(
              "text-[13px] font-semibold",
              group.tone === "danger" ? "text-red-600" : group.tone === "warn" ? "text-amber-700" : "text-zinc-700",
            )}
          >
            {group.label}
          </span>
          <span className="text-xs tabular-nums text-zinc-400">{group.tasks.length}</span>
        </button>
      )}
      {!collapsed && (
        <div className="divide-y divide-zinc-100">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} showAssignee={showAssignee} />
          ))}
          {limit && group.tasks.length > limit && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800">
              {expanded ? "Daha az göster" : `${group.tasks.length - limit} görev daha göster`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
