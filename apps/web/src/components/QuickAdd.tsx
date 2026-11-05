"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  PRIORITY_META,
  addDaysKey,
  formatDateKey,
  humanDue,
  normalizeTr,
  parseQuickAdd,
  type Priority,
  type TaskDTO,
} from "@gorev/shared";
import { AtSign, CalendarDays, CircleHelp, CornerDownLeft, Hash, Plus, UserRound } from "lucide-react";
import { useCreateTask, useTags, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn, firstName, todayKey } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { PriorityIcon } from "./TaskIcons";
import { MenuItem, Popover } from "./Popover";
import { useToast } from "./Toast";
import { Kbd } from "./ui";

type Suggestion = { key: string; label: string; insert: string; icon?: React.ReactNode; hint?: string };

const PRIORITY_WORDS: { word: string; p: Priority }[] = [
  { word: "acil", p: "URGENT" },
  { word: "yüksek", p: "HIGH" },
  { word: "normal", p: "NORMAL" },
  { word: "düşük", p: "LOW" },
];

export interface QuickAddHandle {
  focus: () => void;
}

export const QuickAdd = forwardRef<
  QuickAddHandle,
  {
    autoFocus?: boolean;
    /** Kişi belirtilmezse kime atansın? Varsayılan: oturum sahibi */
    defaultAssigneeId?: string | null;
    onCreated?: (t: TaskDTO) => void;
    className?: string;
    placeholder?: string;
  }
>(function QuickAdd({ autoFocus, defaultAssigneeId, onCreated, className, placeholder }, ref) {
  const me = useSession();
  const { data: users = [] } = useUsers();
  const { data: tags = [] } = useTags();
  const create = useCreateTask();
  const toast = useToast();
  const drawer = useTaskDrawer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [sel, setSel] = useState(0);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Programatik metin değişikliğinden sonra imlecin gideceği yer */
  const pendingCaret = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  useLayoutEffect(() => {
    const pos = pendingCaret.current;
    if (pos === null) return;
    pendingCaret.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(pos, pos);
    setCaret(pos);
  }, [value]);

  const activeUsers = useMemo(() => users.filter((u) => u.active), [users]);
  const today = todayKey();
  const parsed = useMemo(
    () => parseQuickAdd(value, { users: activeUsers, currentUserId: me.id, today }),
    [value, activeUsers, me.id, today],
  );
  const fallbackAssignee = defaultAssigneeId === undefined ? me.id : defaultAssigneeId;
  const effectiveAssigneeId = parsed.assigneeId === undefined ? fallbackAssignee : parsed.assigneeId;
  const effectiveAssignee = activeUsers.find((u) => u.id === effectiveAssigneeId) ?? null;

  /** Kullanıcıyı benzersiz biçimde tanımlayan @etiket */
  const handleFor = (u: { id: string; name: string }) => {
    const fn = normalizeTr(firstName(u.name));
    const clash = activeUsers.filter((x) => normalizeTr(firstName(x.name)) === fn).length > 1;
    return clash ? u.name.replace(/\s+/g, "") : firstName(u.name);
  };

  // İmlecin bulunduğu kelime
  const before = value.slice(0, caret);
  const wordStart = before.search(/\S*$/);
  const word = before.slice(wordStart);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!focused || word.length < 1) return [];
    const q = normalizeTr(word.slice(1));
    if (word.startsWith("@")) {
      const list = activeUsers
        .filter((u) => {
          if (!q) return true;
          const n = normalizeTr(u.name);
          return n.split(/\s+/).some((p) => p.startsWith(q)) || n.replace(/\s+/g, "").startsWith(q) || normalizeTr(u.email).startsWith(q);
        })
        .slice(0, 6)
        .map<Suggestion>((u) => ({
          key: u.id,
          label: u.id === me.id ? `${u.name} (ben)` : u.name,
          insert: `@${handleFor(u)}`,
          icon: <Avatar user={u} size="xs" />,
          hint: u.title ?? undefined,
        }));
      if (!q || "kimse".startsWith(q)) list.push({ key: "none", label: "Kimseye atama", insert: "@kimse", icon: <Avatar user={null} size="xs" /> });
      return list;
    }
    if (word.startsWith("#")) {
      return tags
        .filter((t) => !q || normalizeTr(t.tag).startsWith(q))
        .filter((t) => !parsed.tags.includes(t.tag) || normalizeTr(t.tag) === q)
        .slice(0, 6)
        .map((t) => ({ key: t.tag, label: `#${t.tag}`, insert: `#${t.tag}`, hint: `${t.count} görev` }));
    }
    if (word.startsWith("!")) {
      return PRIORITY_WORDS.filter((p) => !q || normalizeTr(p.word).startsWith(q)).map((p) => ({
        key: p.p,
        label: PRIORITY_META[p.p].label,
        insert: `!${p.word}`,
        icon: <PriorityIcon priority={p.p} />,
      }));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, word, activeUsers, tags, me.id, parsed.tags]);

  const showSuggestions = suggestions.length > 0;
  const selIndex = Math.min(sel, Math.max(0, suggestions.length - 1));

  const applySuggestion = (s: Suggestion) => {
    const next = value.slice(0, wordStart) + s.insert + " " + value.slice(caret);
    pendingCaret.current = wordStart + s.insert.length + 1;
    setValue(next);
    setSel(0);
  };

  /** Butonlarla ifade ekleme (sözdizimini bilmeyenler için) */
  const appendToken = (token: string, replaceKind?: "due" | "priority" | "assignee") => {
    let base = value;
    if (replaceKind) {
      const existing = parsed.tokens.find((t) => t.kind === replaceKind && t.ok);
      if (existing) base = base.replace(existing.raw, "").replace(/\s{2,}/g, " ");
    }
    const next = (base.trimEnd() ? base.trimEnd() + " " : "") + token + " ";
    if (next === value) {
      inputRef.current?.focus();
      return;
    }
    pendingCaret.current = next.length;
    setValue(next);
  };

  const submit = async () => {
    setError(null);
    if (!parsed.title) {
      setError("Görev için kısa bir başlık yazın");
      return;
    }
    try {
      const task = await create.mutateAsync({
        title: parsed.title,
        assigneeId: effectiveAssigneeId,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        tags: parsed.tags,
      });
      setValue("");
      setCaret(0);
      const who = task.assignee && task.assignee.id !== me.id ? ` · ${firstName(task.assignee.name)} kişisine atandı` : "";
      toast(`#${task.number} eklendi${who}`, { action: { label: "Aç", onClick: () => drawer.open(task.number) } });
      onCreated?.(task);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((selIndex + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((selIndex - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions[selIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setFocused(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Escape" && value) {
      e.stopPropagation();
      setValue("");
    }
  };

  const dateOptions = [
    { word: "bugün", key: today },
    { word: "yarın", key: addDaysKey(today, 1) },
    { word: "cuma", key: undefined },
    { word: "pazartesi", key: undefined },
    { word: "haftaya", key: addDaysKey(today, 7) },
  ];

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-xl border bg-white shadow-xs transition",
          focused ? "border-accent-500 ring-4 ring-accent-500/10" : "border-zinc-200 hover:border-zinc-300",
          error && "border-red-400 ring-red-500/10",
        )}
      >
        <div className="flex items-center gap-2 px-3">
          <Plus className={cn("size-[18px] shrink-0", focused ? "text-accent-600" : "text-zinc-400")} />
          <input
            ref={inputRef}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => {
              setValue(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              setSel(0);
              setError(null);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? "Yeni görev yaz… örn: Teklifi hazırla @ayşe yarın !acil #satış"}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
            aria-label="Hızlı görev ekle"
            autoComplete="off"
            spellCheck={false}
          />
          {value ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void submit()}
              disabled={create.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-60"
            >
              Ekle <CornerDownLeft className="size-3.5" />
            </button>
          ) : (
            <span className="hidden items-center gap-1 text-xs text-zinc-400 sm:flex">
              <Kbd>N</Kbd>
            </span>
          )}
        </div>

        {/* Önizleme + yardımcı butonlar */}
        {(value || focused) && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 px-3 py-2">
            <Popover
              trigger={({ toggle }) => (
                <ChipButton onClick={toggle} active={parsed.assigneeId !== undefined}>
                  {effectiveAssignee ? <Avatar user={effectiveAssignee} size="xs" className="ring-0" /> : <UserRound className="size-3.5" />}
                  {effectiveAssignee ? (effectiveAssignee.id === me.id ? "Bana" : firstName(effectiveAssignee.name)) : "Atamasız"}
                </ChipButton>
              )}
            >
              {(close) => (
                <div className="max-h-72 overflow-auto">
                  {activeUsers.map((u) => (
                    <MenuItem
                      key={u.id}
                      active={u.id === effectiveAssigneeId}
                      onClick={() => {
                        appendToken(u.id === me.id ? "@ben" : `@${handleFor(u)}`, "assignee");
                        close();
                      }}
                    >
                      <Avatar user={u} size="xs" /> {u.name}
                      {u.id === me.id && <span className="text-zinc-400">(ben)</span>}
                    </MenuItem>
                  ))}
                  <MenuItem
                    onClick={() => {
                      appendToken("@kimse", "assignee");
                      close();
                    }}
                  >
                    <Avatar user={null} size="xs" /> Kimseye atama
                  </MenuItem>
                </div>
              )}
            </Popover>

            <Popover
              trigger={({ toggle }) => (
                <ChipButton onClick={toggle} active={!!parsed.dueDate}>
                  <CalendarDays className="size-3.5" />
                  {parsed.dueDate ? humanDue(parsed.dueDate, today) : "Tarih"}
                </ChipButton>
              )}
            >
              {(close) => (
                <>
                  {dateOptions.map((d) => (
                    <MenuItem
                      key={d.word}
                      onClick={() => {
                        appendToken(d.word, "due");
                        close();
                      }}
                    >
                      <span className="flex-1 capitalize">{d.word}</span>
                      {d.key && <span className="text-xs text-zinc-400">{formatDateKey(d.key)}</span>}
                    </MenuItem>
                  ))}
                  <div className="border-t border-zinc-100 p-1.5 pt-2">
                    <input
                      type="date"
                      min={today}
                      className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [y, m, dd] = e.target.value.split("-");
                        appendToken(`${dd}.${m}.${y}`, "due");
                        close();
                      }}
                    />
                  </div>
                </>
              )}
            </Popover>

            <Popover
              trigger={({ toggle }) => (
                <ChipButton onClick={toggle} active={!!parsed.priority}>
                  <PriorityIcon priority={parsed.priority ?? "NORMAL"} className="size-3.5" />
                  {parsed.priority ? PRIORITY_META[parsed.priority].label : "Öncelik"}
                </ChipButton>
              )}
            >
              {(close) =>
                PRIORITY_WORDS.map((p) => (
                  <MenuItem
                    key={p.p}
                    active={parsed.priority === p.p}
                    onClick={() => {
                      appendToken(`!${p.word}`, "priority");
                      close();
                    }}
                  >
                    <PriorityIcon priority={p.p} /> {PRIORITY_META[p.p].label}
                  </MenuItem>
                ))
              }
            </Popover>

            <ChipButton onClick={() => appendToken("#")} active={parsed.tags.length > 0}>
              <Hash className="size-3.5" />
              {parsed.tags.length ? parsed.tags.map((t) => `#${t}`).join(" ") : "Etiket"}
            </ChipButton>

            {parsed.tokens
              .filter((t) => !t.ok)
              .map((t) => (
                <span key={t.raw} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  <AtSign className="size-3" /> {t.label}
                </span>
              ))}

            <div className="ml-auto">
              <Popover
                align="end"
                className="w-80 p-3"
                trigger={({ toggle }) => (
                  <button type="button" onClick={toggle} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                    <CircleHelp className="size-3.5" /> Kısayollar
                  </button>
                )}
              >
                {() => <SyntaxHelp />}
              </Popover>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 px-1 text-xs text-red-600">{error}</p>}

      {showSuggestions && (
        <div className="animate-pop-in absolute left-8 top-12 z-40 w-72 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10">
          {suggestions.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              onMouseEnter={() => setSel(i)}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm", i === selIndex ? "bg-accent-50 text-accent-700" : "text-zinc-700")}
            >
              {s.icon}
              <span className="flex-1 truncate">{s.label}</span>
              {s.hint && <span className="text-xs text-zinc-400">{s.hint}</span>}
            </button>
          ))}
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-zinc-400">↑↓ seç · Enter ekle</p>
        </div>
      )}
    </div>
  );
});

function ChipButton({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
        active ? "border-accent-100 bg-accent-50 text-accent-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

function SyntaxHelp() {
  const rows: [string, string][] = [
    ["@ayşe", "Ayşe'ye ata (@ben, @kimse)"],
    ["yarın", "Bitiş tarihi: bugün, yarın, cuma, haftaya, 20.11, +3"],
    ["!acil", "Öncelik: !acil !yüksek !düşük (ya da !!! / !!)"],
    ["#satış", "Etiket ekle"],
  ];
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-zinc-800">Tek satırda görev yaz</p>
      <p className="text-xs text-zinc-500">Kişi belirtmezsen görev sana atanır. Enter&apos;a bas, bitti.</p>
      <div className="space-y-1.5 pt-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-xs">
            <code className="w-16 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700">{k}</code>
            <span className="text-zinc-600">{v}</span>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-zinc-50 p-2 font-mono text-[11px] leading-relaxed text-zinc-600">
        Fatura kesilecek @can cuma !yüksek #muhasebe
      </p>
    </div>
  );
}
