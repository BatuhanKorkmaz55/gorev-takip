"use client";

import { useEffect, useRef, useState } from "react";
import {
  PRIORITY_META,
  STATUS_META,
  TASK_STATUSES,
  addDaysKey,
  type TaskDetailDTO,
  type TaskStatus,
  type UpdateTaskInput,
} from "@gorev/shared";
import { Ellipsis, Link2, ListChecks, Plus, Send, Trash2, X } from "lucide-react";
import { useAddComment, useChecklist, useDeleteTask, useTags, useTask, useUpdateTask } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { useSession } from "@/hooks/useSession";
import { cn, fullDateTime, timeAgo, todayKey } from "@/lib/utils";
import { ActivityItem } from "./ActivityItem";
import { Avatar } from "./Avatar";
import { AssigneeMenu, PriorityMenu } from "./Pickers";
import { MenuItem, Popover } from "./Popover";
import { DueBadge, PriorityIcon, STATUS_PILL, STATUS_RING, StatusIcon } from "./TaskIcons";
import { useToast } from "./Toast";
import { Button, IconButton, Kbd, Spinner } from "./ui";
import { Modal } from "./Modal";

export function TaskDrawer() {
  const drawer = useTaskDrawer();
  const { data: task, isLoading, error } = useTask(drawer.current);

  useEffect(() => {
    if (!drawer.current) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape" && !["INPUT", "TEXTAREA"].includes(t.tagName)) drawer.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  if (!drawer.current) return null;

  return (
    <>
      <div className="animate-fade-in fixed inset-0 z-40 bg-zinc-900/10 md:bg-zinc-900/5" onClick={drawer.close} />
      <aside className="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-zinc-50 shadow-2xl md:w-[640px]">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
            {errorMessage(error)}
            <Button onClick={drawer.close}>Kapat</Button>
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
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const canDelete = task.creator.id === me.id || me.role === "ADMIN";

  const save = (patch: UpdateTaskInput) =>
    update.mutate({ id: task.id, ...patch }, { onError: (e) => toast(e.message, { tone: "error" }) });

  const setStatus = (s: TaskStatus) => {
    save({ status: s });
    composerRef.current?.focus();
  };

  return (
    <>
      {/* Üst çubuk */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-4">
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-500">#{task.number}</span>
        <span className="truncate text-xs text-zinc-400">
          {task.creator.name} oluşturdu · {timeAgo(task.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label="Bağlantıyı kopyala"
            onClick={() => {
              void navigator.clipboard?.writeText(`${location.origin}/gorevler?gorev=${task.number}`);
              toast("Bağlantı kopyalandı");
            }}
          >
            <Link2 className="size-4" />
          </IconButton>
          {canDelete && (
            <Popover
              align="end"
              trigger={({ toggle }) => (
                <IconButton label="Diğer" onClick={toggle}>
                  <Ellipsis className="size-4" />
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
                  <Trash2 className="size-4" /> Görevi sil
                </MenuItem>
              )}
            </Popover>
          )}
          <IconButton label="Kapat (Esc)" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 bg-white px-5 pb-5 pt-4">
          <TitleEditor value={task.title} onSave={(title) => save({ title })} />

          {/* Durum: tek tıkla değiştir */}
          <div className="flex flex-wrap gap-1.5">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => s !== task.status && setStatus(s)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition",
                  s === task.status
                    ? cn(STATUS_PILL[s], STATUS_RING[s], "border-transparent font-semibold ring-1 ring-inset")
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
                )}
              >
                <StatusIcon status={s} progress={s === "IN_PROGRESS" ? task.progress || 50 : 0} className="size-3.5" />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          {/* Özellikler */}
          <dl className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-zinc-500">Sorumlu</dt>
            <dd>
              <AssigneeMenu
                value={task.assignee?.id ?? null}
                onChange={(assigneeId) => save({ assigneeId })}
                trigger={({ toggle }) => (
                  <PropButton onClick={toggle}>
                    <Avatar user={task.assignee} size="xs" className="ring-0" />
                    {task.assignee ? task.assignee.name : <span className="text-zinc-400">Atanmamış</span>}
                    {task.assignee && !task.assignee.active && <span className="text-xs text-zinc-400">(ayrıldı)</span>}
                  </PropButton>
                )}
              />
            </dd>

            <dt className="text-zinc-500">Öncelik</dt>
            <dd>
              <PriorityMenu
                value={task.priority}
                onChange={(priority) => save({ priority })}
                trigger={({ toggle }) => (
                  <PropButton onClick={toggle}>
                    <PriorityIcon priority={task.priority} />
                    {PRIORITY_META[task.priority].label}
                  </PropButton>
                )}
              />
            </dd>

            <dt className="text-zinc-500">Bitiş tarihi</dt>
            <dd className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) => save({ dueDate: e.target.value || null })}
                className="h-8 rounded-lg border border-transparent px-2 text-sm text-zinc-800 hover:border-zinc-200 focus:border-accent-500 focus:outline-none"
              />
              <DueBadge due={task.dueDate} status={task.status} />
              <span className="flex gap-1">
                {[
                  ["Bugün", 0],
                  ["Yarın", 1],
                  ["+1 hafta", 7],
                ].map(([l, d]) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => save({ dueDate: addDaysKey(todayKey(), d as number) })}
                    className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  >
                    {l}
                  </button>
                ))}
                {task.dueDate && (
                  <button type="button" onClick={() => save({ dueDate: null })} className="rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-red-600">
                    Kaldır
                  </button>
                )}
              </span>
            </dd>

            <dt className="text-zinc-500">İlerleme</dt>
            <dd>
              <ProgressEditor value={task.progress} onSave={(progress) => save({ progress })} />
            </dd>

            <dt className="self-start pt-1.5 text-zinc-500">Etiketler</dt>
            <dd>
              <TagsEditor tags={task.tags} onSave={(tags) => save({ tags })} />
            </dd>
          </dl>

          <DescriptionEditor value={task.description ?? ""} onSave={(description) => save({ description })} />

          <Checklist task={task} />
        </div>

        {/* Güncellemeler */}
        <div className="space-y-4 px-5 py-5">
          <h3 className="text-[13px] font-semibold text-zinc-800">Güncellemeler ve geçmiş</h3>
          <Composer task={task} ref={composerRef} />
          <div className="space-y-4">
            {[...task.activities].reverse().map((a) => (
              <ActivityItem key={a.id} a={a} />
            ))}
          </div>
          <p className="pt-2 text-center text-xs text-zinc-400">Oluşturulma: {fullDateTime(task.createdAt)}</p>
        </div>
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
                toast(`#${task.number} silindi`);
              }}
            >
              Sil
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          <b>#{task.number} {task.title}</b> ve tüm geçmişi kalıcı olarak silinecek. Bunun yerine durumunu <b>İptal</b> yapmayı da seçebilirsiniz.
        </p>
      </Modal>
    </>
  );
}

function PropButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-zinc-800 transition-colors hover:bg-zinc-100">
      {children}
    </button>
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
      className="-mx-2 w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold leading-snug text-zinc-900 outline-none hover:border-zinc-200 focus:border-accent-500"
      aria-label="Görev başlığı"
    />
  );
}

function DescriptionEditor({ value, onSave }: { value: string; onSave: (v: string | null) => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(72, el.scrollHeight)}px`;
    }
  }, [v]);
  return (
    <div>
      <p className="mb-1 text-[13px] font-medium text-zinc-500">Açıklama</p>
      <textarea
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v.trim() ? v : null)}
        placeholder="İşin tanımı, ayrıntılar, bağlantılar…"
        className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm leading-relaxed text-zinc-800 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-accent-500 focus:bg-white focus:ring-3 focus:ring-accent-500/10"
      />
    </div>
  );
}

function ProgressEditor({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onSave(v);
  return (
    <div className="flex items-center gap-3 px-2">
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
        className="h-1.5 w-44 cursor-pointer"
        aria-label="İlerleme"
      />
      <span className="w-10 text-sm tabular-nums text-zinc-700">%{v}</span>
    </div>
  );
}

function TagsEditor({ tags, onSave }: { tags: string[]; onSave: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const { data: all = [] } = useTags();
  const add = () => {
    const t = input.trim().replace(/^#/, "").toLocaleLowerCase("tr-TR");
    setInput("");
    if (t && !tags.includes(t)) onSave([...tags, t]);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 py-0.5 pl-1.5 pr-0.5 text-xs font-medium text-zinc-600">
          #{t}
          <button type="button" onClick={() => onSave(tags.filter((x) => x !== t))} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700" aria-label={`${t} etiketini kaldır`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        list="tag-suggestions"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length ? "+ ekle" : "Etiket ekle…"}
        className="h-7 w-28 rounded-md bg-transparent px-1 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:bg-zinc-50"
      />
      <datalist id="tag-suggestions">
        {all.filter((t) => !tags.includes(t.tag)).map((t) => (
          <option key={t.tag} value={t.tag} />
        ))}
      </datalist>
    </div>
  );
}

function Checklist({ task }: { task: TaskDetailDTO }) {
  const { add, update, remove } = useChecklist(task.id);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    add.mutate(t);
    setText("");
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-[13px] font-medium text-zinc-500">Alt adımlar</p>
        {total > 0 && (
          <>
            <span className="text-xs tabular-nums text-zinc-400">
              {done}/{total}
            </span>
            <span className="h-1 w-20 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </span>
          </>
        )}
      </div>
      <div className="space-y-0.5">
        {task.checklist.map((c) => (
          <div key={c.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-zinc-50">
            <input
              type="checkbox"
              checked={c.done}
              onChange={(e) => update.mutate({ itemId: c.id, done: e.target.checked })}
              className="size-4 cursor-pointer rounded accent-emerald-600"
            />
            <span className={cn("flex-1 text-sm", c.done ? "text-zinc-400 line-through" : "text-zinc-800")}>{c.text}</span>
            <button type="button" onClick={() => remove.mutate(c.id)} className="rounded p-1 text-zinc-300 opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label="Adımı sil">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {adding || total > 0 ? (
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Plus className="size-4 text-zinc-400" />
            <input
              autoFocus={adding}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") {
                  setText("");
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => !text && setAdding(false)}
              placeholder="Adım ekle ve Enter'a bas"
              className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800">
            <ListChecks className="size-4" /> Alt adım ekle
          </button>
        )}
      </div>
    </div>
  );
}

const Composer = ({ task, ref }: { task: TaskDetailDTO; ref: React.Ref<HTMLTextAreaElement> }) => {
  const add = useAddComment();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");

  const submit = async () => {
    const m = message.trim();
    if (!m) return;
    try {
      await add.mutateAsync({ id: task.id, message: m, status: status || undefined });
      setMessage("");
      setStatus("");
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-xs focus-within:border-accent-500 focus-within:ring-4 focus-within:ring-accent-500/10">
      <textarea
        ref={ref}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={2}
        placeholder="Ne yaptın, son durum ne? Kısa bir güncelleme yaz…"
        className="block w-full resize-none rounded-t-xl bg-transparent px-3 pt-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
      />
      <div className="flex flex-wrap items-center gap-2 px-2 pb-2 pt-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-600 outline-none focus:border-accent-500"
          aria-label="Durumu da değiştir"
        >
          <option value="">Durum aynı kalsın ({STATUS_META[task.status].label})</option>
          {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
            <option key={s} value={s}>
              Durumu “{STATUS_META[s].label}” yap
            </option>
          ))}
        </select>
        <span className="ml-auto hidden items-center gap-1 text-[11px] text-zinc-400 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd>
        </span>
        <Button size="sm" variant="primary" onClick={() => void submit()} loading={add.isPending} disabled={!message.trim()}>
          <Send className="size-3.5" /> Gönder
        </Button>
      </div>
    </div>
  );
};
