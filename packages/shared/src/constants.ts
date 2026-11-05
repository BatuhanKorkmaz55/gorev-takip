export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ROLES = ["ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const STATUS_META: Record<TaskStatus, { label: string; short: string; tone: string }> = {
  TODO: { label: "Yapılacak", short: "Yapılacak", tone: "slate" },
  IN_PROGRESS: { label: "Devam ediyor", short: "Devam ediyor", tone: "blue" },
  BLOCKED: { label: "Beklemede", short: "Beklemede", tone: "amber" },
  DONE: { label: "Tamamlandı", short: "Tamamlandı", tone: "green" },
  CANCELLED: { label: "İptal", short: "İptal", tone: "zinc" },
};

/** Açık (henüz kapanmamış) durumlar */
export const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED"];
/** Panoda kolon olarak gösterilen durumlar */
export const BOARD_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export const PRIORITY_META: Record<Priority, { label: string; rank: number }> = {
  LOW: { label: "Düşük", rank: 0 },
  NORMAL: { label: "Normal", rank: 1 },
  HIGH: { label: "Yüksek", rank: 2 },
  URGENT: { label: "Acil", rank: 3 },
};

export const ROLE_META: Record<Role, { label: string }> = {
  ADMIN: { label: "Yönetici" },
  MEMBER: { label: "Üye" },
};

export const ACTIVITY_TYPES = [
  "CREATED",
  "COMMENT",
  "STATUS",
  "ASSIGNEE",
  "PRIORITY",
  "DUE_DATE",
  "PROGRESS",
  "TITLE",
  "DESCRIPTION",
  "TAGS",
  "CHECKLIST",
] as const;
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
