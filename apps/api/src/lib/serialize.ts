import type { Activity, Task, User } from "@prisma/client";
import type { ActivityDTO, TaskDTO, UserLite } from "@gorev/shared";
import { dateToKey } from "./dates";

export const userLiteSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  color: true,
} as const;

export type UserLiteRow = Pick<User, keyof typeof userLiteSelect>;

export function toUserLite(u: UserLiteRow): UserLite {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, color: u.color };
}

export const taskInclude = {
  creator: { select: userLiteSelect },
  assignee: { select: userLiteSelect },
} as const;

type TaskRow = Task & { creator: UserLiteRow; assignee: UserLiteRow };

export function toTaskDTO(t: TaskRow): TaskDTO {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    dueDate: dateToKey(t.dueDate),
    creator: toUserLite(t.creator),
    assignee: toUserLite(t.assignee),
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toActivityDTO(a: Activity & { user: UserLiteRow }): ActivityDTO {
  return {
    id: a.id,
    type: a.type,
    message: a.message,
    meta: (a.meta as Record<string, unknown> | null) ?? null,
    createdAt: a.createdAt.toISOString(),
    user: toUserLite(a.user),
  };
}
