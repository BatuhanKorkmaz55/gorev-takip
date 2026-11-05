"use client";

import { useTasks } from "@/lib/queries";
import { NewTaskForm } from "@/components/NewTaskForm";
import { TaskPage } from "@/components/TaskPage";

export default function MyTasksPage() {
  const { data, isLoading } = useTasks({ scope: "mine", status: "all" });
  return (
    <TaskPage title="Görevlerim" tasks={data} loading={isLoading} show="from" empty="Şu an üzerinde görev yok.">
      <NewTaskForm />
    </TaskPage>
  );
}
