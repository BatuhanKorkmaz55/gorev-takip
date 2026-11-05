"use client";

import { useId, useMemo, useState } from "react";
import { addDaysKey, type TaskDTO } from "@gorev/shared";
import { useCreateTask, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn, todayKey } from "@/lib/utils";
import { useToast } from "./Toast";
import { Button, ErrorBox } from "./ui";

type When = "" | "today" | "tomorrow" | "pick";

const field =
  "h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink outline-none placeholder:text-ink-muted focus:border-accent focus:ring-3 focus:ring-accent/20";

/** Görev ver: ne yapılacak, kime, ne zamana. */
export function NewTaskForm({ autoFocus, bare, onCreated }: { autoFocus?: boolean; bare?: boolean; onCreated?: (t: TaskDTO) => void }) {
  const me = useSession();
  const id = useId();
  const { data: users = [] } = useUsers();
  const create = useCreateTask();
  const toast = useToast();
  const drawer = useTaskDrawer();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(me.id);
  const [when, setWhen] = useState<When>("");
  const [picked, setPicked] = useState("");
  const [error, setError] = useState<string | null>(null);

  const others = useMemo(() => users.filter((u) => u.id !== me.id), [users, me.id]);
  const today = todayKey();
  const dueDate = when === "today" ? today : when === "tomorrow" ? addDaysKey(today, 1) : when === "pick" && picked ? picked : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Ne yapılacağını yaz.");
      return;
    }
    try {
      const task = await create.mutateAsync({ title: title.trim(), assigneeId, dueDate });
      setTitle("");
      setWhen("");
      setPicked("");
      toast(task.assignee.id === me.id ? "Görev eklendi." : `Görev ${task.assignee.name} kişisine verildi.`, {
        action: { label: "Aç", onClick: () => drawer.open(task.number) },
      });
      onCreated?.(task);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-3", !bare && "rounded-lg border border-line bg-surface p-5 shadow-card")}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
          <span className="text-[15px] font-bold text-ink">Ne yapılacak?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={autoFocus} placeholder="Örn: Teklif dosyasını hazırla" className={field} />
        </label>
        <label className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5 sm:flex-[0_1_210px]">
          <span className="text-[15px] font-bold text-ink">Kime?</span>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={cn(field, "cursor-pointer pr-9")}>
            <option value={me.id}>Ben</option>
            {others.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5 sm:flex-[0_1_170px]">
          <span className="text-[15px] font-bold text-ink">Ne zamana?</span>
          <select value={when} onChange={(e) => setWhen(e.target.value as When)} className={cn(field, "cursor-pointer pr-9")}>
            <option value="">Tarih yok</option>
            <option value="today">Bugün</option>
            <option value="tomorrow">Yarın</option>
            <option value="pick">Tarih seç…</option>
          </select>
        </label>
        {when === "pick" && (
          <label className="flex min-w-0 flex-[1_1_170px] flex-col gap-1.5 sm:flex-[0_1_180px]">
            <span className="text-[15px] font-bold text-ink">Tarih</span>
            <input id={`${id}-tarih`} type="date" min={today} value={picked} onChange={(e) => setPicked(e.target.value)} className={field} />
          </label>
        )}
        <Button type="submit" variant="primary" className="h-12 w-full px-6 sm:w-auto" loading={create.isPending}>
          Ekle
        </Button>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
    </form>
  );
}
