"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BOARD_STATUSES, OPEN_STATUSES, PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES, type TaskStatus } from "@gorev/shared";
import { ChevronDown, LayoutGrid, List, Search, X } from "lucide-react";
import { useTasks, useUsers, type TaskFilters, type TaskScope } from "@/lib/queries";
import { GROUP_LABELS, groupTasks, type GroupBy } from "@/lib/grouping";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskGroup } from "@/components/TaskGroup";
import { Board } from "@/components/Board";
import { StatusIcon } from "@/components/TaskIcons";
import { Button, Card, EmptyState, Select, Spinner } from "@/components/ui";

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: "mine", label: "Bana verilen" },
  { value: "delegated", label: "Benim verdiğim" },
  { value: "created", label: "Benim oluşturduğum" },
  { value: "all", label: "Herkesin" },
];

const TITLES: Record<TaskScope, { title: string; subtitle: string }> = {
  mine: { title: "Görevlerim", subtitle: "Sana verilen işler" },
  delegated: { title: "Verdiğim görevler", subtitle: "Başkasına verdiğin işleri buradan takip et" },
  created: { title: "Oluşturduğum görevler", subtitle: "Senin eklediğin tüm işler" },
  all: { title: "Tüm görevler", subtitle: "Ekipteki herkesin işleri" },
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setSearch(q), [q]);

  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const statusFilter = statusParam === "all" ? "" : statusParam || (view === "board" ? BOARD_STATUSES.join(",") : OPEN_STATUSES.join(","));
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

  const heading = TITLES[scope];

  return (
    <div className={cn("mx-auto flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8", view === "board" ? "max-w-[1440px]" : "max-w-[1104px]")}>
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-[1_1_240px]">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-ink">
            {heading.title} {isFetching && !isLoading && <Spinner className="size-5" label="Güncelleniyor" />}
          </h1>
          <p className="text-base text-ink-muted">{heading.subtitle}</p>
        </div>
        <div className="flex rounded-md bg-sunken p-1" role="group" aria-label="Görünüm">
          {(
            [
              ["list", "Liste", <List key="l" className="size-5" aria-hidden="true" />],
              ["board", "Pano", <LayoutGrid key="b" className="size-5" aria-hidden="true" />],
            ] as const
          ).map(([v, label, icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setParams({ view: v === "board" ? "board" : null })}
              className={cn(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] px-4 text-[15px] transition",
                view === v ? "bg-surface font-bold text-ink shadow-card" : "text-todo-ink hover:text-ink",
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </header>

      <QuickAdd defaultAssigneeId={defaultAssignee} />

      {/* Filtreler: mobilde düğmenin arkasında, masaüstünde hep açık */}
      <Button className="md:hidden" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="filtreler">
        {filtersOpen ? "Filtreleri gizle" : hasFilters ? "Filtreler (etkin)" : "Filtreleri göster"}
        <ChevronDown className={cn("size-5 transition-transform", filtersOpen && "rotate-180")} aria-hidden="true" />
      </Button>
      <Card id="filtreler" className={cn("flex-col gap-4 p-4", filtersOpen ? "flex" : "hidden md:flex")} aria-label="Filtreler">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-muted">Kimin görevleri</span>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <FilterChip key={s.value} active={scope === s.value} onClick={() => setParams({ scope: s.value })}>
                {s.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {view === "list" && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-muted">Durum</span>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!statusParam} onClick={() => setParams({ status: null })}>
                Açık olanlar
              </FilterChip>
              {TASK_STATUSES.map((s) => (
                <FilterChip key={s} active={selectedStatuses.includes(s)} onClick={() => toggleStatus(s)}>
                  <StatusIcon status={s} /> {STATUS_META[s].label}
                </FilterChip>
              ))}
              <FilterChip active={statusParam === "all"} onClick={() => setParams({ status: "all" })}>
                Hepsi
              </FilterChip>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-muted">Ara</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Başlık, açıklama veya görev numarası"
                className="h-11 w-full rounded-md border border-line-strong bg-surface pr-11 pl-11 text-base text-ink outline-none placeholder:text-ink-muted focus:border-accent focus:ring-3 focus:ring-accent/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink"
                  aria-label="Aramayı temizle"
                >
                  <X className="size-5" />
                </button>
              )}
            </span>
          </label>

          {scope !== "mine" && (
            <SelectField label="Kişi">
              <Select value={assigneeId} onChange={(e) => setParams({ assigneeId: e.target.value || null })}>
                <option value="">Herkes</option>
                <option value="none">Kimseye verilmemiş</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.id === me.id ? " (ben)" : ""}
                    {!u.active ? " (ayrıldı)" : ""}
                  </option>
                ))}
              </Select>
            </SelectField>
          )}
          <SelectField label="Öncelik">
            <Select value={priority} onChange={(e) => setParams({ priority: e.target.value || null })}>
              <option value="">Hepsi</option>
              {[...PRIORITIES].reverse().map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </SelectField>
          <SelectField label="Tarih">
            <Select value={due} onChange={(e) => setParams({ due: e.target.value || null })}>
              <option value="">Hepsi</option>
              <option value="overdue">Gecikenler</option>
              <option value="today">Bugün teslim</option>
              <option value="week">Önümüzdeki 7 gün</option>
              <option value="none">Tarihi olmayanlar</option>
            </Select>
          </SelectField>
          {view === "list" && (
            <SelectField label="Gruplama">
              <Select value={groupBy} onChange={(e) => setParams({ group: e.target.value })}>
                {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </Select>
            </SelectField>
          )}
        </div>

        {(tag || hasFilters) && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            {tag && (
              <span className="inline-flex h-9 items-center gap-1 rounded-sm bg-accent-soft pr-1 pl-3 text-[15px] font-semibold text-ink">
                Etiket: #{tag}
                <button
                  type="button"
                  onClick={() => setParams({ tag: null })}
                  aria-label="Etiket filtresini kaldır"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-surface"
                >
                  <X className="size-4" />
                </button>
              </span>
            )}
            {hasFilters && (
              <Button
                variant="link"
                onClick={() => {
                  setSearch("");
                  setParams({ status: null, assigneeId: null, priority: null, due: null, tag: null, q: null });
                }}
              >
                Filtreleri temizle
              </Button>
            )}
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : view === "board" ? (
        <Board tasks={tasks ?? []} />
      ) : !tasks?.length ? (
        <Card>
          <EmptyState title={hasFilters ? "Bu filtrelere uyan görev yok" : "Burada henüz görev yok"}>
            {hasFilters ? "Filtreleri değiştir ya da “Filtreleri temizle”ye bas." : "Yukarıdaki kutudan ilk görevi ekleyebilirsin."}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden" aria-label="Görev listesi">
          {groups.map((g) => (
            <TaskGroup
              key={g.key}
              group={g}
              showHeader={groupBy !== "none"}
              showAssignee={groupBy !== "assignee" && scope !== "mine"}
              defaultCollapsed={g.status === "DONE" || g.status === "CANCELLED"}
            />
          ))}
          <p className="border-t border-line px-5 py-3 text-sm text-ink-muted">Toplam {tasks.length} görev</p>
        </Card>
      )}
    </div>
  );
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function FilterChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border px-3.5 text-[15px] transition-colors",
        active ? "border-ink bg-ink font-semibold text-on-ink" : "border-line-strong bg-surface text-ink hover:bg-paper",
      )}
    >
      {children}
    </button>
  );
}
