import { z } from "zod";
import { PRIORITIES, ROLES, TASK_STATUSES } from "./constants";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı");

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);
export const roleSchema = z.enum(ROLES);

const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((tags) => Array.from(new Set(tags.map((t) => t.toLocaleLowerCase("tr-TR")))));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(300),
  description: z.string().max(20000).nullish(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().min(1).nullish(),
  dueDate: dateOnly.nullish(),
  tags: tagsSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  checklist: z.array(z.string().trim().min(1).max(300)).max(100).optional(),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(300).optional(),
  description: z.string().max(20000).nullish(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().min(1).nullish(),
  dueDate: dateOnly.nullish(),
  tags: tagsSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  /** Değişiklikle birlikte zaman akışına düşecek açıklama */
  note: z.string().trim().max(5000).optional(),
});
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const commentSchema = z.object({
  message: z.string().trim().min(1, "Not boş olamaz").max(5000),
  status: taskStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
});
export type CommentInput = z.input<typeof commentSchema>;

export const checklistCreateSchema = z.object({
  text: z.string().trim().min(1).max(300),
});
export const checklistUpdateSchema = z.object({
  text: z.string().trim().min(1).max(300).optional(),
  done: z.boolean().optional(),
});

export const taskQuerySchema = z.object({
  scope: z.enum(["mine", "delegated", "created", "all"]).default("all"),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : undefined))
    .pipe(z.array(taskStatusSchema).optional()),
  assigneeId: z.string().optional(),
  priority: prioritySchema.optional(),
  tag: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  due: z.enum(["overdue", "today", "week", "none"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(300),
});
export type TaskQuery = z.input<typeof taskQuerySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

const password = z.string().min(6, "Şifre en az 6 karakter olmalı").max(200);

export const setupSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  password,
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  password,
  role: roleSchema.default("MEMBER"),
  title: z.string().trim().max(80).nullish(),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
  password: password.optional(),
  title: z.string().trim().max(80).nullish(),
});
export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
  newPassword: password,
});
