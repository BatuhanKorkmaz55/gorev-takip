"use client";

import type { ReactNode } from "react";
import { PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES, type Priority, type TaskStatus, type UserLite } from "@gorev/shared";
import { Check } from "lucide-react";
import { useUsers } from "@/lib/queries";
import { useSession } from "@/hooks/useSession";
import { Avatar } from "./Avatar";
import { MenuItem, MenuLabel, Popover } from "./Popover";
import { PriorityText, StatusIcon } from "./TaskIcons";

type Trigger = (p: { open: boolean; toggle: () => void }) => ReactNode;

export function StatusMenu({ value, onChange, trigger, align }: { value: TaskStatus; onChange: (s: TaskStatus) => void; trigger: Trigger; align?: "start" | "end" }) {
  return (
    <Popover trigger={trigger} align={align}>
      {(close) => (
        <>
          <MenuLabel>Durumu değiştir</MenuLabel>
          {TASK_STATUSES.map((s) => (
            <MenuItem
              key={s}
              active={s === value}
              onClick={() => {
                if (s !== value) onChange(s);
                close();
              }}
            >
              <StatusIcon status={s} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              {s === value && <Check className="size-4" aria-label="Seçili" />}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

export function PriorityMenu({ value, onChange, trigger, align }: { value: Priority; onChange: (p: Priority) => void; trigger: Trigger; align?: "start" | "end" }) {
  return (
    <Popover trigger={trigger} align={align}>
      {(close) => (
        <>
          <MenuLabel>Öncelik</MenuLabel>
          {[...PRIORITIES].reverse().map((p) => (
            <MenuItem
              key={p}
              active={p === value}
              onClick={() => {
                if (p !== value) onChange(p);
                close();
              }}
            >
              <PriorityText priority={p} always className="flex-1 text-base" />
              {p === value && <Check className="size-4" aria-label="Seçili" />}
            </MenuItem>
          ))}
        </>
      )}
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
  trigger: Trigger;
  align?: "start" | "end";
}) {
  const me = useSession();
  const { data: users = [] } = useUsers();
  const active = users.filter((u) => u.active);
  const sorted: UserLite[] = [...active.filter((u) => u.id === me.id), ...active.filter((u) => u.id !== me.id)];
  return (
    <Popover trigger={trigger} align={align} className="max-h-96 w-72 overflow-auto">
      {(close) => (
        <>
          <MenuLabel>Kime verilsin?</MenuLabel>
          {sorted.map((u) => (
            <MenuItem
              key={u.id}
              active={u.id === value}
              onClick={() => {
                if (u.id !== value) onChange(u.id);
                close();
              }}
            >
              <Avatar user={u} size="sm" />
              <span className="flex-1 truncate">
                {u.name}
                {u.id === me.id && <span className="text-ink-muted"> (ben)</span>}
              </span>
              {u.id === value && <Check className="size-4" aria-label="Seçili" />}
            </MenuItem>
          ))}
          <div className="my-1 border-t border-line" />
          <MenuItem
            active={value === null}
            onClick={() => {
              if (value !== null) onChange(null);
              close();
            }}
          >
            <Avatar user={null} size="sm" />
            <span className="flex-1">Kimseye verme</span>
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
