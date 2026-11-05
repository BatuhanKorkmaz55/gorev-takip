import { Router } from "express";
import type { Prisma } from "@prisma/client";
import type { TaskDetailDTO } from "@gorev/shared";
import {
  OPEN_STATUSES,
  addDaysKey,
  checklistCreateSchema,
  checklistUpdateSchema,
  commentSchema,
  taskQuerySchema,
} from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { forbidden, notFound } from "../lib/http";
import { currentUser } from "../lib/auth";
import { keyToDate, todayKey } from "../lib/dates";
import { createTask, updateTask } from "../lib/taskService";
import {
  taskListInclude,
  toActivityDTO,
  toChecklistDTO,
  toTaskDTO,
  userLiteSelect,
} from "../lib/serialize";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res) => {
  const me = currentUser(req);
  const q = taskQuerySchema.parse(req.query);
  const today = todayKey();
  const and: Prisma.TaskWhereInput[] = [];

  if (q.scope === "mine") and.push({ assigneeId: me.id });
  if (q.scope === "created") and.push({ creatorId: me.id });
  if (q.scope === "delegated") {
    and.push({ creatorId: me.id, assigneeId: { not: null }, NOT: { assigneeId: me.id } });
  }
  if (q.status?.length) and.push({ status: { in: q.status } });
  if (q.assigneeId === "none") and.push({ assigneeId: null });
  else if (q.assigneeId) and.push({ assigneeId: q.assigneeId });
  if (q.priority) and.push({ priority: q.priority });
  if (q.tag) and.push({ tags: { has: q.tag.toLocaleLowerCase("tr-TR") } });
  if (q.due === "overdue") and.push({ dueDate: { lt: keyToDate(today) }, status: { in: OPEN_STATUSES } });
  if (q.due === "today") and.push({ dueDate: keyToDate(today) });
  if (q.due === "week") and.push({ dueDate: { gte: keyToDate(today), lte: keyToDate(addDaysKey(today, 7)) } });
  if (q.due === "none") and.push({ dueDate: null });
  if (q.q) {
    const num = Number(q.q.replace(/^#/, ""));
    and.push({
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { tags: { has: q.q.toLocaleLowerCase("tr-TR") } },
        ...(Number.isInteger(num) && num > 0 ? [{ number: num }] : []),
      ],
    });
  }

  const tasks = await prisma.task.findMany({
    where: { AND: and },
    include: taskListInclude,
    orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: q.limit,
  });
  res.json({ tasks: tasks.map(toTaskDTO) });
});

/** Kullanılan tüm etiketler (otomatik tamamlama için) */
tasksRouter.get("/tags", async (_req, res) => {
  const rows = await prisma.$queryRaw<{ tag: string; n: bigint }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS n FROM tasks GROUP BY tag ORDER BY n DESC LIMIT 100`;
  res.json({ tags: rows.map((r) => ({ tag: r.tag, count: Number(r.n) })) });
});

tasksRouter.post("/", async (req, res) => {
  const task = await createTask(currentUser(req), req.body);
  res.status(201).json({ task });
});

tasksRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const byNumber = /^\d+$/.test(id);
  const task = await prisma.task.findUnique({
    where: byNumber ? { number: Number(id) } : { id },
    include: {
      ...taskListInclude,
      checklist: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      activities: { orderBy: { createdAt: "asc" }, include: { user: { select: userLiteSelect } } },
    },
  });
  if (!task) throw notFound("Görev");
  const detail: TaskDetailDTO = {
    ...toTaskDTO(task),
    checklist: task.checklist.map(toChecklistDTO),
    activities: task.activities.map(toActivityDTO),
  };
  res.json({ task: detail });
});

tasksRouter.patch("/:id", async (req, res) => {
  const task = await updateTask(currentUser(req), String(req.params.id), req.body);
  res.json({ task });
});

/** Not / ilerleme güncellemesi: isteğe bağlı durum ve ilerleme değişikliğiyle birlikte */
tasksRouter.post("/:id/comments", async (req, res) => {
  const input = commentSchema.parse(req.body);
  const task = await updateTask(currentUser(req), String(req.params.id), {
    status: input.status,
    progress: input.progress,
    note: input.message,
  });
  res.status(201).json({ task });
});

tasksRouter.delete("/:id", async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw notFound("Görev");
  if (task.creatorId !== me.id && me.role !== "ADMIN") {
    throw forbidden("Görevi yalnızca oluşturan kişi veya yönetici silebilir");
  }
  await prisma.task.delete({ where: { id } });
  res.json({ ok: true });
});

// ---- Kontrol listesi (alt adımlar) ----

tasksRouter.post("/:id/checklist", async (req, res) => {
  const me = currentUser(req);
  const taskId = String(req.params.id);
  const { text } = checklistCreateSchema.parse(req.body);
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) throw notFound("Görev");
  const max = await prisma.checklistItem.aggregate({ where: { taskId }, _max: { position: true } });
  const [item] = await prisma.$transaction([
    prisma.checklistItem.create({ data: { taskId, text, position: (max._max.position ?? -1) + 1 } }),
    prisma.activity.create({ data: { taskId, userId: me.id, type: "CHECKLIST", meta: { action: "added", text } } }),
    prisma.task.update({ where: { id: taskId }, data: { updatedAt: new Date() } }),
  ]);
  res.status(201).json({ item: toChecklistDTO(item) });
});

tasksRouter.patch("/:id/checklist/:itemId", async (req, res) => {
  const me = currentUser(req);
  const taskId = String(req.params.id);
  const itemId = String(req.params.itemId);
  const input = checklistUpdateSchema.parse(req.body);
  const item = await prisma.checklistItem.findFirst({ where: { id: itemId, taskId } });
  if (!item) throw notFound("Adım");
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.checklistItem.update({ where: { id: itemId }, data: input }),
    prisma.task.update({ where: { id: taskId }, data: { updatedAt: new Date() } }),
  ];
  if (input.done !== undefined && input.done !== item.done) {
    ops.push(
      prisma.activity.create({
        data: {
          taskId,
          userId: me.id,
          type: "CHECKLIST",
          meta: { action: input.done ? "checked" : "unchecked", text: input.text ?? item.text },
        },
      }),
    );
  }
  const [updated] = await prisma.$transaction(ops);
  res.json({ item: toChecklistDTO(updated as typeof item) });
});

tasksRouter.delete("/:id/checklist/:itemId", async (req, res) => {
  const taskId = String(req.params.id);
  const itemId = String(req.params.itemId);
  const { count } = await prisma.checklistItem.deleteMany({ where: { id: itemId, taskId } });
  if (!count) throw notFound("Adım");
  res.json({ ok: true });
});
