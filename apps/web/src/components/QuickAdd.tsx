"use client";

import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  PRIORITY_META,
  addDaysKey,
  dueLabel,
  formatDateKey,
  normalizeTr,
  parseQuickAdd,
  type Priority,
  type TaskDTO,
} from "@gorev/shared";
import { ChevronDown } from "lucide-react";
import { useCreateTask, useTags, useUsers } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useTaskDrawer } from "@/hooks/useTaskDrawer";
import { cn, firstName, todayKey } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { PriorityText } from "./TaskIcons";
import { MenuItem, MenuLabel, Popover } from "./Popover";
import { useToast } from "./Toast";
import { Button, ErrorBox } from "./ui";

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

/**
 * Yeni görev kutusu. Görev tek satırda yazılır; kişi, tarih, öncelik ve etiket ya alttaki
 * açık başlıklı seçicilerle ya da kısayollarla (@ayşe, yarın, !acil, #satış) belirlenir.
 */
export const QuickAdd = forwardRef<
  QuickAddHandle,
  {
    autoFocus?: boolean;
    /** Kişi belirtilmezse kime atansın? Varsayılan: oturum sahibi */
    defaultAssigneeId?: string | null;
    onCreated?: (t: TaskDTO) => void;
    className?: string;
    /** Pencere içinde kullanıldığında kart çerçevesi olmadan */
    bare?: boolean;
  }
>(function QuickAdd({ autoFocus, defaultAssigneeId, onCreated, className, bare }, ref) {
  const me = useSession();
  const inputId = useId();
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
  const assigneeId = parsed.assigneeId === undefined ? fallbackAssignee : parsed.assigneeId;
  const assignee = activeUsers.find((u) => u.id === assigneeId) ?? null;
  const unresolved = parsed.tokens.filter((t) => !t.ok);

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
          icon: <Avatar user={u} size="sm" />,
          hint: u.title ?? undefined,
        }));
      if (!q || "kimse".startsWith(q)) list.push({ key: "none", label: "Kimseye verme", insert: "@kimse", icon: <Avatar user={null} size="sm" /> });
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

  /** Seçicilerle ifade ekleme (kısayolları bilmeyenler için) */
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

  const removeToken = (kind: "due" | "priority") => {
    const existing = parsed.tokens.find((t) => t.kind === kind && t.ok);
    if (!existing) return;
    const next = value.replace(existing.raw, "").replace(/\s{2,}/g, " ");
    pendingCaret.current = next.length;
    setValue(next);
  };

  const submit = async () => {
    setError(null);
    if (!parsed.title) {
      setError("Önce görevin ne olduğunu kısaca yaz.");
      inputRef.current?.focus();
      return;
    }
    try {
      const task = await create.mutateAsync({
        title: parsed.title,
        assigneeId,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        tags: parsed.tags,
      });
      setValue("");
      setCaret(0);
      const who = task.assignee && task.assignee.id !== me.id ? ` ve ${task.assignee.name} kişisine verildi` : "";
      toast(`“${task.title}” eklendi${who}.`, { action: { label: "Görevi aç", onClick: () => drawer.open(task.number) } });
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
    { word: "bugün", label: "Bugün", key: today },
    { word: "yarın", label: "Yarın", key: addDaysKey(today, 1) },
    { word: "cuma", label: "Bu cuma", key: undefined },
    { word: "pazartesi", label: "Pazartesi", key: undefined },
    { word: "haftaya", label: "1 hafta sonra", key: addDaysKey(today, 7) },
  ];

  const whoText = assignee ? (assignee.id === me.id ? "Bana" : assignee.name) : "Kimseye";
  const whenText = parsed.dueDate ? dueLabel(parsed.dueDate, today).text : "Tarih yok";
  const priorityText = parsed.priority ? PRIORITY_META[parsed.priority].label : "Normal";
  const tagText = parsed.tags.length ? parsed.tags.map((t) => `#${t}`).join(" ") : "Ekle";

  return (
    <section
      aria-label="Yeni görev ekle"
      className={cn(!bare && "rounded-lg border border-line bg-surface p-5 shadow-card", "flex flex-col gap-3", className)}
    >
      <label htmlFor={inputId} className="text-lg font-bold text-ink">
        Yeni görev ekle
      </label>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-[1_1_300px]">
          <input
            id={inputId}
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
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Ne yapılması gerekiyor?"
            className={cn(
              "h-14 w-full rounded-md border bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-ink-muted focus:ring-3 focus:ring-accent/20",
              error ? "border-danger" : "border-line-strong focus:border-accent",
            )}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />

          {showSuggestions && (
            <div className="animate-pop-in absolute top-full left-0 z-40 mt-1.5 w-80 max-w-full rounded-lg border border-line bg-surface p-1.5 shadow-pop" role="listbox">
              {suggestions.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  role="option"
                  aria-selected={i === selIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  onMouseEnter={() => setSel(i)}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-left text-base",
                    i === selIndex ? "bg-accent-soft font-semibold text-ink" : "text-ink",
                  )}
                >
                  {s.icon}
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.hint && <span className="text-sm font-normal text-ink-muted">{s.hint}</span>}
                </button>
              ))}
              <p className="px-3 pt-1 pb-1.5 text-sm text-ink-muted">Ok tuşlarıyla seç, Enter ile ekle</p>
            </div>
          )}
        </div>
        <Button variant="primary" size="lg" className="w-full sm:w-auto" onMouseDown={(e) => e.preventDefault()} onClick={() => void submit()} loading={create.isPending}>
          Görevi ekle
        </Button>
      </div>

      {/* Açık başlıklı seçiciler */}
      <div className="flex flex-wrap gap-2">
        <Popover
          trigger={({ toggle }) => (
            <ChipButton onClick={toggle} label="Kime" value={whoText} set={parsed.assigneeId !== undefined} icon={<Avatar user={assignee} size="sm" />} />
          )}
          className="max-h-96 w-72 overflow-auto"
        >
          {(close) => (
            <>
              <MenuLabel>Kime verilsin?</MenuLabel>
              {activeUsers.map((u) => (
                <MenuItem
                  key={u.id}
                  active={u.id === assigneeId}
                  onClick={() => {
                    appendToken(u.id === me.id ? "@ben" : `@${handleFor(u)}`, "assignee");
                    close();
                  }}
                >
                  <Avatar user={u} size="sm" /> <span className="flex-1 truncate">{u.name}</span>
                  {u.id === me.id && <span className="text-ink-muted">(ben)</span>}
                </MenuItem>
              ))}
              <MenuItem
                active={assigneeId === null}
                onClick={() => {
                  appendToken("@kimse", "assignee");
                  close();
                }}
              >
                <Avatar user={null} size="sm" /> Kimseye verme
              </MenuItem>
            </>
          )}
        </Popover>

        <Popover trigger={({ toggle }) => <ChipButton onClick={toggle} label="Ne zaman" value={whenText} set={!!parsed.dueDate} />}>
          {(close) => (
            <>
              <MenuLabel>Bitiş tarihi</MenuLabel>
              {dateOptions.map((d) => (
                <MenuItem
                  key={d.word}
                  onClick={() => {
                    appendToken(d.word, "due");
                    close();
                  }}
                >
                  <span className="flex-1">{d.label}</span>
                  {d.key && <span className="text-sm text-ink-muted">{formatDateKey(d.key)}</span>}
                </MenuItem>
              ))}
              <div className="mt-1 border-t border-line p-2">
                <label className="block text-sm font-semibold text-ink-muted">
                  Başka bir gün seç
                  <input
                    type="date"
                    min={today}
                    className="mt-1 h-11 w-full rounded-md border border-line-strong px-3 text-base text-ink"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, dd] = e.target.value.split("-");
                      appendToken(`${dd}.${m}.${y}`, "due");
                      close();
                    }}
                  />
                </label>
              </div>
              {parsed.dueDate && (
                <MenuItem
                  danger
                  onClick={() => {
                    removeToken("due");
                    close();
                  }}
                >
                  Tarihi kaldır
                </MenuItem>
              )}
            </>
          )}
        </Popover>

        <Popover trigger={({ toggle }) => <ChipButton onClick={toggle} label="Öncelik" value={priorityText} set={!!parsed.priority} />}>
          {(close) => (
            <>
              <MenuLabel>Öncelik</MenuLabel>
              {PRIORITY_WORDS.map((p) => (
                <MenuItem
                  key={p.p}
                  active={(parsed.priority ?? "NORMAL") === p.p}
                  onClick={() => {
                    appendToken(`!${p.word}`, "priority");
                    close();
                  }}
                >
                  <PriorityText priority={p.p} always className="text-base" />
                </MenuItem>
              ))}
            </>
          )}
        </Popover>

        <ChipButton onClick={() => appendToken("#")} label="Etiket" value={tagText} set={parsed.tags.length > 0} />
      </div>

      {unresolved.map((t) => (
        <p key={t.raw} className="text-sm font-semibold text-blocked-ink">
          “{t.raw}” adında bir ekip arkadaşı bulunamadı. Görev {fallbackAssignee === me.id ? "sana" : "seçili kişiye"} verilecek.
        </p>
      ))}
      {error && <ErrorBox>{error}</ErrorBox>}

      <p className="text-sm text-ink-muted">
        İpucu: kutuya doğrudan da yazabilirsin — <b className="font-semibold text-ink">@ayşe</b> kişiye verir,{" "}
        <b className="font-semibold text-ink">yarın</b> tarih koyar, <b className="font-semibold text-ink">!acil</b> önceliği,{" "}
        <b className="font-semibold text-ink">#satış</b> etiketi belirler.
      </p>
    </section>
  );
});

function ChipButton({
  label,
  value,
  onClick,
  set,
  icon,
}: {
  label: string;
  value: string;
  onClick: () => void;
  set?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 max-w-full cursor-pointer items-center gap-2 rounded-md border px-3.5 text-[15px] text-ink transition-colors",
        set ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:bg-paper",
      )}
    >
      {icon}
      <span className="text-ink-muted">{label}:</span>
      <span className="truncate font-semibold">{value}</span>
      <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
    </button>
  );
}
