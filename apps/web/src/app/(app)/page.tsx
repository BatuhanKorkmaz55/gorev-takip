"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OPEN_STATUSES } from "@gorev/shared";
import { ArrowRight, CircleCheck, Clock, Inbox, Send, TriangleAlert, Activity, CircleDashed } from "lucide-react";
import { useActivityFeed, useDashboard, useTasks } from "@/lib/queries";
import { groupTasks } from "@/lib/grouping";
import { useSession } from "@/hooks/useSession";
import { cn, firstName } from "@/lib/utils";
import { QuickAdd } from "@/components/QuickAdd";
import { TaskGroup } from "@/components/TaskGroup";
import { ActivityItem } from "@/components/ActivityItem";
import { Card, EmptyState, Spinner } from "@/components/ui";

const OPEN = OPEN_STATUSES.join(",");

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function DashboardPage() {
  const me = useSession();
  const { data: dash } = useDashboard();
  const mine = useTasks({ scope: "mine", status: OPEN });
  const delegated = useTasks({ scope: "delegated", status: OPEN });
  const feed = useActivityFeed(25);

  const myGroups = useMemo(() => groupTasks(mine.data ?? [], "due"), [mine.data]);
  const delegatedGroups = useMemo(() => groupTasks(delegated.data ?? [], "assignee", me.id), [delegated.data, me.id]);
  const c = dash?.counts;
  const dateLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <p className="text-sm capitalize text-zinc-500">{dateLabel}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-zinc-900">
          {greeting()}, {firstName(me.name)}
        </h1>
      </div>

      <QuickAdd className="mb-6" />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href="/gorevler?scope=mine" icon={<Inbox className="size-4" />} label="Açık işlerim" value={c?.myOpen} />
        <Stat href="/gorevler?scope=mine&status=IN_PROGRESS" icon={<Clock className="size-4" />} label="Devam eden" value={c?.myInProgress} tone="blue" />
        <Stat href="/gorevler?scope=mine&due=overdue" icon={<TriangleAlert className="size-4" />} label="Geciken" value={c?.myOverdue} tone={c?.myOverdue ? "red" : undefined} />
        <Stat href="/gorevler?scope=mine&status=DONE" icon={<CircleCheck className="size-4" />} label="Bu hafta bitirdiğim" value={c?.myDoneThisWeek} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader title="Benim işlerim" href="/gorevler?scope=mine" />
            {mine.isLoading ? (
              <Loading />
            ) : myGroups.length === 0 || !mine.data?.length ? (
              <EmptyState icon={<CircleCheck className="size-10" />} title="Üzerinde açık iş yok 🎉">
                Yukarıdaki kutuya yazıp Enter&apos;a basarak hemen yeni bir görev ekleyebilirsin.
              </EmptyState>
            ) : (
              myGroups.map((g) => <TaskGroup key={g.key} group={g} showAssignee={false} limit={8} />)
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Atadığım işler"
              subtitle="Başkalarına verdiğin ve henüz bitmemiş işler"
              href="/gorevler?scope=delegated"
              icon={<Send className="size-4 text-zinc-400" />}
            />
            {delegated.isLoading ? (
              <Loading />
            ) : !delegated.data?.length ? (
              <EmptyState icon={<CircleDashed className="size-10" />} title="Takip ettiğin açık iş yok">
                Görev yazarken <code className="rounded bg-zinc-100 px-1">@isim</code> ekleyerek ekip arkadaşına atayabilirsin.
              </EmptyState>
            ) : (
              delegatedGroups.map((g) => <TaskGroup key={g.key} group={g} limit={5} />)
            )}
          </Card>
        </div>

        <Card className="h-fit overflow-hidden lg:sticky lg:top-6">
          <CardHeader title="Ekipte son hareketler" icon={<Activity className="size-4 text-zinc-400" />} />
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            {feed.isLoading ? (
              <Loading />
            ) : !feed.data?.length ? (
              <p className="py-6 text-center text-sm text-zinc-500">Henüz hareket yok.</p>
            ) : (
              feed.data.map((a) => <ActivityItem key={a.id} a={a} showTask />)
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ href, icon, label, value, tone }: { href: string; icon: React.ReactNode; label: string; value?: number; tone?: "blue" | "red" | "green" }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[13px] font-medium",
          tone === "blue" ? "text-blue-600" : tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-zinc-500",
        )}
      >
        {icon} {label}
      </div>
      <div className={cn("mt-2 text-3xl font-semibold tabular-nums tracking-tight", tone === "red" ? "text-red-600" : "text-zinc-900")}>
        {value ?? <span className="text-zinc-300">–</span>}
      </div>
    </Link>
  );
}

function CardHeader({ title, subtitle, href, icon }: { title: string; subtitle?: string; href?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
      {icon}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800">
          Tümü <ArrowRight className="size-3.5" />
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
