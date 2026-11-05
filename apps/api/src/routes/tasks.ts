import { Router } from "express";
import type { Prisma } from "@prisma/client";
import type { TaskDetailDTO } from "@gorev/shared";
import { OPEN_STATUSES, taskQuerySchema } from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/http";
import { currentUser } from "../lib/auth";
import { addNote, changeStatus, createTask, deleteTask, updateTask } from "../lib/taskService";
import { taskInclude, toActivityDTO, toTaskDTO, userLiteSelect } from "../lib/serialize";

export const tasksRouter = Router();

/** ?scope=mine (bana verilen) | given (başkasına verdiğim) | user&userId= (bir kişinin) · status=open|done|all */
tasksRouter.get("/", async (req, res) => {
  const me = currentUser(req);
  const q = taskQuerySchema.parse(req.query);
  const where: Prisma.TaskWhereInput = {};
  if (q.scope === "mine") where.assigneeId = me.id;
  if (q.scope === "given") Object.assign(where, { creatorId: me.id, NOT: { assigneeId: me.id } });
  if (q.scope === "user") {
    if (!q.userId) throw new HttpError(400, "Kişi seçilmedi");
    where.assigneeId = q.userId;
  }
  if (q.status === "open") where.status = { in: OPEN_STATUSES };
  if (q.status === "done") where.status = "DONE";

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
  });
  res.json({ tasks: tasks.map(toTaskDTO) });
});

tasksRouter.post("/", async (req, res) => {
  res.status(201).json({ task: await createTask(currentUser(req), req.body) });
});

tasksRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const task = await prisma.task.findUnique({
    where: /^\d+$/.test(id) ? { number: Number(id) } : { id },
    include: { ...taskInclude, activities: { orderBy: { createdAt: "asc" }, include: { user: { select: userLiteSelect } } } },
  });
  if (!task) throw notFound("Görev");
  const detail: TaskDetailDTO = { ...toTaskDTO(task), activities: task.activities.map(toActivityDTO) };
  res.json({ task: detail });
});

tasksRouter.patch("/:id", async (req, res) => {
  res.json({ task: await updateTask(currentUser(req), String(req.params.id), req.body) });
});

tasksRouter.post("/:id/status", async (req, res) => {
  res.json({ task: await changeStatus(currentUser(req), String(req.params.id), req.body) });
});

tasksRouter.post("/:id/notes", async (req, res) => {
  res.status(201).json({ task: await addNote(currentUser(req), String(req.params.id), req.body) });
});

tasksRouter.delete("/:id", async (req, res) => {
  await deleteTask(currentUser(req), String(req.params.id));
  res.json({ ok: true });
});
