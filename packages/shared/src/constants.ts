export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_META: Record<TaskStatus, { label: string }> = {
  TODO: { label: "Yapılacak" },
  IN_PROGRESS: { label: "Devam ediyor" },
  DONE: { label: "Tamamlandı" },
};

/** Açık (bitmemiş) durumlar */
export const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

export const ROLES = ["ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_META: Record<Role, { label: string }> = {
  ADMIN: { label: "Yönetici" },
  MEMBER: { label: "Üye" },
};

export const ACTIVITY_TYPES = ["CREATED", "COMMENT", "STATUS", "ASSIGNEE", "DUE_DATE", "TITLE", "DESCRIPTION"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Beyaz baş harflerle en az 5.8:1 kontrast veren rozet renkleri */
export const AVATAR_COLORS = [
  "#3A5BA9",
  "#1F6F78",
  "#2E6B3F",
  "#9A3B2E",
  "#7A4E9E",
  "#8A5A00",
  "#A23B72",
  "#0E6A8A",
  "#5E6B1E",
  "#4B5563",
];
