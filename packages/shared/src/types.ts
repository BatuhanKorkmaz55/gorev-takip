import type { ActivityType, Priority, Role, TaskStatus } from "./constants";

export interface UserLite {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  color: string;
  title: string | null;
}

export interface UserWithStats extends UserLite {
  createdAt: string;
  stats: { open: number; inProgress: number; blocked: number; done: number; overdue: number };
}

export interface ChecklistItemDTO {
  id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface TaskDTO {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  dueDate: string | null; // YYYY-MM-DD
  tags: string[];
  creator: UserLite;
  assignee: UserLite | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  checklistTotal: number;
  checklistDone: number;
  commentCount: number;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  message: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: UserLite;
  task?: { id: string; number: number; title: string; status: TaskStatus };
}

export interface TaskDetailDTO extends TaskDTO {
  checklist: ChecklistItemDTO[];
  activities: ActivityDTO[];
}

export interface DashboardDTO {
  today: string;
  counts: {
    myOpen: number;
    myInProgress: number;
    myOverdue: number;
    myDoneThisWeek: number;
    teamOpen: number;
    teamDoneThisWeek: number;
    assignedByMeOpen: number;
  };
}

export interface SessionUser extends UserLite {}
