"use client";

import { useTasks } from "@/lib/queries";
import { TaskPage } from "@/components/TaskPage";

export default function GivenTasksPage() {
  const { data, isLoading } = useTasks({ scope: "given", status: "all" });
  return <TaskPage title="Verdiğim görevler" tasks={data} loading={isLoading} show="to" empty="Şu an başkasına verdiğin açık görev yok." />;
}
