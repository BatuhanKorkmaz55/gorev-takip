import {
  PRIORITY_META,
  STATUS_META,
  addDaysKey,
  diffDays,
  type Priority,
  type TaskDTO,
  type TaskStatus,
} from "@gorev/shared";
import { todayKey } from "./utils";

export type GroupBy = "status" | "assignee" | "due" | "priority" | "none";

export const GROUP_LABELS: Record<GroupBy, string> = {
  status: "Duruma göre",
  assignee: "Kişiye göre",
  due: "Bitiş tarihine göre",
  priority: "Önceliğe göre",
  none: "Gruplama yok",
};

export interface TaskGroupData {
  key: string;
  label: string;
  kind: GroupBy;
  status?: TaskStatus;
  priority?: Priority;
  user?: TaskDTO["assignee"];
  tone?: "danger" | "warn";
  tasks: TaskDTO[];
}

const STATUS_ORDER: TaskStatus[] = ["IN_PROGRESS", "BLOCKED", "TODO", "DONE", "CANCELLED"];

export function dueBucket(t: TaskDTO, today = todayKey()): { key: string; label: string; order: number; tone?: "danger" | "warn" } {
  if (!t.dueDate) return { key: "none", label: "Tarihsiz", order: 5 };
  const d = diffDays(today, t.dueDate);
  const closed = t.status === "DONE" || t.status === "CANCELLED";
  if (d < 0 && !closed) return { key: "overdue", label: "Gecikmiş", order: 0, tone: "danger" };
  if (d <= 0) return { key: "today", label: "Bugün", order: 1, tone: "warn" };
  if (d === 1) return { key: "tomorrow", label: "Yarın", order: 2 };
  if (t.dueDate <= addDaysKey(today, 7)) return { key: "week", label: "Bu hafta", order: 3 };
  return { key: "later", label: "Daha sonra", order: 4 };
}

export function groupTasks(tasks: TaskDTO[], by: GroupBy, meId?: string): TaskGroupData[] {
  if (by === "none") return [{ key: "all", label: "Tüm görevler", kind: "none", tasks }];

  const map = new Map<string, TaskGroupData & { order: number }>();
  const push = (key: string, order: number, make: () => Omit<TaskGroupData, "tasks" | "key" | "kind">, t: TaskDTO) => {
    let g = map.get(key);
    if (!g) {
      g = { key, kind: by, order, tasks: [], ...make() };
      map.set(key, g);
    }
    g.tasks.push(t);
  };

  for (const t of tasks) {
    if (by === "status") {
      push(t.status, STATUS_ORDER.indexOf(t.status), () => ({ label: STATUS_META[t.status].label, status: t.status }), t);
    } else if (by === "priority") {
      push(t.priority, 3 - PRIORITY_META[t.priority].rank, () => ({ label: PRIORITY_META[t.priority].label, priority: t.priority }), t);
    } else if (by === "due") {
      const b = dueBucket(t);
      push(b.key, b.order, () => ({ label: b.label, tone: b.tone }), t);
    } else if (by === "assignee") {
      const u = t.assignee;
      const key = u?.id ?? "none";
      const order = !u ? 2 : u.id === meId ? 0 : 1;
      push(key, order, () => ({ label: u ? u.name : "Atanmamış", user: u }), t);
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "tr")).map(({ order: _o, ...g }) => g);
}
