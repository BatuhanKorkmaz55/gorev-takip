import type { ActivityType, Role, TaskStatus } from "./constants";

export interface UserLite {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  color: string;
}

export interface UserWithStats extends UserLite {
  openCount: number;
}

export interface TaskDTO {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null; // YYYY-MM-DD
  creator: UserLite;
  assignee: UserLite;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  message: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: UserLite;
}

export interface TaskDetailDTO extends TaskDTO {
  activities: ActivityDTO[];
}
