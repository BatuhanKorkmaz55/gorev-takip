import { z } from "zod";
import { ROLES, TASK_STATUSES } from "./constants";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı");

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const roleSchema = z.enum(ROLES);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Ne yapılacağını yaz").max(300),
  assigneeId: z.string().min(1, "Görevi kime verdiğini seç"),
  dueDate: dateOnly.nullish(),
  description: z.string().max(20000).nullish(),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(300).optional(),
  assigneeId: z.string().min(1).optional(),
  dueDate: dateOnly.nullish(),
  description: z.string().max(20000).nullish(),
});
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const statusChangeSchema = z.object({
  status: taskStatusSchema,
  note: z.string().trim().max(5000).optional(),
});
export type StatusChangeInput = z.input<typeof statusChangeSchema>;

export const noteSchema = z.object({
  message: z.string().trim().min(1, "Not boş olamaz").max(5000),
});

export const taskQuerySchema = z.object({
  /** mine: bana verilen · given: benim başkasına verdiğim · user: bir kişinin görevleri */
  scope: z.enum(["mine", "given", "user"]).default("mine"),
  userId: z.string().optional(),
  status: z.enum(["open", "done", "all"]).default("all"),
});
export type TaskQuery = z.input<typeof taskQuerySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yaz"),
  password: z.string().min(1, "Şifreni yaz"),
});

const password = z.string().min(6, "Şifre en az 6 karakter olmalı").max(200);

export const setupSchema = z.object({
  name: z.string().trim().min(2, "Adın en az 2 harf olmalı").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yaz"),
  password,
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 harf olmalı").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yaz"),
  password,
  role: roleSchema.default("MEMBER"),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  password: password.optional(),
});
export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Şu anki şifreni yaz"),
  newPassword: password,
});
