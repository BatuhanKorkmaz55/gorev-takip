import type { Activity, ChecklistItem, Task, User } from "@prisma/client";
import type { ActivityDTO, ChecklistItemDTO, TaskDTO, UserLite } from "@gorev/shared";
import { dateToKey } from "./dates";

export const userLiteSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  color: true,
  title: true,
} as const;

export type UserLiteRow = Pick<User, keyof typeof userLiteSelect>;

export function toUserLite(u: UserLiteRow): UserLite {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    color: u.color,
    title: u.title,
  };
}

export const taskListInclude = {
  creator: { select: userLiteSelect },
  assignee: { select: userLiteSelect },
  checklist: { select: { done: true } },
  _count: { select: { activities: { where: { type: "COMMENT" as const } } } },
} as const;

type TaskListRow = Task & {
  creator: UserLiteRow;
  assignee: UserLiteRow | null;
  checklist: Pick<ChecklistItem, "done">[];
  _count: { activities: number };
};

export function toTaskDTO(t: TaskListRow): TaskDTO {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    dueDate: dateToKey(t.dueDate),
    tags: t.tags,
    creator: toUserLite(t.creator),
    assignee: t.assignee ? toUserLite(t.assignee) : null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    checklistTotal: t.checklist.length,
    checklistDone: t.checklist.filter((c) => c.done).length,
    commentCount: t._count.activities,
  };
}

export function toChecklistDTO(c: ChecklistItem): ChecklistItemDTO {
  return { id: c.id, text: c.text, done: c.done, position: c.position };
}

type ActivityRow = Activity & {
  user: UserLiteRow;
  task?: Pick<Task, "id" | "number" | "title" | "status">;
};

export function toActivityDTO(a: ActivityRow): ActivityDTO {
  return {
    id: a.id,
    type: a.type,
    message: a.message,
    meta: (a.meta as Record<string, unknown> | null) ?? null,
    createdAt: a.createdAt.toISOString(),
    user: toUserLite(a.user),
    ...(a.task
      ? { task: { id: a.task.id, number: a.task.number, title: a.task.title, status: a.task.status } }
      : {}),
  };
}
