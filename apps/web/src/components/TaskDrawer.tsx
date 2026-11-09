"use client";

import { useEffect, useId, useState } from "react";
import { canAddNote, canChangeStatus, canEdit, longDate, type TaskDetailDTO } from "@gorev/shared";
import { X } from "lucide-react";
import { useAddNote, useDeleteTask, useTask, useUpdateTask, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { ActivityItem } from "./ActivityItem";
import { DueText, StatusPill } from "./TaskIcons";
import { TaskActions } from "./TaskActions";
import { useToast } from "./Toast";
import { Button, ErrorBox, Field, IconButton, Input, Spinner, Textarea } from "./ui";
import { Modal } from "./Modal";

export function TaskDrawer() {
  const drawer = useTaskDrawer();
  const { data: task, isLoading, error } = useTask(drawer.current);

  useEffect(() => {
    if (!drawer.current) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) drawer.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  if (!drawer.current) return null;

  return (
    <>
      <div className="animate-fade-in fixed inset-0 z-40 bg-scrim" onClick={drawer.close} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={task ? `Görev: ${task.title}` : "Görev"}
        className="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-pop md:w-[600px]"
      >
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-base text-ink-muted">
            {errorMessage(error)}
            <Button onClick={drawer.close}>Kapat</Button>
          </div>
        )}
        {task && <Detail key={task.id} task={task} onClose={drawer.close} />}
      </aside>
    </>
  );
}

function Detail({ task, onClose }: { task: TaskDetailDTO; onClose: () => void }) {
  const me = useSession();
  const perm = { creatorId: task.creator.id, assigneeId: task.assignee.id };
  const isDoer = canChangeStatus(me, perm);
  const editable = canEdit(me, perm);
  const noteable = canAddNote(me, perm);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const name = (u: { id: string; name: string }) => (u.id === me.id ? "Sen" : u.name);

  return (
    <>
      <div className="flex min-h-16 shrink-0 items-center gap-2 border-b border-line py-2 pr-2 pl-6">
        <span className="flex-1 text-[15px] text-ink-muted">Görev</span>
        {editable && (
          <>
            <Button size="sm" className="h-11" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
            <Button size="sm" variant="ghost" className="h-11 text-danger" onClick={() => setDeleting(true)}>
              Sil
            </Button>
          </>
        )}
        <IconButton label="Kapat" onClick={onClose}>
          <X className="size-6" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6">
          <h1 className="text-2xl font-bold break-words text-ink">{task.title}</h1>

          <dl className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-base">
            <dt className="text-ink-muted">Veren</dt>
            <dd className="font-semibold text-ink">{name(task.creator)}</dd>
            <dt className="text-ink-muted">Yapan</dt>
            <dd className="font-semibold text-ink">
              {name(task.assignee)}
              {!task.assignee.active && <span className="font-normal text-ink-muted"> (ekipten ayrıldı)</span>}
            </dd>
            <dt className="text-ink-muted">Son tarih</dt>
            <dd className="text-ink">
              {task.dueDate ? (
                <>
                  <b className="font-semibold">{longDate(task.dueDate)}</b>
                  {task.status !== "DONE" && (
                    <>
                      {" · "}
                      <DueText due={task.dueDate} status={task.status} />
                    </>
                  )}
                </>
              ) : (
                <span className="text-ink-muted">Yok</span>
              )}
            </dd>
            <dt className="self-center text-ink-muted">Durum</dt>
            <dd>
              <StatusPill status={task.status} />
            </dd>
          </dl>

          {isDoer ? (
            <TaskActions task={task} size="lg" className="[&>button]:flex-1" />
          ) : (
            task.status !== "DONE" && <p className="rounded-md bg-paper px-4 py-3 text-base text-ink-muted">Durumu yalnızca {task.assignee.name} değiştirebilir.</p>
          )}

          {task.description && (
            <section className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-ink">Açıklama</h2>
              <p className="text-base whitespace-pre-wrap break-words text-ink">{task.description}</p>
            </section>
          )}

          {noteable && <NoteBox taskId={task.id} />}
        </div>

        <section className="flex flex-col gap-4 border-t border-line bg-paper p-6">
          <h2 className="text-lg font-bold text-ink">Geçmiş</h2>
          {[...task.activities].reverse().map((a) => (
            <ActivityItem key={a.id} a={a} />
          ))}
        </section>
      </div>

      {editing && <EditModal task={task} onClose={() => setEditing(false)} />}
      {deleting && <DeleteModal task={task} onClose={() => setDeleting(false)} onDeleted={onClose} />}
    </>
  );
}

function NoteBox({ taskId }: { taskId: string }) {
  const add = useAddNote();
  const toast = useToast();
  const id = useId();
  const [message, setMessage] = useState("");
  const submit = async () => {
    const m = message.trim();
    if (!m) return;
    try {
      await add.mutateAsync({ id: taskId, message: m });
      setMessage("");
      toast("Not eklendi.");
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    }
  };
  return (
    <section className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-lg font-bold text-ink">
        Not ekle
      </label>
      <Textarea id={id} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ne yaptın, son durum ne?" className="resize-none" />
      <Button className="self-end" onClick={() => void submit()} disabled={!message.trim()} loading={add.isPending}>
        Kaydet
      </Button>
    </section>
  );
}

function EditModal({ task, onClose }: { task: TaskDetailDTO; onClose: () => void }) {
  const me = useSession();
  const { data: users = [] } = useUsers();
  const update = useUpdateTask();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [assigneeId, setAssigneeId] = useState(task.assignee.id);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ id: task.id, title, assigneeId, dueDate: dueDate || null, description: description || null });
      toast("Görev kaydedildi.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const people = users.some((u) => u.id === task.assignee.id) ? users : [task.assignee, ...users];

  return (
    <Modal open onClose={onClose} title="Görevi düzenle">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Ne yapılacak?">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Kime?">
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="h-11 w-full cursor-pointer rounded-md border border-line-strong bg-surface px-3 text-base text-ink">
            {people.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === me.id ? "Ben" : u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Son tarih">
          <div className="flex gap-2">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            {dueDate && (
              <Button onClick={() => setDueDate("")}>Kaldır</Button>
            )}
          </div>
        </Field>
        <Field label="Açıklama">
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="İsteğe bağlı" />
        </Field>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={update.isPending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ task, onClose, onDeleted }: { task: TaskDetailDTO; onClose: () => void; onDeleted: () => void }) {
  const del = useDeleteTask();
  const toast = useToast();
  return (
    <Modal
      open
      onClose={onClose}
      title="Görev silinsin mi?"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button
            variant="danger"
            loading={del.isPending}
            onClick={async () => {
              try {
                await del.mutateAsync(task.id);
                onClose();
                onDeleted();
                toast("Görev silindi.");
              } catch (e) {
                toast(errorMessage(e), { tone: "error" });
              }
            }}
          >
            Sil
          </Button>
        </>
      }
    >
      <p className="text-base text-ink">
        <b>“{task.title}”</b> ve notları kalıcı olarak silinecek.
      </p>
    </Modal>
  );
}
