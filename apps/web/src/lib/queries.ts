"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  ActivityDTO,
  ChecklistItemDTO,
  CommentInput,
  CreateTaskInput,
  CreateUserInput,
  DashboardDTO,
  TaskDTO,
  TaskDetailDTO,
  UpdateTaskInput,
  UpdateUserInput,
  UserLite,
  UserWithStats,
} from "@gorev/shared";
import { api } from "./api";

export type TaskScope = "mine" | "delegated" | "created" | "all";

export interface TaskFilters {
  scope?: TaskScope;
  status?: string; // virgülle ayrılmış
  assigneeId?: string;
  priority?: string;
  tag?: string;
  q?: string;
  due?: string;
}

const LIVE = 20_000;

export function filtersToQuery(f: TaskFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---------- Okuma ----------

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: UserLite }>("/auth/me").then((r) => r.user),
    retry: false,
    staleTime: 60_000,
  });

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ users: UserWithStats[] }>("/users").then((r) => r.users),
    staleTime: 30_000,
    refetchInterval: LIVE * 3,
  });

export const useTasks = (filters: TaskFilters, enabled = true) =>
  useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api.get<{ tasks: TaskDTO[] }>(`/tasks${filtersToQuery(filters)}`).then((r) => r.tasks),
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

export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardDTO>("/dashboard"),
    refetchInterval: LIVE,
  });

export const useActivityFeed = (limit = 30) =>
  useQuery({
    queryKey: ["activity", limit],
    queryFn: () => api.get<{ activities: ActivityDTO[] }>(`/activity?limit=${limit}`).then((r) => r.activities),
    refetchInterval: LIVE,
  });

export const useTags = () =>
  useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<{ tags: { tag: string; count: number }[] }>("/tasks/tags").then((r) => r.tags),
    staleTime: 60_000,
  });

// ---------- Yazma ----------

const TASK_KEYS = new Set(["tasks", "task", "dashboard", "activity", "users", "tags"]);
export const invalidateTaskData = (qc: QueryClient) =>
  qc.invalidateQueries({ predicate: (q) => TASK_KEYS.has(String(q.queryKey[0])) });

/** Listelerdeki görevi anında güncelle (iyimser) */
function patchTaskInLists(qc: QueryClient, id: string, patch: Partial<TaskDTO>) {
  qc.setQueriesData<TaskDTO[]>({ queryKey: ["tasks"] }, (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
  qc.setQueriesData<TaskDetailDTO>({ queryKey: ["task"] }, (old) =>
    old && old.id === id ? { ...old, ...patch } : old,
  );
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<{ task: TaskDTO }>("/tasks", input).then((r) => r.task),
    onSuccess: () => invalidateTaskData(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput & { id: string }) =>
      api.patch<{ task: TaskDTO }>(`/tasks/${id}`, input).then((r) => r.task),
    onMutate: async ({ id, ...input }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const patch: Partial<TaskDTO> = {};
      if (input.status) patch.status = input.status;
      if (input.status === "DONE" && input.progress === undefined) patch.progress = 100;
      if (input.priority) patch.priority = input.priority;
      if (input.progress !== undefined) patch.progress = input.progress;
      if (input.title) patch.title = input.title;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;
      if (input.tags) patch.tags = input.tags;
      patchTaskInLists(qc, id, patch);
    },
    onSettled: () => invalidateTaskData(qc),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CommentInput & { id: string }) =>
      api.post<{ task: TaskDTO }>(`/tasks/${id}/comments`, input).then((r) => r.task),
    onSettled: () => invalidateTaskData(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tasks/${id}`),
    onSuccess: () => invalidateTaskData(qc),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/activity/${id}`),
    onSuccess: () => invalidateTaskData(qc),
  });
}

export function useChecklist(taskId: string) {
  const qc = useQueryClient();
  const done = () => invalidateTaskData(qc);
  const add = useMutation({
    mutationFn: (text: string) =>
      api.post<{ item: ChecklistItemDTO }>(`/tasks/${taskId}/checklist`, { text }).then((r) => r.item),
    onSettled: done,
  });
  const update = useMutation({
    mutationFn: ({ itemId, ...input }: { itemId: string; text?: string; done?: boolean }) =>
      api.patch(`/tasks/${taskId}/checklist/${itemId}`, input),
    onMutate: ({ itemId, ...input }) => {
      qc.setQueriesData<TaskDetailDTO>({ queryKey: ["task"] }, (old) =>
        old && old.id === taskId
          ? { ...old, checklist: old.checklist.map((c) => (c.id === itemId ? { ...c, ...input } : c)) }
          : old,
      );
    },
    onSettled: done,
  });
  const remove = useMutation({
    mutationFn: (itemId: string) => api.del(`/tasks/${taskId}/checklist/${itemId}`),
    onSettled: done,
  });
  return { add, update, remove };
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<{ user: UserLite }>("/users", input).then((r) => r.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      api.patch<{ user: UserLite }>(`/users/${id}`, input).then((r) => r.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ result: "deleted" | "deactivated"; unassigned: number }>(`/users/${id}`),
    onSuccess: () => invalidateTaskData(qc),
  });
}
