"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  CreateTaskInput,
  CreateUserInput,
  StatusChangeInput,
  TaskDTO,
  TaskDetailDTO,
  TaskQuery,
  UpdateTaskInput,
  UserLite,
  UserWithStats,
} from "@gorev/shared";
import { api } from "./api";

const LIVE = 20_000;

const toQuery = (q: TaskQuery) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, String(v));
  return `?${p.toString()}`;
};

// ---------- Okuma ----------

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: UserLite }>("/auth/me").then((r) => r.user),
    retry: false,
    staleTime: 60_000,
  });

/** Ekipteki aktif kişiler ve açık görev sayıları */
export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ users: UserWithStats[] }>("/users").then((r) => r.users),
    staleTime: 30_000,
    refetchInterval: LIVE * 3,
  });

export const useTasks = (q: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: ["tasks", q],
    queryFn: () => api.get<{ tasks: TaskDTO[] }>(`/tasks${toQuery(q)}`).then((r) => r.tasks),
    refetchInterval: LIVE,
    placeholderData: (prev) => prev,
    enabled,
  });

export const useTask = (id: string | null) =>
  useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get<{ task: TaskDetailDTO }>(`/tasks/${id}`).then((r) => r.task),
    enabled: !!id,
    refetchInterval: LIVE,
  });

// ---------- Yazma ----------

const KEYS = new Set(["tasks", "task", "users"]);
const refresh = (qc: QueryClient) => qc.invalidateQueries({ predicate: (q) => KEYS.has(String(q.queryKey[0])) });

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<{ task: TaskDTO }>("/tasks", input).then((r) => r.task),
    onSuccess: () => refresh(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput & { id: string }) => api.patch<{ task: TaskDTO }>(`/tasks/${id}`, input).then((r) => r.task),
    onSuccess: () => refresh(qc),
  });
}

/** Başla / Tamamla / Geri al. Listeler anında güncellenir, sunucu cevabıyla doğrulanır. */
export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: StatusChangeInput & { id: string }) =>
      api.post<{ task: TaskDTO }>(`/tasks/${id}/status`, input).then((r) => r.task),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      qc.setQueriesData<TaskDTO[]>({ queryKey: ["tasks"] }, (old) => old?.map((t) => (t.id === id ? { ...t, status } : t)));
      qc.setQueriesData<TaskDetailDTO>({ queryKey: ["task"] }, (old) => (old && old.id === id ? { ...old, status } : old));
    },
    onSettled: () => refresh(qc),
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => api.post(`/tasks/${id}/notes`, { message }),
    onSuccess: () => refresh(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tasks/${id}`),
    onSuccess: () => refresh(qc),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<{ user: UserLite; reactivated?: boolean }>("/users", input),
    onSuccess: () => refresh(qc),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.patch(`/users/${id}`, { password }),
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: true; moved: number }>(`/users/${id}`),
    onSuccess: () => refresh(qc),
  });
}
