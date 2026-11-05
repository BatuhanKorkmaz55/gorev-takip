"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BOARD_STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  TASK_STATUSES,
  type TaskStatus,
} from "@gorev/shared";
import { List, Search, SquareKanban, X, SearchX } from "lucide-react";
import { useTasks, useUsers, type TaskFilters, type TaskScope } from "@/lib/queries";
import { GROUP_LABELS, groupTasks, type GroupBy } from "@/lib/grouping";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskGroup } from "@/components/TaskGroup";
import { Board } from "@/components/Board";
import { StatusIcon } from "@/components/TaskIcons";
import { Card, EmptyState, Select, Spinner } from "@/components/ui";

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: "mine", label: "Bana atanan" },
  { value: "delegated", label: "Atadıklarım" },
  { value: "created", label: "Oluşturduklarım" },
  { value: "all", label: "Tümü" },
];

const TITLES: Record<TaskScope, string> = {
  mine: "Görevlerim",
  delegated: "Atadıklarım",
  created: "Oluşturduklarım",
  all: "Tüm görevler",
};

export default function TasksPage() {
  const me = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { data: users = [] } = useUsers();

  const scope = (sp.get("scope") as TaskScope) || "all";
  const view = sp.get("view") === "board" ? "board" : "list";
  const statusParam = sp.get("status") ?? "";
  const assigneeId = sp.get("assigneeId") ?? "";
  const priority = sp.get("priority") ?? "";
  const due = sp.get("due") ?? "";
  const tag = sp.get("tag") ?? "";
  const q = sp.get("q") ?? "";
  const groupBy = (sp.get("group") as GroupBy) || (scope === "mine" ? "due" : "status");

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Arama kutusu: yazmayı bırakınca uygula
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Durum filtresi: listede varsayılan "açık işler", panoda tüm pano kolonları
  const statusFilter =
    statusParam === "all" ? "" : statusParam || (view === "board" ? BOARD_STATUSES.join(",") : OPEN_STATUSES.join(","));
  const filters: TaskFilters = { scope, status: statusFilter, assigneeId, priority, due, tag, q };
  const { data: tasks, isLoading, isFetching } = useTasks(filters);

  const groups = useMemo(() => groupTasks(tasks ?? [], groupBy, me.id), [tasks, groupBy, me.id]);
  const hasFilters = !!(statusParam || assigneeId || priority || due || tag || q);

  const defaultAssignee = assigneeId && assigneeId !== "none" ? assigneeId : assigneeId === "none" ? null : undefined;
  const selectedStatuses = statusParam && statusParam !== "all" ? statusParam.split(",") : [];

  const toggleStatus = (s: TaskStatus) => {
    const set = new Set(selectedStatuses);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    setParams({ status: set.size ? [...set].join(",") : null });
  };

  return (
    <div className={cn("mx-auto px-4 py-6 md:px-8 md:py-8", view === "board" ? "max-w-[1400px]" : "max-w-5xl")}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{TITLES[scope]}</h1>
        {isFetching && !isLoading && <Spinner className="size-4" />}
        <div className="ml-auto flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs">
          {(
            [
              ["list", "Liste", <List key="l" className="size-4" />],
              ["board", "Pano", <SquareKanban key="b" className="size-4" />],
            ] as const
          ).map(([v, label, icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setParams({ view: v === "board" ? "board" : null })}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition",
                view === v ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <QuickAdd className="mb-5" defaultAssigneeId={defaultAssignee} />

      {/* Filtreler */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setParams({ scope: s.value })}
                className={cn(
                  "h-8 rounded-md px-3 text-[13px] font-medium transition",
                  scope === s.value ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara: başlık, açıklama, #numara…"
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-8 text-sm shadow-xs outline-none placeholder:text-zinc-400 focus:border-accent-500 focus:ring-3 focus:ring-accent-500/15"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === "list" && (
            <div className="flex flex-wrap items-center gap-1">
              <FilterChip active={!statusParam} onClick={() => setParams({ status: null })}>
                Açık işler
              </FilterChip>
              {TASK_STATUSES.map((s) => (
                <FilterChip key={s} active={selectedStatuses.includes(s)} onClick={() => toggleStatus(s)}>
                  <StatusIcon status={s} progress={50} className="size-3.5" /> {STATUS_META[s].short}
                </FilterChip>
              ))}
              <FilterChip active={statusParam === "all"} onClick={() => setParams({ status: "all" })}>
                Hepsi
              </FilterChip>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            {scope !== "mine" && (
              <Select value={assigneeId} onChange={(e) => setParams({ assigneeId: e.target.value || null })} className="h-8 text-[13px]" aria-label="Kişi">
                <option value="">Herkes</option>
                <option value="none">Atanmamış</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.id === me.id ? " (ben)" : ""}
                    {!u.active ? " (ayrıldı)" : ""}
                  </option>
                ))}
              </Select>
            )}
            <Select value={priority} onChange={(e) => setParams({ priority: e.target.value || null })} className="h-8 text-[13px]" aria-label="Öncelik">
              <option value="">Tüm öncelikler</option>
              {[...PRIORITIES].reverse().map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
            <Select value={due} onChange={(e) => setParams({ due: e.target.value || null })} className="h-8 text-[13px]" aria-label="Bitiş">
              <option value="">Her tarih</option>
              <option value="overdue">Gecikenler</option>
              <option value="today">Bugün</option>
              <option value="week">Önümüzdeki 7 gün</option>
              <option value="none">Tarihsiz</option>
            </Select>
            {view === "list" && (
              <Select value={groupBy} onChange={(e) => setParams({ group: e.target.value })} className="h-8 text-[13px]" aria-label="Gruplama">
                {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>

        {(tag || hasFilters) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {tag && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-1 font-medium text-accent-700">
                #{tag}
                <button type="button" onClick={() => setParams({ tag: null })} aria-label="Etiket filtresini kaldır">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setParams({ status: null, assigneeId: null, priority: null, due: null, tag: null, q: null });
                }}
                className="rounded-md px-2 py-1 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : view === "board" ? (
        <Board tasks={tasks ?? []} />
      ) : !tasks?.length ? (
        <Card>
          <EmptyState icon={<SearchX className="size-10" />} title={hasFilters ? "Filtrelere uyan görev yok" : "Burada henüz görev yok"}>
            {hasFilters ? "Filtreleri değiştirmeyi ya da temizlemeyi deneyin." : "Yukarıdaki kutudan ilk görevi ekleyin."}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {groups.map((g) => (
            <TaskGroup
              key={g.key}
              group={g}
              showHeader={groupBy !== "none"}
              showAssignee={groupBy !== "assignee"}
              defaultCollapsed={g.status === "DONE" || g.status === "CANCELLED"}
            />
          ))}
          <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400">{tasks.length} görev</div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition",
        active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
      )}
    >
      {children}
    </button>
  );
}
