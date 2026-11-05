"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OPEN_STATUSES, longDate } from "@gorev/shared";
import { useActivityFeed, useDashboard, useTasks } from "@/lib/queries";
import { groupTasks } from "@/lib/grouping";
import { useSession } from "@/hooks/useSession";
import { cn, firstName, todayKey } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskGroup } from "@/components/TaskGroup";
import { TaskRow } from "@/components/TaskRow";
import { ActivityItem } from "@/components/ActivityItem";
import { Card, EmptyState, Spinner } from "@/components/ui";

const OPEN = OPEN_STATUSES.join(",");

export default function OverviewPage() {
  const me = useSession();
  const { data: dash } = useDashboard();
  const mine = useTasks({ scope: "mine", status: OPEN });
  const delegated = useTasks({ scope: "delegated", status: OPEN });
  const feed = useActivityFeed(20);

  const myGroups = useMemo(() => groupTasks(mine.data ?? [], "due"), [mine.data]);
  const c = dash?.counts;

  return (
    <div className="mx-auto flex max-w-[1104px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-1">
        <p className="text-base text-ink-muted">{longDate(todayKey())}</p>
        <h1 className="text-3xl font-bold text-ink">Merhaba, {firstName(me.name)}</h1>
      </header>

      <QuickAdd />

      <section aria-label="Kısa özet" className="flex flex-wrap gap-4">
        <Stat href="/gorevler?scope=mine&due=overdue" value={c?.myOverdue} label="Geciken görev" hint="Tarihi geçti, hâlâ açık" tone="danger" />
        <Stat href="/gorevler?scope=mine&due=today" value={c?.myDueToday} label="Bugün teslim" hint="Gün bitmeden bitmeli" tone="warn" />
        <Stat href="/gorevler?scope=mine&status=IN_PROGRESS" value={c?.myInProgress} label="Devam eden" hint="Üzerinde çalışıyorsun" tone="progress" />
        <Stat href="/gorevler?scope=mine&status=DONE" value={c?.myDoneThisWeek} label="Bu hafta biten" hint="Pazartesiden beri" tone="done" />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <Card className="overflow-hidden" aria-labelledby="gorevlerim">
            <CardHeader id="gorevlerim" title="Görevlerim" href="/gorevler?scope=mine" />
            {mine.isLoading ? (
              <Loading />
            ) : !mine.data?.length ? (
              <EmptyState title="Üzerinde açık iş yok">Yukarıdaki kutuya yazıp “Görevi ekle”ye basarak hemen yeni bir görev ekleyebilirsin.</EmptyState>
            ) : (
              myGroups.map((g) => <TaskGroup key={g.key} group={g} showAssignee={false} limit={6} />)
            )}
          </Card>

          <Card className="overflow-hidden" aria-labelledby="verdigim">
            <CardHeader id="verdigim" title="Verdiğim görevler" subtitle="Başkasına verdiğin, henüz bitmemiş işler" href="/gorevler?scope=delegated" />
            {delegated.isLoading ? (
              <Loading />
            ) : !delegated.data?.length ? (
              <EmptyState title="Takip ettiğin açık iş yok">
                Görev eklerken “Kime” seçicisinden bir ekip arkadaşını seçersen görev burada görünür.
              </EmptyState>
            ) : (
              <div className="divide-y divide-line border-t border-line">
                {delegated.data.slice(0, 8).map((t) => (
                  <TaskRow key={t.id} task={t} avatar />
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="min-w-0 flex-[1_1_300px]" aria-labelledby="hareketler">
          <h2 id="hareketler" className="border-b border-line px-5 py-4 text-xl font-bold text-ink">
            Son hareketler
          </h2>
          <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto p-5">
            {feed.isLoading ? (
              <Loading />
            ) : !feed.data?.length ? (
              <p className="py-6 text-center text-base text-ink-muted">Henüz bir hareket yok.</p>
            ) : (
              feed.data.map((a) => <ActivityItem key={a.id} a={a} showTask />)
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const TONES = {
  danger: "text-danger",
  warn: "text-blocked-ink",
  progress: "text-progress-ink",
  done: "text-done-ink",
} as const;

function Stat({ href, value, label, hint, tone }: { href: string; value?: number; label: string; hint: string; tone: keyof typeof TONES }) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-[1_1_200px] flex-col gap-1 rounded-lg border border-line bg-surface px-5 py-4 shadow-card transition-colors hover:border-line-strong"
    >
      <span className={cn("text-[34px] leading-10 font-bold tabular-nums", value ? TONES[tone] : "text-ink-muted")}>{value ?? "–"}</span>
      <span className="text-base font-semibold text-ink">{label}</span>
      <span className="text-sm text-ink-muted">{hint}</span>
    </Link>
  );
}

function CardHeader({ id, title, subtitle, href }: { id: string; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-xl font-bold text-ink">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex min-h-11 items-center text-base font-semibold text-accent hover:text-accent-strong hover:underline">
          Tümünü gör
        </Link>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  );
}
