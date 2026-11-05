import type { Prisma, User } from "@prisma/client";
import {
  PRIORITY_META,
  STATUS_META,
  type ActivityType,
  type CreateTaskInput,
  type UpdateTaskInput,
  createTaskSchema,
  updateTaskSchema,
} from "@gorev/shared";
import { prisma } from "./prisma";
import { HttpError, notFound } from "./http";
import { dateToKey, keyToDate } from "./dates";
import { taskListInclude, toTaskDTO } from "./serialize";

async function assertAssignable(assigneeId: string | null | undefined) {
  if (!assigneeId) return null;
  const u = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!u) throw new HttpError(400, "Atanacak kişi bulunamadı");
  if (!u.active) throw new HttpError(400, "Pasif bir kullanıcıya görev atanamaz");
  return u;
}

export async function createTask(actor: User, raw: CreateTaskInput) {
  const input = createTaskSchema.parse(raw);
  const assignee = await assertAssignable(input.assigneeId);
  const status = input.status ?? "TODO";

  const task = await prisma.$transaction(async (tx) => {
    const t = await tx.task.create({
      data: {
        title: input.title,
        description: input.description || null,
        status,
        priority: input.priority ?? "NORMAL",
        progress: status === "DONE" ? 100 : (input.progress ?? 0),
        dueDate: input.dueDate ? keyToDate(input.dueDate) : null,
        tags: input.tags ?? [],
        creatorId: actor.id,
        assigneeId: assignee?.id ?? null,
        completedAt: status === "DONE" ? new Date() : null,
        checklist: input.checklist?.length
          ? { create: input.checklist.map((text, i) => ({ text, position: i })) }
          : undefined,
      },
      include: taskListInclude,
    });
    await tx.activity.create({
      data: {
        taskId: t.id,
        userId: actor.id,
        type: "CREATED",
        meta: assignee ? { assigneeId: assignee.id, assigneeName: assignee.name } : undefined,
      },
    });
    return t;
  });
  return toTaskDTO(task);
}

type ActivityDraft = { type: ActivityType; meta?: Prisma.InputJsonValue; message?: string | null };

/**
 * Görevi günceller ve yapılan her değişikliği zaman akışına kaydeder.
 * `note` verilirse en önemli değişikliğe (tercihen durum değişikliğine) açıklama olarak eklenir;
 * hiçbir alan değişmemişse not tek başına yorum olarak düşer.
 */
export async function updateTask(actor: User, taskId: string, raw: UpdateTaskInput) {
  const input = updateTaskSchema.parse(raw);
  const current = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true },
  });
  if (!current) throw notFound("Görev");

  const data: Prisma.TaskUncheckedUpdateInput = {};
  const drafts: ActivityDraft[] = [];

  if (input.title !== undefined && input.title !== current.title) {
    data.title = input.title;
    drafts.push({ type: "TITLE", meta: { from: current.title, to: input.title } });
  }

  if (input.description !== undefined) {
    const next = input.description?.trim() ? input.description : null;
    if (next !== current.description) {
      data.description = next;
      drafts.push({ type: "DESCRIPTION" });
    }
  }

  if (input.status !== undefined && input.status !== current.status) {
    data.status = input.status;
    if (input.status === "DONE") {
      data.completedAt = new Date();
      if (input.progress === undefined) data.progress = 100;
    } else if (current.status === "DONE") {
      data.completedAt = null;
    }
    drafts.push({
      type: "STATUS",
      meta: {
        from: current.status,
        to: input.status,
        fromLabel: STATUS_META[current.status].label,
        toLabel: STATUS_META[input.status].label,
      },
    });
  }

  if (input.priority !== undefined && input.priority !== current.priority) {
    data.priority = input.priority;
    drafts.push({
      type: "PRIORITY",
      meta: {
        from: current.priority,
        to: input.priority,
        fromLabel: PRIORITY_META[current.priority].label,
        toLabel: PRIORITY_META[input.priority].label,
      },
    });
  }

  if (input.assigneeId !== undefined) {
    const nextId = input.assigneeId ?? null;
    if (nextId !== current.assigneeId) {
      const next = await assertAssignable(nextId);
      data.assigneeId = nextId;
      drafts.push({
        type: "ASSIGNEE",
        meta: {
          fromId: current.assigneeId,
          fromName: current.assignee?.name ?? null,
          toId: next?.id ?? null,
          toName: next?.name ?? null,
        },
      });
    }
  }

  if (input.dueDate !== undefined) {
    const prev = dateToKey(current.dueDate);
    const next = input.dueDate ?? null;
    if (next !== prev) {
      data.dueDate = next ? keyToDate(next) : null;
      drafts.push({ type: "DUE_DATE", meta: { from: prev, to: next } });
    }
  }

  if (input.progress !== undefined && input.progress !== current.progress) {
    data.progress = input.progress;
    drafts.push({ type: "PROGRESS", meta: { from: current.progress, to: input.progress } });
  }

  if (input.tags !== undefined) {
    const prev = [...current.tags].sort().join(",");
    const next = [...input.tags].sort().join(",");
    if (prev !== next) {
      data.tags = input.tags;
      drafts.push({ type: "TAGS", meta: { from: current.tags, to: input.tags } });
    }
  }

  const note = input.note?.trim() || null;
  if (note) {
    const target = drafts.find((d) => d.type === "STATUS") ?? drafts.find((d) => d.type === "PROGRESS") ?? drafts[0];
    if (target) target.message = note;
    else drafts.push({ type: "COMMENT", message: note });
  }

  if (!drafts.length) {
    const unchanged = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: taskListInclude });
    return toTaskDTO(unchanged);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = Object.keys(data).length
      ? await tx.task.update({ where: { id: taskId }, data, include: taskListInclude })
      : await tx.task.update({ where: { id: taskId }, data: { updatedAt: new Date() }, include: taskListInclude });
    await tx.activity.createMany({
      data: drafts.map((d) => ({
        taskId,
        userId: actor.id,
        type: d.type,
        message: d.message ?? null,
        meta: d.meta,
      })),
    });
    return t;
  });
  return toTaskDTO(updated);
}
