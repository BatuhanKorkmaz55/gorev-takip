"use client";

import { useState } from "react";
import type { TaskDTO, TaskStatus } from "@gorev/shared";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_STYLE } from "./TaskIcons";
import { TaskRow } from "./TaskRow";
import { Card, EmptyState } from "./ui";

const DONE_LIMIT = 30;

/** Görevleri duruma göre üç bölümde gösterir; "Tamamlanan" kapalı başlar. */
export function TaskList({ tasks, show, empty }: { tasks: TaskDTO[]; show: "from" | "to"; empty: string }) {
  const by = (s: TaskStatus) => tasks.filter((t) => t.status === s);
  const todo = by("TODO");
  const doing = by("IN_PROGRESS");
  const done = by("DONE").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <div className="flex flex-col gap-4">
      {!todo.length && !doing.length && (
        <Card>
          <EmptyState title={empty} />
        </Card>
      )}
      {todo.length > 0 && <Section title="Yapılacak" status="TODO" tasks={todo} show={show} />}
      {doing.length > 0 && <Section title="Devam ediyor" status="IN_PROGRESS" tasks={doing} show={show} />}
      {done.length > 0 && <Section title="Tamamlanan" status="DONE" tasks={done.slice(0, DONE_LIMIT)} total={done.length} show={show} collapsible />}
    </div>
  );
}

function Section({
  title,
  status,
  tasks,
  total,
  show,
  collapsible,
}: {
  title: string;
  status: TaskStatus;
  tasks: TaskDTO[];
  total?: number;
  show: "from" | "to";
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const heading = `${title} · ${total ?? tasks.length}`;
  return (
    <Card>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cn("flex min-h-14 w-full cursor-pointer items-center gap-3 px-5 text-left text-lg font-bold", STATUS_STYLE[status].text, open && "border-b border-line")}
        >
          <span className="flex-1">{heading}</span>
          <span className="text-[15px] font-semibold text-accent">{open ? "Gizle" : "Göster"}</span>
          <ChevronDown className={cn("size-5 text-accent transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      ) : (
        <h2 className={cn("border-b border-line px-5 py-3.5 text-lg font-bold", status === "TODO" ? "text-ink" : STATUS_STYLE[status].text)}>{heading}</h2>
      )}
      {open && (
        <div className="divide-y divide-line">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} show={show} />
          ))}
        </div>
      )}
    </Card>
  );
}
