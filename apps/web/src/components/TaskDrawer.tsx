"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  STATUS_META,
  TASK_STATUSES,
  addDaysKey,
  longDate,
  type TaskDetailDTO,
  type TaskStatus,
  type UpdateTaskInput,
} from "@gorev/shared";
import { Ellipsis, Trash2, X } from "lucide-react";
import { useAddComment, useChecklist, useDeleteTask, useTags, useTask, useUpdateTask } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { cn, timeAgo, todayKey } from "@/lib/utils";
import { ActivityItem } from "./ActivityItem";
import { Avatar } from "./Avatar";
import { AssigneeMenu, PriorityMenu } from "./Pickers";
import { MenuItem, Popover } from "./Popover";
import { DueLabel, PriorityText, STATUS_STYLE, StatusIcon } from "./TaskIcons";
import { useToast } from "./Toast";
import { Button, IconButton, Spinner } from "./ui";
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
      <div className="animate-fade-in fixed inset-0 z-40 bg-ink/25" onClick={drawer.close} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={task ? `Görev: ${task.title}` : "Görev"}
        className="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-pop md:w-[640px]"
      >
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-base text-ink-muted">
            {errorMessage(error)}
            <Button onClick={drawer.close}>Paneli kapat</Button>
          </div>
        )}
        {task && <TaskDetail key={task.id} task={task} onClose={drawer.close} />}
      </aside>
    </>
  );
}

function TaskDetail({ task, onClose }: { task: TaskDetailDTO; onClose: () => void }) {
  const me = useSession();
  const update = useUpdateTask();
  const del = useDeleteTask();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const canDelete = task.creator.id === me.id || me.role === "ADMIN";

  const save = (patch: UpdateTaskInput) =>
    update.mutate({ id: task.id, ...patch }, { onError: (e) => toast(e.message, { tone: "error" }) });

  const setStatus = (s: TaskStatus) => {
    save({ status: s });
    toast(`Durum “${STATUS_META[s].label}” oldu. İstersen ne yaptığını not et.`);
    noteRef.current?.focus();
  };

  return (
    <>
      {/* Üst çubuk */}
      <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line py-2 pr-2 pl-6">
        <span className="rounded-sm bg-todo px-2 py-1 text-sm font-semibold whitespace-nowrap text-todo-ink">Görev #{task.number}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
          {task.creator.id === me.id ? "Sen" : task.creator.name} oluşturdu · {timeAgo(task.createdAt)}
        </span>
        <Button
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => {
            void navigator.clipboard?.writeText(`${location.origin}/gorevler?gorev=${task.number}`);
            toast("Görevin bağlantısı kopyalandı.");
          }}
        >
          Bağlantıyı kopyala
        </Button>
        {canDelete && (
          <Popover
            align="end"
            trigger={({ toggle }) => (
              <IconButton label="Diğer işlemler" onClick={toggle}>
                <Ellipsis className="size-5" />
              </IconButton>
            )}
          >
            {(close) => (
              <MenuItem
                danger
                onClick={() => {
                  close();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="size-5" aria-hidden="true" /> Görevi sil
              </MenuItem>
            )}
          </Popover>
        )}
        <IconButton label="Paneli kapat" onClick={onClose}>
          <X className="size-6" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6">
          <TitleEditor value={task.title} onSave={(title) => save({ title })} />

          {/* Durum */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-ink-muted">Durum</legend>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUSES.map((s) => {
                const selected = s === task.status;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => !selected && setStatus(s)}
                    className={cn(
                      "inline-flex h-11 cursor-pointer items-center gap-2 rounded-md px-3.5 text-[15px] transition-colors",
                      selected
                        ? cn(STATUS_STYLE[s].pill, STATUS_STYLE[s].border, "border-2 font-bold")
                        : "border border-line-strong bg-surface text-ink hover:bg-paper",
                    )}
                  >
                    <StatusIcon status={s} />
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <NoteBox task={task} ref={noteRef} />

          {/* Bilgiler */}
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 sm:grid-cols-[136px_minmax(0,1fr)]">
            <dt className="text-[15px] text-ink-muted">Sorumlu</dt>
            <dd>
              <AssigneeMenu
                value={task.assignee?.id ?? null}
                onChange={(assigneeId) => save({ assigneeId })}
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="-ml-3 inline-flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2.5 rounded-md px-3 text-left text-base text-ink hover:bg-paper"
                  >
                    <Avatar user={task.assignee} size="sm" />
                    {task.assignee ? (
                      <span>
                        {task.assignee.name}
                        {task.assignee.id === me.id && <span className="text-ink-muted"> (sen)</span>}
                        {!task.assignee.active && <span className="text-ink-muted"> (ekipten ayrıldı)</span>}
                      </span>
                    ) : (
                      <span className="text-ink-muted">Kimseye verilmedi</span>
                    )}
                    <span className="text-sm font-semibold text-accent">Değiştir</span>
                  </button>
                )}
              />
            </dd>

            <dt className="text-[15px] text-ink-muted">Bitiş tarihi</dt>
            <dd className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1">
              <DueDateEditor task={task} onSave={(dueDate) => save({ dueDate })} />
            </dd>

            <dt className="text-[15px] text-ink-muted">Öncelik</dt>
            <dd>
              <PriorityMenu
                value={task.priority}
                onChange={(priority) => save({ priority })}
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="-ml-3 inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-base hover:bg-paper"
                  >
                    <PriorityText priority={task.priority} always className="text-base" />
                    <span className="text-sm font-semibold text-accent">Değiştir</span>
                  </button>
                )}
              />
            </dd>

            <dt className="text-[15px] text-ink-muted">İlerleme</dt>
            <dd>
              <ProgressEditor value={task.progress} onSave={(progress) => save({ progress })} />
            </dd>

            <dt className="self-start pt-2.5 text-[15px] text-ink-muted">Etiketler</dt>
            <dd>
              <TagsEditor tags={task.tags} onSave={(tags) => save({ tags })} />
            </dd>
          </dl>

          <DescriptionEditor value={task.description ?? ""} onSave={(description) => save({ description })} />

          <Checklist task={task} />
        </div>

        {/* Geçmiş */}
        <section className="flex flex-col gap-5 border-t border-line bg-paper p-6">
          <h2 className="text-lg font-bold text-ink">Geçmiş</h2>
          {[...task.activities].reverse().map((a) => (
            <ActivityItem key={a.id} a={a} noteBg="bg-surface border border-line" />
          ))}
        </section>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Görev silinsin mi?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Vazgeç</Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={async () => {
                await del.mutateAsync(task.id);
                setConfirmDelete(false);
                onClose();
                toast(`“${task.title}” silindi.`);
              }}
            >
              Evet, görevi sil
            </Button>
          </>
        }
      >
        <p className="text-base text-ink">
          <b>“{task.title}”</b> ve tüm geçmişi kalıcı olarak silinecek. Görevi yalnızca kapatmak istiyorsan durumunu <b>İptal</b> yapman yeterli.
        </p>
      </Modal>
    </>
  );
}

function TitleEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [v]);
  const commit = () => {
    const t = v.trim();
    if (!t) setV(value);
    else if (t !== value) onSave(t);
  };
  return (
    <textarea
      ref={ref}
      value={v}
      rows={1}
      onChange={(e) => setV(e.target.value.replace(/\n/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setV(value);
          e.currentTarget.blur();
        }
      }}
      className="-mx-3 w-[calc(100%+1.5rem)] resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-3 py-1 text-2xl font-bold text-ink outline-none hover:border-line focus:border-accent"
      aria-label="Görev başlığı (değiştirmek için yaz)"
    />
  );
}

const NoteBox = ({ task, ref }: { task: TaskDetailDTO; ref: React.Ref<HTMLTextAreaElement> }) => {
  const add = useAddComment();
  const toast = useToast();
  const id = useId();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");

  const submit = async () => {
    const m = message.trim();
    if (!m) {
      toast("Önce kısa bir not yaz.", { tone: "error" });
      return;
    }
    try {
      await add.mutateAsync({ id: task.id, message: m, status: status || undefined });
      setMessage("");
      setStatus("");
      toast("Notun geçmişe eklendi.");
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    }
  };

  return (
    <section aria-label="Güncelleme notu" className="flex flex-col gap-3 rounded-lg bg-paper p-4">
      <label htmlFor={`${id}-not`} className="text-lg font-bold text-ink">
        Ne yaptın? Kısa bir not bırak
      </label>
      <textarea
        id={`${id}-not`}
        ref={ref}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={3}
        placeholder="Örn: Müşteriyle görüştüm, yarın dönüş yapacaklar."
        className="w-full resize-none rounded-md border border-line-strong bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus:border-accent focus:ring-3 focus:ring-accent/20"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`${id}-durum`} className="text-[15px] text-ink-muted">
          Durumu da değiştir:
        </label>
        <select
          id={`${id}-durum`}
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          className="h-11 cursor-pointer rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink"
        >
          <option value="">Değiştirme ({STATUS_META[task.status].label})</option>
          {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <Button variant="primary" className="ml-auto" onClick={() => void submit()} loading={add.isPending}>
          Notu kaydet
        </Button>
      </div>
    </section>
  );
};

function DueDateEditor({ task, onSave }: { task: TaskDetailDTO; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const today = todayKey();
  if (editing || !task.dueDate) {
    return (
      <>
        <input
          type="date"
          aria-label="Bitiş tarihi seç"
          value={task.dueDate ?? ""}
          onChange={(e) => {
            onSave(e.target.value || null);
            setEditing(false);
          }}
          className="h-11 rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
        />
        {[
          ["Bugün", 0],
          ["Yarın", 1],
          ["1 hafta sonra", 7],
        ].map(([l, d]) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              onSave(addDaysKey(today, d as number));
              setEditing(false);
            }}
            className="min-h-11 cursor-pointer text-sm font-semibold text-accent hover:underline"
          >
            {l}
          </button>
        ))}
      </>
    );
  }
  return (
    <>
      <span className="text-base font-semibold text-ink">{longDate(task.dueDate)}</span>
      <DueLabel due={task.dueDate} status={task.status} />
      <button type="button" onClick={() => setEditing(true)} className="min-h-11 cursor-pointer text-sm font-semibold text-accent hover:underline">
        Değiştir
      </button>
      <button type="button" onClick={() => onSave(null)} className="min-h-11 cursor-pointer text-sm font-semibold text-danger hover:underline">
        Kaldır
      </button>
    </>
  );
}

function ProgressEditor({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onSave(v);
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="h-2 w-full max-w-60 cursor-pointer"
        aria-label="İlerleme yüzdesi"
        aria-valuetext={`Yüzde ${v}`}
      />
      <span className="w-12 text-base font-semibold text-ink tabular-nums">%{v}</span>
    </div>
  );
}

function TagsEditor({ tags, onSave }: { tags: string[]; onSave: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const listId = useId();
  const { data: all = [] } = useTags();
  const add = () => {
    const t = input.trim().replace(/^#/, "").toLocaleLowerCase("tr-TR");
    setInput("");
    if (t && !tags.includes(t)) onSave([...tags, t]);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex h-9 items-center gap-1 rounded-sm bg-todo pr-1 pl-2.5 text-sm font-semibold text-todo-ink">
          #{t}
          <button
            type="button"
            onClick={() => onSave(tags.filter((x) => x !== t))}
            className="flex size-7 cursor-pointer items-center justify-center rounded-sm hover:bg-sunken"
            aria-label={`${t} etiketini kaldır`}
          >
            <X className="size-4" />
          </button>
        </span>
      ))}
      <input
        value={input}
        list={listId}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Etiket yaz, Enter'a bas"
        aria-label="Yeni etiket"
        className="h-9 w-48 rounded-md border border-line-strong bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-muted"
      />
      <datalist id={listId}>
        {all.filter((t) => !tags.includes(t.tag)).map((t) => (
          <option key={t.tag} value={t.tag} />
        ))}
      </datalist>
    </div>
  );
}

function DescriptionEditor({ value, onSave }: { value: string; onSave: (v: string | null) => void }) {
  const [v, setV] = useState(value);
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(96, el.scrollHeight)}px`;
    }
  }, [v]);
  return (
    <section className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-bold text-ink">
        Açıklama
      </label>
      <textarea
        id={id}
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v.trim() ? v : null)}
        placeholder="İşin ayrıntıları, bağlantılar, dikkat edilecekler…"
        className="w-full resize-none rounded-md border border-line-strong bg-surface px-3.5 py-3 text-base leading-6 text-ink outline-none placeholder:text-ink-muted focus:border-accent focus:ring-3 focus:ring-accent/20"
      />
    </section>
  );
}

function Checklist({ task }: { task: TaskDetailDTO }) {
  const { add, update, remove } = useChecklist(task.id);
  const id = useId();
  const [text, setText] = useState("");
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    add.mutate(t);
    setText("");
  };

  return (
    <section className="flex flex-col gap-1">
      <h2 className="mb-1 text-lg font-bold text-ink">
        Alt adımlar {total > 0 && <span className="text-[15px] font-normal text-ink-muted">· {done} / {total} bitti</span>}
      </h2>
      {task.checklist.map((c) => (
        <div key={c.id} className="flex min-h-11 items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={c.done} onChange={(e) => update.mutate({ itemId: c.id, done: e.target.checked })} className="size-[22px] cursor-pointer" />
            <span className={cn("text-base", c.done ? "text-ink-muted line-through" : "text-ink")}>{c.text}</span>
          </label>
          <IconButton label={`“${c.text}” adımını kaldır`} onClick={() => remove.mutate(c.id)} className="size-9 text-ink-muted">
            <X className="size-4" />
          </IconButton>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap gap-2">
        <label htmlFor={id} className="sr-only">
          Yeni alt adım
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Yeni adım yaz…"
          className="h-11 min-w-0 flex-[1_1_220px] rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-muted"
        />
        <Button onClick={submit} disabled={!text.trim()}>
          Adımı ekle
        </Button>
      </div>
    </section>
  );
}

