"use client";

import type { ReactNode } from "react";
import { PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES, type Priority, type TaskStatus, type UserLite } from "@gorev/shared";
import { Check } from "lucide-react";
import { useUsers } from "@/lib/queries";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "./Avatar";
import { MenuItem, Popover } from "./Popover";
import { PriorityIcon, StatusIcon } from "./TaskIcons";

export function StatusMenu({
  value,
  onChange,
  trigger,
  align,
}: {
  value: TaskStatus;
  onChange: (s: TaskStatus) => void;
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  align?: "start" | "end";
}) {
  return (
    <Popover trigger={trigger} align={align}>
      {(close) =>
        TASK_STATUSES.map((s) => (
          <MenuItem
            key={s}
            active={s === value}
            onClick={() => {
              if (s !== value) onChange(s);
              close();
            }}
          >
            <StatusIcon status={s} progress={50} />
            <span className="flex-1">{STATUS_META[s].label}</span>
            {s === value && <Check className="size-3.5 text-zinc-400" />}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

export function PriorityMenu({
  value,
  onChange,
  trigger,
  align,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  align?: "start" | "end";
}) {
  return (
    <Popover trigger={trigger} align={align}>
      {(close) =>
        [...PRIORITIES].reverse().map((p) => (
          <MenuItem
            key={p}
            active={p === value}
            onClick={() => {
              if (p !== value) onChange(p);
              close();
            }}
          >
            <PriorityIcon priority={p} />
            <span className="flex-1">{PRIORITY_META[p].label}</span>
            {p === value && <Check className="size-3.5 text-zinc-400" />}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

export function AssigneeMenu({
  value,
  onChange,
  trigger,
  align,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  align?: "start" | "end";
}) {
  const me = useSession();
  const { data: users = [] } = useUsers();
  const active = users.filter((u) => u.active);
  // Oturum sahibi en üstte
  const sorted: UserLite[] = [...active.filter((u) => u.id === me.id), ...active.filter((u) => u.id !== me.id)];
  return (
    <Popover trigger={trigger} align={align} className="max-h-80 overflow-auto">
      {(close) => (
        <>
          {sorted.map((u) => (
            <MenuItem
              key={u.id}
              active={u.id === value}
              onClick={() => {
                if (u.id !== value) onChange(u.id);
                close();
              }}
            >
              <Avatar user={u} size="xs" />
              <span className="flex-1 truncate">
                {u.name}
                {u.id === me.id && <span className="text-zinc-400"> (ben)</span>}
              </span>
              {u.id === value && <Check className="size-3.5 text-zinc-400" />}
            </MenuItem>
          ))}
          <div className="my-1 border-t border-zinc-100" />
          <MenuItem
            active={value === null}
            onClick={() => {
              if (value !== null) onChange(null);
              close();
            }}
          >
            <Avatar user={null} size="xs" />
            <span className="flex-1">Atamayı kaldır</span>
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
